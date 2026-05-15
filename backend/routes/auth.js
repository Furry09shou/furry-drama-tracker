const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admin = require('../models/Admin');
const UserSession = require('../models/UserSession');
const Follow = require('../models/Follow');
const History = require('../models/History');
const Notification = require('../models/Notification');
const Favorite = require('../models/Favorite');
const Rating = require('../models/Rating');
const Report = require('../models/Report');
const Feedback = require('../models/Feedback');
const jwt = require('jsonwebtoken');
const https = require('https');
const { protect, adminProtect } = require('../middlewares/authFactory');
const { validatePassword } = require('../middlewares/security');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../utils/email');
const { parseUserAgent, hashToken, getClientIp } = require('../utils/helpers');

const getIpRegion = (ip) => {
  return new Promise((resolve) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      resolve('本地');
      return;
    }
    const url = `https://ipapi.co/${ip}/json/`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const parts = [];
          if (json.country_name) parts.push(json.country_name);
          if (json.region) parts.push(json.region);
          if (json.city) parts.push(json.city);
          resolve(parts.length > 0 ? parts.join(' · ') : '未知');
        } catch {
          resolve('未知');
        }
      });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve('未知');
    });
    req.on('error', () => {
      resolve('未知');
    });
  });
};

// 验证码存储（内存Map，5分钟过期，挂载到global以便其他路由共享）
if (!global._captchaStore) global._captchaStore = new Map();
const captchaStore = global._captchaStore;

// 生成图形验证码
router.get('/captcha', (req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  const captchaId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  captchaStore.set(captchaId, { answer: code.toLowerCase(), expires: Date.now() + 5 * 60 * 1000 });

  for (const [key, val] of captchaStore) {
    if (val.expires < Date.now()) captchaStore.delete(key);
  }

  const width = 120;
  const height = 40;
  const colors = ['#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22', '#1abc9c', '#f39c12'];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="#f0f0f0" rx="4"/>`;

  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[Math.floor(Math.random() * colors.length)]}" stroke-width="1" opacity="0.4"/>`;
  }

  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = Math.random() * 2 + 0.5;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${colors[Math.floor(Math.random() * colors.length)]}" opacity="0.3"/>`;
  }

  for (let i = 0; i < code.length; i++) {
    const x = 18 + i * 26;
    const y = 26 + (Math.random() * 8 - 4);
    const rotate = Math.random() * 30 - 15;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const fontSize = 22 + Math.floor(Math.random() * 6);
    svg += `<text x="${x}" y="${y}" fill="${color}" font-size="${fontSize}" font-weight="bold" font-family="Arial, sans-serif" transform="rotate(${rotate}, ${x}, ${y})">${code[i]}</text>`;
  }

  svg += '</svg>';

  res.json({ captchaId, svg });
});

// 验证验证码的辅助函数
const verifyCaptcha = (captchaId, captchaAnswer) => {
  if (!captchaId || !captchaAnswer) return false;
  const stored = captchaStore.get(captchaId);
  if (!stored) return false;
  if (stored.expires < Date.now()) {
    captchaStore.delete(captchaId);
    return false;
  }
  const isCorrect = String(stored.answer) === String(captchaAnswer).trim();
  captchaStore.delete(captchaId);
  return isCorrect;
};

