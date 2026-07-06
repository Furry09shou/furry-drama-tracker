const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { superAdminProtect, adminProtect } = require('../middlewares/authFactory');
const { validatePassword } = require('../middlewares/security');
const { parseUserAgent, hashToken, getClientIp } = require('../utils/helpers');
const Episode = require('../models/Episode');
const Report = require('../models/Report');
const Feedback = require('../models/Feedback');
const FriendLink = require('../models/FriendLink');
const PushSubscription = require('../models/PushSubscription');
const Folder = require('../models/Folder');

// 管理员登录：使用 User 模型（仅允许 admin/superadmin 角色通过此后台登录入口）
router.post('/login', async (req, res) => {
  const { username, account, email, password, screenWidth, screenHeight, language, captchaId, captchaAnswer } = req.body;

  try {
    if (!global._captchaStore || !captchaId || !captchaAnswer) {
      return res.status(400).json({ message: '请输入验证码' });
    }
    const stored = global._captchaStore.get(captchaId);
    if (!stored) {
      return res.status(400).json({ message: '验证码无效或已过期' });
    }
    if (stored.expires < Date.now()) {
      global._captchaStore.delete(captchaId);
      return res.status(400).json({ message: '验证码已过期' });
    }
    if (String(stored.answer) !== String(captchaAnswer).trim().toLowerCase()) {
      global._captchaStore.delete(captchaId);
      return res.status(400).json({ message: '验证码错误' });
    }
    global._captchaStore.delete(captchaId);

    // 登录标识符：兼容 username / account / email 三种字段名
    const identifier = account || email || username;
    if (!identifier) {
      return res.status(400).json({ message: '请输入账号' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { accountId: identifier }]
    }).select('+loginAttempts +lockUntil +password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
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
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await user.resetLoginAttempts();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    const tokenHash = hashToken(token);
    const ua = req.headers['user-agent'] || '';
    const ip = getClientIp(req);
    const deviceInfo = parseUserAgent(ua);
    if (screenWidth) deviceInfo.screenWidth = screenWidth;
    if (screenHeight) deviceInfo.screenHeight = screenHeight;
    if (language) deviceInfo.language = language;
    deviceInfo.userAgent = ua;

    const session = new UserSession({
      userId: user._id,
      tokenHash,
      deviceInfo,
      ip
    });
    await session.save();

    // 更新最后登录信息
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await user.save();

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      _id: user._id,
      username: user.username,
      accountId: user.accountId,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
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
      Episode.countDocuments({ status: 'pending' }),
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
    const token = req.authToken;
    const tokenHash = hashToken(token);
    await UserSession.findOneAndUpdate({ tokenHash, isActive: true }, { isActive: false, logoutAt: new Date() });
    res.clearCookie('token', { path: '/' });
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
router.post('/register', superAdminProtect, async (req, res) => {
  const { username, email, password, role = 'admin', accountId } = req.body;

  try {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    if (!email) {
      return res.status(400).json({ message: '请输入邮箱' });
    }
    if (!['admin', 'superadmin', 'creator'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
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
      isEmailVerified: true
    });

    res.json({
      _id: user._id,
      username: user.username,
      accountId: user.accountId,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

router.delete('/:id', superAdminProtect, async (req, res) => {
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

router.get('/users', adminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
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

router.delete('/users/:id', superAdminProtect, async (req, res) => {
  try {
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
router.put('/role/:id', superAdminProtect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'creator', 'admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
    }
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: '不能修改自己的角色' });
    }
    if (role === 'superadmin') {
      return res.status(400).json({ message: '不能通过此接口设置超级管理员' });
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
router.put('/user-admin-access/:id', superAdminProtect, async (req, res) => {
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
