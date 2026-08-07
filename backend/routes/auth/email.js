const express = require('express');
const router = express.Router();
const xss = require('xss');
const User = require('../../models/User');
const UserSession = require('../../models/UserSession');
const { markTokenUsed, isTokenUsed } = require('../../models/UsedToken');
const Follow = require('../../models/Follow');
const History = require('../../models/History');
const Notification = require('../../models/Notification');
const Favorite = require('../../models/Favorite');
const Rating = require('../../models/Rating');
const Report = require('../../models/Report');
const Feedback = require('../../models/Feedback');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createChallenge, sha } = require('altcha/lib');
const { protect, adminProtect, superAdminProtect, verifyRefreshToken } = require('../../middlewares/authFactory');
const { validatePassword } = require('../../middlewares/security');
const { logManual } = require('../../middlewares/auditLog');
const { sendPasswordResetEmail, sendVerificationCodeEmail, createTransporter, getFromName, getFromUser, getSiteUrl, buildEmailHTML, emailButton, emailInfoBox } = require('../../utils/email');
const { sendNotificationEmailToUser } = require('../../utils/notifyHelper');
const {
  parseUserAgent,
  hashToken,
  getClientIp,
  verifyTOTP,
  buildDeviceInfo,
  createUserSession,
  setAuthCookie,
  setAuthCookies,
  clearAuthCookies,
  createAccessToken,
  createRefreshToken,
  verifyJwt,
  timingSafeCompare,
  escapeHtml
} = require('../../utils/helpers');
const { encryptField, decryptField, encryptArray, decryptArray } = require('../../utils/crypto');
const { asyncHandler } = require('../../utils/errorHandler');
const { DEMO_EMAILS, skipVerification } = require('../../utils/authHelpers');
const { getCachedIpRegion } = require('../../utils/ipRegion');
const { ALTCHA_HMAC_KEY, DEV_API_TOKEN, verifyAltcha } = require('../../utils/altcha');
// 邮箱验证一次性验证码（内存存储，10分钟过期）
const emailVerifyCodes = require('../../utils/emailVerifyCodes');


// 超管强制修改邮箱（从默认 admin@furry09.com 改为自己的邮箱）
// 仅超管可用：普通用户改邮箱走 /request-email-change + /verify-email-change（含 altcha PoW + 新邮箱验证）
router.put('/change-email', superAdminProtect, async (req, res) => {
  const { newEmail, password } = req.body;
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    // 验证密码
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: '密码不正确' });
    }
    // 检查新邮箱是否已被占用
    const existing = await User.findOne({ email: newEmail.toLowerCase(), _id: { $ne: user._id } });
    if (existing) {
      return res.status(400).json({ message: '该邮箱已被其他账号使用' });
    }
    const oldEmail = user.email;
    user.email = newEmail.toLowerCase();
    user.isEmailVerified = false;
    await user.save();

    // 发送验证码邮件（取代旧的验证链接）
    try {
      const verifyCode = String(crypto.randomInt(100000, 1000000));
      emailVerifyCodes.set(verifyCode, {
        userId: user._id.toString(),
        email: user.email,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0
      });
      sendVerificationCodeEmail(user.email, verifyCode, 'changeEmail').catch(() => {});
    } catch (e) {
      console.error('验证码邮件发送失败:', e.message);
    }

    logManual({
      userId: user._id,
      userName: user.username || user.accountId,
      action: 'CHANGE_EMAIL',
      target: 'auth',
      details: `Email changed from ${oldEmail} to ${user.email}`,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });

    // 安全约束：邮箱变更必须失效该用户所有 session（防止旧邮箱持有者继续访问）
    await UserSession.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, logoutAt: new Date() }
    );
    clearAuthCookies(res);

    res.json({
      message: '邮箱修改成功，请查收验证邮件后重新登录',
      email: user.email,
      isEmailVerified: false,
      forceEmailChange: false,
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});


