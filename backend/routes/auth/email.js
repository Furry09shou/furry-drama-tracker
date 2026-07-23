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
const { sendPasswordResetEmail, sendVerificationEmail, createTransporter, getFromName, getFromUser } = require('../../utils/email');
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

    // 发送验证邮件
    const verifyToken = jwt.sign({ id: user._id, purpose: 'verify-email' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    try {
      sendVerificationEmail(user.email, verifyToken).catch(() => {});
    } catch (e) {
      console.error('验证邮件发送失败:', e.message);
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
    const allowedKeys = ['episodeUpdate', 'newDeviceLogin', 'feedbackReply', 'friendLinkStatus', 'friendLinkApply'];
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


router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = verifyJwt(token);
    if (decoded.purpose !== 'verify-email') {
      return res.status(400).json({ message: '无效的验证令牌' });
    }
    // 一次性使用：基于令牌哈希防止重放
    const tokenHash = hashToken(token);
    if (await isTokenUsed(tokenHash)) {
      return res.status(400).json({ message: '该验证链接已被使用，请勿重复使用' });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.isEmailVerified) {
      return res.json({ message: '邮箱已验证' });
    }
    user.isEmailVerified = true;
    await user.save();
    await markTokenUsed(tokenHash, 'verify-email', 25 * 60 * 60 * 1000);
    res.json({ message: '邮箱验证成功' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: '验证链接已过期，请重新获取' });
    }
    res.status(400).json({ message: '无效的验证令牌' });
  }
});


router.post('/resend-verification', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: '邮箱已验证' });
    }
    const verifyToken = jwt.sign(
      { id: user._id, purpose: 'verify-email' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    const sent = await sendVerificationEmail(user.email, verifyToken);
    if (!sent) {
      return res.json({ message: '邮件服务未配置，请联系管理员' });
    }
    res.json({ message: '验证邮件已发送' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});


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
      return res.json({ message: '如果该邮箱已注册且未验证，验证邮件已发送' });
    }
    if (user.isEmailVerified) {
      return res.json({ message: '如果该邮箱已注册且未验证，验证邮件已发送' });
    }
    const verifyToken = jwt.sign(
      { id: user._id, purpose: 'verify-email' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    sendVerificationEmail(user.email, verifyToken).catch(() => {});
    res.json({ message: '如果该邮箱已注册且未验证，验证邮件已发送' });
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
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
          <h2 style="color:#6366f1;">确认修改邮箱</h2>
          <p>您正在将账号 <strong>${escapeHtml(user.username || user.accountId)}</strong> 的绑定邮箱修改为 <strong>${escapeHtml(newEmail)}</strong>。</p>
          <p>请点击以下链接确认修改（1小时内有效）：</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#10b981);color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">确认修改邮箱</a>
          <p style="color:#94a3b8;font-size:13px;">如果您没有请求修改邮箱，请忽略此邮件，您的邮箱不会被更改。</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
          <p style="color:#94a3b8;font-size:12px;">此链接1小时后失效。如无法点击，请复制以下地址到浏览器：${verifyUrl}</p>
        </div>
      `
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
