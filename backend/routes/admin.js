const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const CreatorProfile = require('../models/CreatorProfile');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { createChallenge, verifySolution, sha } = require('altcha/lib');
const { superAdminProtect, adminProtect, requireEmailChanged } = require('../middlewares/authFactory');
const { validatePassword } = require('../middlewares/security');
const { parseUserAgent, hashToken, getClientIp, setAuthCookies, clearAuthCookies, createAccessToken, createRefreshToken, escapeHtml } = require('../utils/helpers');
const { createTransporter, getFromName, getFromUser, getSiteUrl, buildEmailHTML, emailButton, emailInfoBox } = require('../utils/email');
const Episode = require('../models/Episode');
const Report = require('../models/Report');
const Feedback = require('../models/Feedback');
const FriendLink = require('../models/FriendLink');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const Folder = require('../models/Folder');
const { sendPushToUser } = require('./notifications');

// 测试环境跳过验证的邮箱列表（仅非生产环境生效）
const DEMO_EMAILS = (process.env.NODE_ENV !== 'production' && process.env.DEMO_EMAILS ? process.env.DEMO_EMAILS : '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || (process.env.JWT_SECRET ? crypto.createHash('sha256').update('altcha-' + process.env.JWT_SECRET).digest('hex') : crypto.randomBytes(32).toString('hex'));

const DEV_API_TOKEN = process.env.DEV_API_TOKEN;

const verifyAdminAltcha = async (payload, req) => {
  // 开发环境口令绕过
  if (DEV_API_TOKEN && req?.headers?.['x-dev-token'] === DEV_API_TOKEN) {
    return true;
  }
  if (!payload) return false;
  try {
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    const { challenge, solution } = json;
    if (!challenge || !solution) return false;
    const result = await verifySolution({
      challenge,
      solution,
      hmacSignatureSecret: ALTCHA_HMAC_KEY,
      deriveKey: sha.deriveKey,
    });
    return result.verified === true;
  } catch {
    return false;
  }
};

// 管理员登录：使用 User 模型（仅允许 admin/superadmin 角色通过此后台登录入口）
router.post('/login', async (req, res) => {
  const { username, account, email, password, screenWidth, screenHeight, language } = req.body;

  try {
    if (!(await verifyAdminAltcha(req.body.altcha, req))) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    // 登录标识符：兼容 username / account / email 三种字段名
    const identifier = account || email || username;
    if (!identifier) {
      return res.status(400).json({ message: '请输入账号' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { accountId: identifier }]
    }).select('+loginAttempts +lockUntil +password');
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: '无管理后台权限' });
    }

    if (user.isLocked) {
      return res.status(423).json({ message: '账号已被锁定，请30分钟后再试' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    await user.resetLoginAttempts();

    // 邮箱验证检查（测试环境 DEMO_EMAILS 跳过）
    if (!user.isEmailVerified && !DEMO_EMAILS.includes(user.email.toLowerCase())) {
      return res.status(403).json({ message: '请先验证邮箱后再登录管理后台' });
    }

    const accessToken = createAccessToken(user._id);
    const { token: refreshToken } = createRefreshToken(user._id);
    const refreshTokenHash = hashToken(refreshToken);

    const ua = req.headers['user-agent'] || '';
    const ip = getClientIp(req);
    const deviceInfo = parseUserAgent(ua);
    if (screenWidth) deviceInfo.screenWidth = screenWidth;
    if (screenHeight) deviceInfo.screenHeight = screenHeight;
    if (language) deviceInfo.language = language;
    deviceInfo.userAgent = ua;

    const session = new UserSession({
      userId: user._id,
      refreshTokenHash,
      deviceInfo,
      ip
    });
    await session.save();

    // 更新最后登录信息
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      _id: user._id,
      username: user.username,
      accountId: user.accountId,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      forceEmailChange: user.role === 'superadmin' && user.email === 'admin@furry09.com',
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/verify', adminProtect, async (req, res) => {
  const u = req.user;
  res.json({ valid: true, admin: { _id: u._id, username: u.username, accountId: u.accountId, email: u.email, role: u.role, avatar: u.avatar } });
});

router.get('/pending-counts', adminProtect, async (req, res) => {
  try {
    const [episodes, reports, feedbacks, friendLinks] = await Promise.all([
      Episode.countDocuments({ reviewStatus: 'pending' }),
      Report.countDocuments({ status: 'pending' }),
      Feedback.countDocuments({ status: 'pending' }),
      FriendLink.countDocuments({ status: 'pending' })
    ]);
    res.json({ episodes, reports, feedbacks, friendLinks });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/logout', adminProtect, async (req, res) => {
  try {
    // 双 Token 登出：通过 refresh token cookie 标记 session 失效
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const refreshTokenHash = hashToken(refreshToken);
      await UserSession.findOneAndUpdate(
        { refreshTokenHash, isActive: true },
        { isActive: false, logoutAt: new Date() }
      );
    }
    // 兼容旧 session：通过 access token 的 hash 也要尝试标记
    const accessToken = req.authToken;
    if (accessToken) {
      const tokenHash = hashToken(accessToken);
      await UserSession.findOneAndUpdate(
        { tokenHash, isActive: true },
        { isActive: false, logoutAt: new Date() }
      ).catch(() => {});
    }
    clearAuthCookies(res);
    res.json({ message: '退出成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 列出具有管理/创作者权限的账户
router.get('/list', superAdminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const query = { role: { $in: ['admin', 'superadmin', 'creator'] } };
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const admins = await User.find(query).select('-password').sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum).limit(limitNum);
    res.json({ list: admins, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创建具有管理/创作者权限的账户
router.post('/register', superAdminProtect, requireEmailChanged, async (req, res) => {
  const { username, email, password, role = 'admin', accountId } = req.body;

  try {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    if (!email) {
      return res.status(400).json({ message: '请输入邮箱' });
    }
    if (!['admin', 'creator'].includes(role)) {
      return res.status(400).json({ message: '无效的角色，仅可创建 admin 或 creator' });
    }
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: '该邮箱已注册' });
    }
    // 自动生成 accountId
    let finalAccountId = accountId;
    if (!finalAccountId) {
      const baseId = (username || email).replace(/[^\w]/g, '_').toLowerCase();
      finalAccountId = baseId;
      let counter = 1;
      while (await User.findOne({ accountId: finalAccountId })) {
        finalAccountId = `${baseId}_${counter}`;
        counter++;
      }
    } else {
      const idExists = await User.findOne({ accountId: finalAccountId });
      if (idExists) {
        return res.status(400).json({ message: '该账号ID已存在' });
      }
    }

    const user = await User.create({
      accountId: finalAccountId,
      username: username || finalAccountId,
      email,
      password,
      role,
      // 管理后台创建的账号直接标记为已验证，无需邮箱验证
      isEmailVerified: true
    });

    // 发送"账号已创建"通知邮件（非验证链接邮件）
    try {
      const siteUrl = getSiteUrl();
      const fromName = await getFromName();
      const roleLabel = role === 'admin' ? '管理员' : '创作者';
      const mailOptions = {
        from: `"${fromName}" <${await getFromUser()}>`,
        to: email,
        subject: '您的账号已创建',
        html: await buildEmailHTML(fromName, siteUrl, `
          <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">账号创建通知</h2>
          <p style="margin:0 0 16px;color:#475569;font-size:14px;">管理员已为您创建了账号，您可以使用以下信息登录：</p>
          ${emailInfoBox(
            '<p style="margin:4px 0;"><strong>账号ID：</strong>' + escapeHtml(finalAccountId) + '</p>' +
            '<p style="margin:4px 0;"><strong>邮箱：</strong>' + escapeHtml(email) + '</p>' +
            '<p style="margin:4px 0;"><strong>角色：</strong>' + escapeHtml(roleLabel) + '</p>',
            'info'
          )}
          <p style="margin:16px 0;color:#475569;font-size:14px;">请使用管理员告知的密码登录。登录后请尽快在个人设置中修改密码。</p>
          <p style="margin:20px 0;">${emailButton('前往登录', siteUrl + '/login', 'primary')}</p>
          <p style="margin:0;color:#94a3b8;font-size:12px;">如果您没有预期收到此邮件，请忽略。</p>
        `)
      };
      const transporter = await createTransporter();
      if (transporter) {
        transporter.sendMail(mailOptions).catch(() => {});
      }
    } catch (e) {}

    res.json({
      _id: user._id,
      username: user.username,
      accountId: user.accountId,
      email: user.email,
      role: user.role,
      message: '账号创建成功，通知邮件已发送至用户邮箱'
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.delete('/:id', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: '账户不存在' });
    }
    if (!['admin', 'superadmin', 'creator'].includes(target.role)) {
      return res.status(400).json({ message: '该账户不是管理/创作者账户' });
    }
    if (target.role === 'superadmin') {
      const superAdminCount = await User.countDocuments({ role: 'superadmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: '不能删除最后一个超级管理员' });
      }
    }
    await User.findByIdAndDelete(req.params.id);
    await UserSession.deleteMany({ userId: req.params.id });
    res.json({ message: '账户已删除' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/users', superAdminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 200);
    const query = {};
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { accountId: { $regex: escapedSearch, $options: 'i' } },
        { username: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const list = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({ list, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.delete('/users/:id', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    // 不能删除自己
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.role === 'superadmin') {
      const superAdminCount = await User.countDocuments({ role: 'superadmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: '不能删除最后一个超级管理员' });
      }
    }
    await User.findByIdAndDelete(req.params.id);
    const Follow = require('../models/Follow');
    const History = require('../models/History');
    const Notification = require('../models/Notification');
    const Favorite = require('../models/Favorite');
    const Rating = require('../models/Rating');
    const UserSession = require('../models/UserSession');
    await Follow.deleteMany({ userId: req.params.id });
    await History.deleteMany({ userId: req.params.id });
    await Notification.deleteMany({ userId: req.params.id });
    await Favorite.deleteMany({ userId: req.params.id });
    await Report.deleteMany({ reporter: req.params.id });
    await Feedback.deleteMany({ userId: req.params.id });
    await UserSession.deleteMany({ userId: req.params.id });
    await PushSubscription.deleteMany({ userId: req.params.id });
    await Folder.deleteMany({ userId: req.params.id });
    const userRatings = await Rating.find({ userId: req.params.id });
    await Rating.deleteMany({ userId: req.params.id });
    const affectedEpisodeIds = [...new Set(userRatings.map(r => r.episodeId.toString()))];
    if (affectedEpisodeIds.length > 0) {
      const stats = await Rating.aggregate([
        { $match: { episodeId: { $in: affectedEpisodeIds.map(id => mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: '$episodeId', avg: { $avg: '$score' }, count: { $sum: 1 } } }
      ]);
      const statsMap = {};
      stats.forEach(s => { statsMap[s._id.toString()] = s; });
      const bulkOps = affectedEpisodeIds.map(epId => {
        const stat = statsMap[epId];
        return {
          updateOne: {
            filter: { _id: epId },
            update: {
              averageRating: stat ? Math.round(stat.avg * 10) / 10 : 0,
              ratingCount: stat ? stat.count : 0
            }
          }
        };
      });
      await Episode.bulkWrite(bulkOps);
    }
    res.json({ message: '用户已删除' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 修改账户角色
router.put('/role/:id', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'creator', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
    }
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: '不能修改自己的角色' });
    }
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: '账户不存在' });
    }
    if (target.role === 'superadmin') {
      const superAdminCount = await User.countDocuments({ role: 'superadmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: '不能降级最后一个超级管理员' });
      }
    }
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/creators', adminProtect, async (req, res) => {
  try {
    const creators = await User.find({ role: 'creator' }).select('-password');
    res.json(creators);
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// ===== 超管管理创作者主页 =====
router.get('/creator-profiles', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    const profiles = await CreatorProfile.find().populate('creatorId', 'accountId username email').sort({ updatedAt: -1 });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/creator-profiles/:id', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    const profile = await CreatorProfile.findById(req.params.id).populate('creatorId', 'accountId username email');
    if (!profile) return res.status(404).json({ message: '创作者主页不存在' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.put('/creator-profiles/:id', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    const updateData = {
      displayName: req.body.displayName,
      avatar: req.body.avatar,
      bio: req.body.bio && req.body.bio.length > 500 ? req.body.bio.slice(0, 500) : req.body.bio,
      socialLinks: req.body.socialLinks || {},
      // 超管直接编辑视为终态：清空待审核改动并标记为已通过
      pendingChanges: { displayName: '', avatar: '', bio: '', socialLinks: {} },
      reviewStatus: 'approved',
      reviewNote: '',
      updatedAt: Date.now()
    };
    const profile = await CreatorProfile.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ message: '创作者主页不存在' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 超管审核创作者主页修改：通过 → 将 pendingChanges 应用到正式字段
router.put('/creator-profiles/:id/approve', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    const profile = await CreatorProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: '创作者主页不存在' });
    const pc = profile.pendingChanges || {};
    if (pc.displayName) profile.displayName = pc.displayName;
    if (pc.avatar !== undefined) profile.avatar = pc.avatar;
    if (pc.bio !== undefined) profile.bio = pc.bio;
    if (pc.socialLinks) profile.socialLinks = pc.socialLinks;
    profile.pendingChanges = { displayName: '', avatar: '', bio: '', socialLinks: {} };
    profile.reviewStatus = 'approved';
    profile.reviewNote = '';
    profile.updatedAt = Date.now();
    await profile.save();

    // 通知创作者主页修改已通过
    notifyProfileReviewResult(profile, 'approved', '');
    res.json(profile);
  } catch (error) {
    console.error('Approve creator profile error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 超管审核创作者主页修改：拒绝 → 保留 pendingChanges 供创作者修改重提，正式字段不变
router.put('/creator-profiles/:id/reject', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    const profile = await CreatorProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ message: '创作者主页不存在' });
    const note = (req.body.note || '').slice(0, 500);
    profile.reviewStatus = 'rejected';
    profile.reviewNote = note;
    profile.updatedAt = Date.now();
    await profile.save();

    // 通知创作者主页修改未通过
    notifyProfileReviewResult(profile, 'rejected', note);
    res.json(profile);
  } catch (error) {
    console.error('Reject creator profile error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 创作者主页审核结果通知：站内通知 + Web Push
function notifyProfileReviewResult(profile, status, note) {
  const creatorId = profile.creatorId;
  if (!creatorId) return;
  const isApproved = status === 'approved';
  const message = isApproved
    ? '您的创作者主页修改已通过审核'
    : `您的创作者主页修改未通过审核${note ? `：${note}` : ''}`;
  Notification.create({
    userId: creatorId,
    type: 'profile_review',
    message,
    link: '/admin/creator-profile',
    metadata: { status, note }
  }).catch(() => {});
  sendPushToUser(String(creatorId), {
    title: `创作者主页修改${isApproved ? '已通过' : '未通过'}审核`,
    body: message,
    icon: '/vite.svg',
    data: { url: '/admin/creator-profile' }
  }).catch(() => {});
}

router.post('/verify-password', adminProtect, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: '请输入密码' });
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: '未找到' });
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: '密码错误' });
    res.json({ verified: true });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 切换账户的管理权限（user <-> admin），供前端兼容调用
router.put('/user-admin-access/:id', superAdminProtect, requireEmailChanged, async (req, res) => {
  try {
    const { adminAccess } = req.body;
    if (typeof adminAccess !== 'boolean') {
      return res.status(400).json({ message: '参数错误' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (['superadmin', 'creator'].includes(user.role)) {
      return res.status(400).json({ message: '不能修改超级管理员或创作者的权限' });
    }
    user.role = adminAccess ? 'admin' : 'user';
    await user.save();
    res.json({ message: adminAccess ? '已授予管理后台权限' : '已撤销管理后台权限', adminAccess, role: user.role });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