router.get('/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }
    const existing = await User.findOne({ username });
    res.json({ available: !existing });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const { username, email, password, deviceInfo, captchaId, captchaAnswer } = req.body;
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);

  try {
    // 验证验证码
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: '邮箱格式不正确' });
    if (username.length < 2 || username.length > 20) return res.status(400).json({ message: '用户名长度需在2-20个字符之间' });
    if (!/^[\w\u4e00-\u9fa5]+$/.test(username)) return res.status(400).json({ message: '用户名只能包含字母、数字、下划线和中文' });

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.create({
      username,
      email,
      password,
      isEmailVerified: false,
      deviceInfo: {
        browser: deviceInfo?.browser || parsed.browser,
        browserVersion: deviceInfo?.browserVersion || parsed.browserVersion,
        os: deviceInfo?.os || parsed.os,
        osVersion: deviceInfo?.osVersion || parsed.osVersion,
        deviceType: deviceInfo?.deviceType || parsed.deviceType,
        deviceModel: deviceInfo?.deviceModel || parsed.deviceModel || '',
        screenWidth: deviceInfo?.screenWidth || 0,
        screenHeight: deviceInfo?.screenHeight || 0,
        language: deviceInfo?.language || req.headers['accept-language']?.split(',')[0] || '',
        userAgent: ua,
        carrier: deviceInfo?.carrier || ''
      },
      lastLoginAt: new Date(),
      lastLoginIp: getClientIp(req),
      lastLoginRegion: await getIpRegion(getClientIp(req))
    });

    const verifyToken = jwt.sign(
      { id: user._id, purpose: 'verify-email' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    sendVerificationEmail(email, verifyToken).catch(() => {});

    res.json({
      message: '注册成功，请验证邮箱后登录',
      email: user.email,
      needVerification: true
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: field === 'email' ? 'User already exists' : 'Username already taken' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, deviceInfo, captchaId, captchaAnswer } = req.body;
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);

  try {
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.deletionRequestedAt) {
      const deleteAt = new Date(user.deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() >= deleteAt) {
        await User.findByIdAndDelete(user._id);
        await Follow.deleteMany({ userId: user._id });
        await History.deleteMany({ userId: user._id });
        await Notification.deleteMany({ userId: user._id });
        await Favorite.deleteMany({ userId: user._id });
        await Rating.deleteMany({ userId: user._id });
        await Report.deleteMany({ userId: user._id });
        await Feedback.deleteMany({ userId: user._id });
        await UserSession.deleteMany({ userId: user._id });
        return res.status(400).json({ message: '该账号已被注销' });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      const verifyToken = jwt.sign(
        { id: user._id, purpose: 'verify-email' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      sendVerificationEmail(user.email, verifyToken).catch(() => {});
      return res.status(403).json({ message: '请先验证邮箱后再登录，验证邮件已重新发送至您的邮箱', needVerification: true, email: user.email });
    }

    const currentIp = getClientIp(req);
    const currentUa = ua;
    const knownSessions = await UserSession.find({ userId: user._id, isActive: true });
    const isKnownDevice = knownSessions.some(s => s.deviceInfo?.userAgent === currentUa);

    if (!isKnownDevice && knownSessions.length > 0) {
      const deviceVerifyToken = jwt.sign(
        { id: user._id, purpose: 'device-verify', ip: currentIp, ua: currentUa },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
      );
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: '新设备登录验证',
          html: `<div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;padding:20px">
            <h2 style="color:#333;text-align:center">新设备登录验证</h2>
            <p>检测到您的账号在新设备上尝试登录：</p>
            <div style="background:#f5f5f5;padding:12px;border-radius:8px;margin:12px 0">
              <p style="margin:4px 0"><strong>浏览器：</strong>${parsed.browser || '未知'}</p>
              <p style="margin:4px 0"><strong>操作系统：</strong>${parsed.os || '未知'}</p>
              <p style="margin:4px 0"><strong>IP地址：</strong>${currentIp}</p>
            </div>
            <p>如非本人操作，请忽略此邮件。如确认是本人，请点击下方按钮确认登录：</p>
            <div style="text-align:center;margin:20px 0">
              <a href="${process.env.SITE_URL || 'http://localhost:3000'}/verify-device?token=${deviceVerifyToken}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">确认登录</a>
            </div>
            <p style="color:#999;font-size:12px">此链接30分钟内有效</p>
          </div>`
        };
        const transporter = require('nodemailer').createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT || '465'),
          secure: parseInt(process.env.EMAIL_PORT || '465') === 465,
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.sendMail(mailOptions);
      } catch (e) {}
      return res.status(403).json({
        message: '检测到新设备登录，验证邮件已发送至您的邮箱，请确认后登录',
        needDeviceVerify: true,
        email: user.email
      });
    }

    user.deviceInfo = {
      browser: deviceInfo?.browser || parsed.browser,
      browserVersion: deviceInfo?.browserVersion || parsed.browserVersion,
      os: deviceInfo?.os || parsed.os,
      osVersion: deviceInfo?.osVersion || parsed.osVersion,
      deviceType: deviceInfo?.deviceType || parsed.deviceType,
      deviceModel: deviceInfo?.deviceModel || parsed.deviceModel || '',
      screenWidth: deviceInfo?.screenWidth || 0,
      screenHeight: deviceInfo?.screenHeight || 0,
      language: deviceInfo?.language || req.headers['accept-language']?.split(',')[0] || '',
      userAgent: ua,
      carrier: deviceInfo?.carrier || ''
    };
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    user.lastLoginRegion = await getIpRegion(getClientIp(req));
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    const tokenHash = hashToken(token);
    const ip = getClientIp(req);
    const sessionDeviceInfo = parseUserAgent(ua);
    if (deviceInfo?.screenWidth) sessionDeviceInfo.screenWidth = deviceInfo.screenWidth;
    if (deviceInfo?.screenHeight) sessionDeviceInfo.screenHeight = deviceInfo.screenHeight;
    if (deviceInfo?.language) sessionDeviceInfo.language = deviceInfo.language;
    sessionDeviceInfo.userAgent = ua;

    const session = new UserSession({
      userId: user._id,
      tokenHash,
      deviceInfo: sessionDeviceInfo,
      ip
    });
    await session.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      adminAccess: user.adminAccess || false,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-device', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'device-verify') return res.status(400).json({ message: 'Invalid token' });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).json({ message: 'User not found' });
    const loginToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const tokenHash = hashToken(loginToken);
    const ip = decoded.ip || '';
    const sessionDeviceInfo = parseUserAgent(decoded.ua || '');
    sessionDeviceInfo.userAgent = decoded.ua || '';
    const session = new UserSession({ userId: user._id, tokenHash, deviceInfo: sessionDeviceInfo, ip });
    await session.save();
    res.json({
      _id: user._id, username: user.username, email: user.email,
      isEmailVerified: user.isEmailVerified, adminAccess: user.adminAccess || false,
      token: loginToken
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(400).json({ message: '验证链接已过期，请重新登录' });
    res.status(400).json({ message: '验证失败' });
  }
});

router.post('/logout', protect, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const tokenHash = hashToken(token);
    await UserSession.findOneAndUpdate({ tokenHash, isActive: true }, { isActive: false, logoutAt: new Date() });
    res.json({ message: '退出成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      adminAccess: user.adminAccess || false,
      avatar: user.avatar || ''
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: '当前密码不正确' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/change-password', adminProtect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: '当前密码不正确' });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email, captchaId, captchaAnswer } = req.body;
  try {
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: '如果该邮箱已注册，重置链接已发送至邮箱' });
    }
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset-password' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: '如果该邮箱已注册，重置链接已发送至邮箱' });
  } catch (error) {
    res.json({ message: '如果该邮箱已注册，重置链接已发送至邮箱' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'reset-password') {
      return res.status(400).json({ message: '无效的重置令牌' });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.passwordChangedAt && new Date(user.passwordChangedAt).getTime() > decoded.iat * 1000) {
      return res.status(400).json({ message: '该重置链接已使用，请重新获取' });
    }
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    res.json({ message: '密码重置成功' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: '重置链接已过期，请重新获取' });
    }
    res.status(400).json({ message: '无效的重置令牌' });
  }
});

router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'verify-email') {
      return res.status(400).json({ message: '无效的验证令牌' });
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
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/resend-verification-by-email', async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return res.status(400).json({ message: '请提供邮箱地址' });
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
    const sent = await sendVerificationEmail(user.email, verifyToken);
    if (!sent) {
      return res.json({ message: '邮件服务未配置，请联系管理员' });
    }
    res.json({ message: '验证邮件已发送至您的邮箱' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/request-deletion', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.deletionRequestedAt) {
      return res.status(400).json({ message: '已提交过注销申请' });
    }
    user.deletionRequestedAt = new Date();
    await user.save();
    const deleteAt = new Date(user.deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    res.json({
      message: '注销申请已提交',
      deletionRequestedAt: user.deletionRequestedAt,
      deleteAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/cancel-deletion', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (!user.deletionRequestedAt) {
      return res.status(400).json({ message: '没有注销申请' });
    }
    user.deletionRequestedAt = null;
    await user.save();
    res.json({ message: '注销申请已取消' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/deletion-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (!user.deletionRequestedAt) {
      return res.json({ requested: false });
    }
    const deleteAt = new Date(user.deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    res.json({
      requested: true,
      deletionRequestedAt: user.deletionRequestedAt,
      deleteAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