// 更新邮件通知偏好
router.put('/email-notification-prefs', protect, async (req, res) => {
  try {
    const allowedKeys = ['episodeUpdate', 'newDeviceLogin', 'feedbackReply', 'friendLinkStatus', 'friendLinkApply', 'announcement', 'reviewResult'];
    const prefs = {};
    for (const key of allowedKeys) {
      if (typeof req.body[key] === 'boolean') {
        prefs[key] = req.body[key];
      }
    }
    if (Object.keys(prefs).length === 0) {
      return res.status(400).json({ message: '没有可更新的偏好设置' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { ...Object.fromEntries(Object.entries(prefs).map(([k, v]) => [`emailNotificationPrefs.${k}`, v])) } },
      { new: true }
    ).select('emailNotificationPrefs');
    res.json({ message: '通知偏好已更新', emailNotificationPrefs: user.emailNotificationPrefs });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});


// 邮箱验证：使用 6 位验证码（取代旧的链接验证）
// 前端提交 { code, email? }，code 必填，email 可选用于二次校验
router.post('/verify-email', async (req, res) => {
  const { code, email } = req.body;
  try {
    if (!code) {
      return res.status(400).json({ message: '请输入验证码' });
    }
    const entry = emailVerifyCodes.get(String(code));
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) emailVerifyCodes.delete(String(code));
      return res.status(400).json({ message: '验证码无效或已过期，请重新获取' });
    }
    // 防暴力：单码尝试上限 5 次
    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.attempts > 5) {
      emailVerifyCodes.delete(String(code));
      return res.status(400).json({ message: '尝试次数过多，验证码已作废，请重新获取' });
    }
    // 可选的邮箱二次校验（前端登录/注册场景会带上 email）
    if (email && entry.email && entry.email.toLowerCase() !== String(email).trim().toLowerCase()) {
      return res.status(400).json({ message: '验证码与邮箱不匹配' });
    }
    const user = await User.findById(entry.userId);
    if (!user) {
      emailVerifyCodes.delete(String(code));
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.isEmailVerified) {
      emailVerifyCodes.delete(String(code));
      return res.json({ message: '邮箱已验证' });
    }
    // 校验邮箱一致性（防止用户改邮箱后用旧码）
    if (user.email.toLowerCase() !== entry.email.toLowerCase()) {
      emailVerifyCodes.delete(String(code));
      return res.status(400).json({ message: '验证码已失效，请重新获取' });
    }
    user.isEmailVerified = true;
    await user.save();
    // 一次性使用：验证成功后立即删除
    emailVerifyCodes.delete(String(code));
    res.json({ message: '邮箱验证成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});


// 重新发送邮箱验证码（需登录，用于已登录但邮箱未验证的场景）
router.post('/resend-verification', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: '邮箱已验证' });
    }
    // 生成 6 位验证码并存储（10 分钟有效）
    const verifyCode = String(crypto.randomInt(100000, 1000000));
    emailVerifyCodes.set(verifyCode, {
      userId: user._id.toString(),
      email: user.email,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });
    const sent = await sendVerificationCodeEmail(user.email, verifyCode, 'register');
    if (!sent) {
      return res.json({ message: '邮件服务未配置，请联系管理员' });
    }
    res.json({ message: '验证码已发送至您的邮箱' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});


// 通过邮箱地址重新发送验证码（无需登录，用于登录页邮箱未验证场景）
// 保留 altcha PoW 防滥用 + 模糊响应（不泄露邮箱是否已注册）
router.post('/resend-verification-by-email', async (req, res) => {
  const { email } = req.body;
  const altchaPayload = req.body.altcha;
  try {
    if (!email) {
      return res.status(400).json({ message: '请提供邮箱地址' });
    }
    if (!(await verifyAltcha(altchaPayload, req))) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: '如果该邮箱已注册且未验证，验证码已发送' });
    }
    if (user.isEmailVerified) {
      return res.json({ message: '如果该邮箱已注册且未验证，验证码已发送' });
    }
    // 生成 6 位验证码并存储（10 分钟有效）
    const verifyCode = String(crypto.randomInt(100000, 1000000));
    emailVerifyCodes.set(verifyCode, {
      userId: user._id.toString(),
      email: user.email,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    });
    sendVerificationCodeEmail(user.email, verifyCode, 'login').catch(() => {});
    res.json({ message: '如果该邮箱已注册且未验证，验证码已发送' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});


// 申请修改邮箱 - 验证密码后发送验证邮件到新邮箱
router.post('/request-email-change', protect, async (req, res) => {
  const { password } = req.body;
  const newEmail = xss(req.body.newEmail?.trim());
  const altchaPayload = req.body.altcha;
  try {
    if (!password || !newEmail) {
      return res.status(400).json({ message: '请填写密码和新邮箱' });
    }
    if (!(await verifyAltcha(altchaPayload, req))) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: '邮箱格式不正确' });
    }
    const user = await User.findById(req.user._id).select('+loginAttempts +lockUntil');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.isLocked) {
      return res.status(423).json({ message: '账号已被锁定，请30分钟后再试' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(400).json({ message: '密码不正确' });
    }
    await user.resetLoginAttempts();

    // 先检查新邮箱是否与当前邮箱相同（必须先于 findOne，否则会命中自身导致"已被使用"误报）
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      return res.status(400).json({ message: '新邮箱与当前邮箱相同' });
    }
    // 检查新邮箱是否已被其他账号使用（排除自身，防御纵深）
    const existingUser = await User.findOne({ email: newEmail.toLowerCase(), _id: { $ne: user._id } });
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已被其他账号使用' });
    }

    // 生成邮箱变更验证 token（1小时有效）
    const changeToken = jwt.sign(
      { id: user._id, newEmail: newEmail.toLowerCase(), type: 'email-change' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 发送验证邮件到新邮箱
    const transporter = await createTransporter();
    if (!transporter) {
      return res.status(503).json({ message: '邮件服务暂不可用，请稍后再试' });
    }

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email-change?token=${changeToken}`;
    const fromName = await getFromName();
    const fromUser = await getFromUser();

    await transporter.sendMail({
      from: `"${fromName}" <${fromUser}>`,
      to: newEmail,
      subject: '确认修改邮箱 - 兽剧聚合平台',
      html: await buildEmailHTML(fromName, getSiteUrl(), `
  <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;font-weight:700;">确认修改邮箱</h2>
  <p style="margin:0 0 16px;color:#475569;font-size:14px;">您正在将账号 <strong>${escapeHtml(user.username || user.accountId)}</strong> 的绑定邮箱修改为 <strong>${escapeHtml(newEmail)}</strong>。</p>
  <p style="margin:0 0 16px;color:#475569;font-size:14px;">请点击下方按钮确认修改（1小时内有效）：</p>
  <p style="margin:20px 0;">${emailButton('确认修改邮箱', verifyUrl, 'primary')}</p>
  ${emailInfoBox('如果您没有请求修改邮箱，请忽略此邮件，您的邮箱不会被更改。<br><br>此链接 1 小时后失效。如无法点击按钮，请复制以下地址到浏览器：<br><span style="color:#6366f1;word-break:break-all;">' + verifyUrl + '</span>', 'info')}
`, { preheader: '请确认邮箱修改' })
    });

    res.json({ message: '验证邮件已发送到新邮箱，请查收确认' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});


// 验证并完成邮箱修改
router.post('/verify-email-change', async (req, res) => {
  const { token } = req.body;
  try {
    if (!token) {
      return res.status(400).json({ message: '缺少验证令牌' });
    }
    const decoded = verifyJwt(token);
    if (decoded.type !== 'email-change') {
      return res.status(400).json({ message: '无效的验证令牌' });
    }
    const changeTokenHash = hashToken(token);
    if (await isTokenUsed(changeTokenHash)) {
      return res.status(400).json({ message: '该验证链接已使用，请重新申请' });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    // 再次检查新邮箱是否已被使用
    const existingUser = await User.findOne({ email: decoded.newEmail });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: '该邮箱已被其他账号使用' });
    }
    user.email = decoded.newEmail;
    user.isEmailVerified = true;
    await user.save();
    await markTokenUsed(changeTokenHash, 'email-change', 60 * 60 * 1000);

    // 邮箱变更后注销该用户所有其他会话，防止旧邮箱持有者劫持会话
    await UserSession.updateMany(
      { userId: user._id, isActive: true },
      { isActive: false, logoutAt: new Date() }
    );

    res.json({ message: '邮箱修改成功，请重新登录', email: user.email });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: '验证链接已过期，请重新申请' });
    }
    res.status(400).json({ message: '验证失败，请重新申请' });
  }
});

module.exports = router;
