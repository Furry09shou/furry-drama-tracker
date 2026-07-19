const express = require('express');
const router = express.Router();
const xss = require('xss');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const Follow = require('../models/Follow');
const History = require('../models/History');
const Notification = require('../models/Notification');
const Favorite = require('../models/Favorite');
const Rating = require('../models/Rating');
const Report = require('../models/Report');
const Feedback = require('../models/Feedback');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const https = require('https');
const crypto = require('crypto');
const { createChallenge, verifySolution, sha } = require('altcha/lib');
const { protect, adminProtect } = require('../middlewares/authFactory');
const { validatePassword } = require('../middlewares/security');
const { logManual } = require('../middlewares/auditLog');
const { sendPasswordResetEmail, sendVerificationEmail, createTransporter, getFromName, getFromUser } = require('../utils/email');
const { sendNotificationEmailToUser } = require('../utils/notifyHelper');
const { parseUserAgent, hashToken, getClientIp, verifyTOTP, buildDeviceInfo, createUserSession, setAuthCookie, timingSafeCompare } = require('../utils/helpers');
const { encryptField, decryptField, encryptArray, decryptArray } = require('../utils/crypto');
const { asyncHandler } = require('../utils/errorHandler');

const DEMO_EMAILS = (process.env.DEMO_EMAILS || 'demo@furry09.com').split(',').map(e => e.trim().toLowerCase());

const skipVerification = (user) => {
  // DEMO_EMAILS 仅在非生产环境生效，允许已存在的账号跳过验证
  if (process.env.NODE_ENV !== 'production' && DEMO_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
};

const usedTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  purpose: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});
usedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const UsedToken = mongoose.models.UsedToken || mongoose.model('UsedToken', usedTokenSchema);

const markTokenUsed = async (tokenHash, purpose, ttlMs) => {
  try {
    await UsedToken.create({ tokenHash, purpose, expiresAt: new Date(Date.now() + ttlMs) });
  } catch (e) {
    // 重复键忽略
  }
};

const isTokenUsed = async (tokenHash) => {
  const doc = await UsedToken.findOne({ tokenHash });
  return !!doc;
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

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

const ipRegionCache = new Map();
const IP_REGION_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_IP_REGION_CACHE = 1000;

const getCachedIpRegion = async (ip) => {
  const cached = ipRegionCache.get(ip);
  if (cached && Date.now() - cached.timestamp < IP_REGION_CACHE_TTL) {
    return cached.region;
  }
  const region = await getIpRegion(ip);
  if (ipRegionCache.size >= MAX_IP_REGION_CACHE) {
    const oldestKey = ipRegionCache.keys().next().value;
    ipRegionCache.delete(oldestKey);
  }
  ipRegionCache.set(ip, { region, timestamp: Date.now() });
  return region;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         accountId:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         isEmailVerified:
 *           type: boolean
 *         adminAccess:
 *           type: boolean
 *         token:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */

const ALTCHA_HMAC_KEY = process.env.ALTCHA_HMAC_KEY || (process.env.JWT_SECRET ? crypto.createHash('sha256').update('altcha-' + process.env.JWT_SECRET).digest('hex') : crypto.randomBytes(32).toString('hex'));

router.get('/captcha', async (req, res) => {
  try {
    const challenge = await createChallenge({
      algorithm: 'SHA-256',
      hmacSignatureSecret: ALTCHA_HMAC_KEY,
      deriveKey: sha.deriveKey,
      cost: 50000,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    res.json(challenge);
  } catch (e) {
    console.error('[Altcha] Failed to create challenge:', e.message);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 开发/测试用 API 口令，绕过 altcha 验证
const DEV_API_TOKEN = process.env.DEV_API_TOKEN;

const verifyAltcha = async (payload, req) => {
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

router.get('/check-accountId', async (req, res) => {
  try {
    const { accountId } = req.query;
    if (!accountId) {
      return res.status(400).json({ message: 'accountId is required' });
    }
    const existing = await User.findOne({ accountId });
    res.json({ available: !existing });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [认证]
 *     summary: 用户注册
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [accountId, username, email, password, captchaId, captchaAnswer]
 *             properties:
 *               accountId:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               captchaId:
 *                 type: string
 *               captchaAnswer:
 *                 type: string
 *     responses:
 *       200:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 email:
 *                   type: string
 *                 needVerification:
 *                   type: boolean
 *       400:
 *         description: 参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req, res) => {
  const accountId = xss(req.body.accountId?.trim());
  const username = xss(req.body.username?.trim());
  const email = xss(req.body.email?.trim());
  const { password, deviceInfo } = req.body;
  const altchaPayload = req.body.altcha;
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);

  try {
    if (!(await verifyAltcha(altchaPayload, req))) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: '邮箱格式不正确' });

    if (!accountId || accountId.length < 3 || accountId.length > 20) return res.status(400).json({ message: '账号ID长度需在3-20个字符之间' });
    if (!/^[a-zA-Z0-9_]+$/.test(accountId)) return res.status(400).json({ message: '账号ID只能包含字母、数字和下划线' });

    if (!username || username.length < 1 || username.length > 20) return res.status(400).json({ message: '昵称长度需在1-20个字符之间' });

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    if (DEMO_EMAILS.includes(email.toLowerCase())) {
      const existingDemo = await User.findOne({ email });
      if (!existingDemo) {
        return res.status(400).json({ message: '该邮箱不可注册' });
      }
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }

    const accountIdExists = await User.findOne({ accountId });
    if (accountIdExists) {
      return res.status(400).json({ message: '该账号ID已被占用' });
    }

    const user = await User.create({
      accountId,
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
      lastLoginRegion: await getCachedIpRegion(getClientIp(req))
    }).catch(err => {
      if (err.code === 11000) {
        const message = '该信息已被使用';
        throw { status: 400, message };
      }
      throw err;
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
      return res.status(400).json({ message: '该信息已被使用' });
    }
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [认证]
 *     summary: 用户登录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, captchaId, captchaAnswer]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               captchaId:
 *                 type: string
 *               captchaAnswer:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登录成功，返回用户信息和JWT令牌
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: 凭证无效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: 需要邮箱验证或新设备验证
 */
router.post('/login', async (req, res) => {
  const email = xss(req.body.email?.trim());
  const { password, deviceInfo } = req.body;
  const altchaPayload = req.body.altcha;
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);

  try {
    if (!(await verifyAltcha(altchaPayload, req))) {
      return res.status(400).json({ message: '验证码错误或已过期' });
    }

    const user = await User.findOne({ email }).select('+loginAttempts +lockUntil');
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    if (user.isLocked) {
      return res.status(400).json({ message: '用户名或密码错误' });
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
        return res.status(400).json({ message: '用户名或密码错误' });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(400).json({ message: '用户名或密码错误' });
    }
    await user.resetLoginAttempts();

    if (!user.isEmailVerified && !skipVerification(user) && !(DEV_API_TOKEN && req.headers['x-dev-token'] === DEV_API_TOKEN)) {
      const verifyToken = jwt.sign(
        { id: user._id, purpose: 'verify-email' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      sendVerificationEmail(user.email, verifyToken).catch(() => {});
      return res.status(403).json({ message: '请先验证邮箱后再登录，验证邮件已重新发送至您的邮箱', needVerification: true, email: user.email });
    }

    if (skipVerification(user) && !user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    const currentIp = getClientIp(req);
    const currentUa = ua;
    const knownSessions = await UserSession.find({ userId: user._id, isActive: true });
    const isKnownDevice = knownSessions.some(s => s.deviceInfo?.userAgent === currentUa);

    if (!isKnownDevice && knownSessions.length > 0 && !skipVerification(user) && !(DEV_API_TOKEN && req.headers['x-dev-token'] === DEV_API_TOKEN)) {
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
              <p style="margin:4px 0"><strong>浏览器：</strong>${escapeHtml(parsed.browser) || '未知'} ${escapeHtml(parsed.browserVersion || '')}</p>
              <p style="margin:4px 0"><strong>操作系统：</strong>${escapeHtml(parsed.os) || '未知'} ${escapeHtml(parsed.osVersion || '')}</p>
              <p style="margin:4px 0"><strong>设备类型：</strong>${escapeHtml(parsed.deviceType) || '未知'}</p>
              <p style="margin:4px 0"><strong>IP地址：</strong>${escapeHtml(currentIp)}</p>
            </div>
            ${(parsed.os === 'iOS' || parsed.os === 'iPadOS' || parsed.os === 'macOS') ? '<p style="color:#94a3b8;font-size:12px;margin:4px 0 12px;">* Apple 设备因隐私策略，浏览器上报的系统版本可能不准确（Safari 冻结了版本号，且旧设备也可能被推送过带新版本号的浏览器安全更新）</p>' : ''}
            <p>如非本人操作，请忽略此邮件。如确认是本人，请点击下方按钮确认登录：</p>
            <div style="text-align:center;margin:20px 0">
              <a href="${process.env.SITE_URL || 'http://localhost:3000'}/verify-device?token=${deviceVerifyToken}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">确认登录</a>
            </div>
            <p style="color:#999;font-size:12px">此链接30分钟内有效</p>
          </div>`
        };
        const transporter = await createTransporter();
        if (transporter) {
          transporter.sendMail(mailOptions).catch(() => {});
        }
      } catch (e) {}
      return res.status(403).json({
        message: '检测到新设备登录，验证邮件已发送至您的邮箱，请确认后登录',
        needDeviceVerify: true,
        email: user.email,
        deviceInfo: {
          browser: parsed.browser || '',
          browserVersion: parsed.browserVersion || '',
          os: parsed.os || '',
          osVersion: parsed.osVersion || '',
          deviceType: parsed.deviceType || '',
          ip: currentIp
        }
      });
    }

    if (user.twoFactorEnabled) {
      const twoFactorChallenge = jwt.sign(
        { id: user._id, purpose: '2fa-challenge' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        need2FA: true,
        email: user.email,
        twoFactorChallenge
      });
    }

    user.deviceInfo = buildDeviceInfo(deviceInfo, parsed, ua, req);
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    user.lastLoginRegion = await getCachedIpRegion(getClientIp(req));
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    await createUserSession(user._id, token, deviceInfo, parsed, ua, getClientIp(req));

    setAuthCookie(res, token);

    logManual({
      userId: user._id,
      userName: user.username || user.accountId,
      action: 'LOGIN',
      target: 'auth',
      details: 'User login success',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });

    // 新设备登录提醒邮件（已知设备首次登录或跳过验证的登录）
    sendNotificationEmailToUser(
      user._id,
      'newDeviceLogin',
      { browser: parsed.browser, browserVersion: parsed.browserVersion, os: parsed.os, osVersion: parsed.osVersion, deviceType: parsed.deviceType },
      getClientIp(req),
      user.lastLoginRegion,
      new Date()
    );

    res.json({
      _id: user._id,
      accountId: user.accountId,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      role: user.role || 'user',
      forceEmailChange: user.role === 'superadmin' && user.email === 'admin@furry09.com',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

router.post('/verify-device', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: '缺少验证令牌' });
    const tokenHash = hashToken(token);
    if (await isTokenUsed(tokenHash)) {
      return res.status(400).json({ message: '该验证链接已被使用' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'device-verify') return res.status(400).json({ message: '无效的验证令牌' });
    const user = await User.findById(decoded.id).select('+loginAttempts +lockUntil');
    if (!user) return res.status(400).json({ message: '用户不存在' });
    await markTokenUsed(tokenHash, 'device-verify', 30 * 60 * 1000);

    if (user.twoFactorEnabled) {
      return res.json({
        need2FA: true,
        email: user.email,
        deviceVerified: true
      });
    }

    const loginToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const ua = decoded.ua || '';
    const parsed = parseUserAgent(ua);
    await createUserSession(user._id, loginToken, null, parsed, ua, decoded.ip || '');
    setAuthCookie(res, loginToken);

    // 新设备登录提醒邮件
    const verifyRegion = await getCachedIpRegion(decoded.ip || '');
    sendNotificationEmailToUser(
      user._id,
      'newDeviceLogin',
      { browser: parsed.browser, browserVersion: parsed.browserVersion, os: parsed.os, osVersion: parsed.osVersion, deviceType: parsed.deviceType },
      decoded.ip || '',
      verifyRegion,
      new Date()
    );

    res.json({
      _id: user._id, accountId: user.accountId, username: user.username, email: user.email,
      isEmailVerified: user.isEmailVerified, role: user.role || 'user',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(400).json({ message: '验证链接已过期，请重新登录' });
    res.status(400).json({ message: '验证失败' });
  }
});

router.post('/login-2fa', async (req, res) => {
  const { email, twoFactorToken, twoFactorChallenge, deviceInfo } = req.body;
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);
  try {
    // 验证 2FA 挑战令牌（证明已通过密码验证）
    if (!twoFactorChallenge) {
      return res.status(400).json({ message: '缺少2FA挑战令牌，请重新登录' });
    }
    let challengePayload;
    try {
      challengePayload = jwt.verify(twoFactorChallenge, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ message: '2FA挑战令牌已过期或无效，请重新登录' });
    }
    if (challengePayload.purpose !== '2fa-challenge') {
      return res.status(400).json({ message: '无效的2FA挑战令牌' });
    }

    const user = await User.findOne({ email }).select('+loginAttempts +lockUntil +twoFactorSecret +twoFactorBackupCodes');
    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: '该账号未启用两步验证' });
    }
    if (user._id.toString() !== challengePayload.id) {
      return res.status(400).json({ message: '验证失败' });
    }

    // 重新检查账号锁定状态
    if (user.isLocked) {
      return res.status(423).json({ message: '账号已被锁定，请30分钟后再试' });
    }

    // 重新检查邮箱验证
    if (!user.isEmailVerified && !skipVerification(user) && !(DEV_API_TOKEN && req.headers['x-dev-token'] === DEV_API_TOKEN)) {
      return res.status(403).json({ message: '请先验证邮箱后再登录' });
    }

    const secret = decryptField(user.twoFactorSecret);
    const backupCodes = decryptArray(user.twoFactorBackupCodes);

    if (!verifyTOTP(secret, twoFactorToken) && !backupCodes.some(c => timingSafeCompare(c, twoFactorToken))) {
      return res.status(400).json({ message: '验证码无效' });
    }

    if (backupCodes.some(c => timingSafeCompare(c, twoFactorToken))) {
      const remaining = backupCodes.filter(c => !timingSafeCompare(c, twoFactorToken));
      user.twoFactorBackupCodes = encryptArray(remaining);
    }

    user.deviceInfo = buildDeviceInfo(deviceInfo, parsed, ua, req);
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    user.lastLoginRegion = await getCachedIpRegion(getClientIp(req));
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    await createUserSession(user._id, token, deviceInfo, parsed, ua, getClientIp(req));

    logManual({
      userId: user._id,
      userName: user.username || user.accountId,
      action: 'LOGIN_2FA',
      target: 'auth',
      details: 'User login with 2FA',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });

    setAuthCookie(res, token);

    // 新设备登录提醒邮件（2FA 登录完成）
    sendNotificationEmailToUser(
      user._id,
      'newDeviceLogin',
      { browser: parsed.browser, browserVersion: parsed.browserVersion, os: parsed.os, osVersion: parsed.osVersion, deviceType: parsed.deviceType },
      getClientIp(req),
      user.lastLoginRegion,
      new Date()
    );

    res.json({
      _id: user._id,
      accountId: user.accountId,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      role: user.role || 'user',
      forceEmailChange: user.role === 'superadmin' && user.email === 'admin@furry09.com',
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [认证]
 *     summary: 退出登录（使当前令牌失效）
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 退出成功
 *       401:
 *         description: 未认证
 */
router.post('/logout', protect, async (req, res) => {
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

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [认证]
 *     summary: 获取当前登录用户信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未认证
 *       404:
 *         description: 用户不存在
 */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json({
      _id: user._id,
      accountId: user.accountId,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      role: user.role || 'user',
      avatar: user.avatar || '',
      emailNotificationPrefs: user.emailNotificationPrefs || {}
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
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
    await UserSession.updateMany({ userId: req.user._id, isActive: true }, { isActive: false });
    logManual({
      userId: req.user._id,
      userName: req.user.username || req.user.accountId,
      action: 'CHANGE_PASSWORD',
      target: 'auth',
      details: 'Password changed',
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });
    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 超管强制修改邮箱（从默认 admin@furry09.com 改为自己的邮箱）
router.put('/change-email', protect, async (req, res) => {
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

    res.json({
      message: '邮箱修改成功，请查收验证邮件',
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

router.post('/forgot-password', async (req, res) => {
  const email = xss(req.body.email?.trim());
  const altchaPayload = req.body.altcha;
  try {
    if (!(await verifyAltcha(altchaPayload, req))) {
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
    sendPasswordResetEmail(email, resetToken).catch(err => {
      console.error('[Email] Password reset email failed:', err.message);
    });
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
    const resetTokenHash = hashToken(token);
    if (await isTokenUsed(resetTokenHash)) {
      return res.status(400).json({ message: '该重置链接已使用，请重新获取' });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    await markTokenUsed(resetTokenHash, 'reset-password', 60 * 60 * 1000);
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    logManual({
      userId: user._id,
      userName: user.username || user.accountId,
      action: 'PASSWORD_RESET',
      target: 'auth',
      details: 'Password reset via email link',
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

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

    logManual({
      userId: req.user._id,
      userName: req.user.username || req.user.accountId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      target: 'auth',
      details: 'Account deletion requested',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      message: '注销申请已提交',
      deletionRequestedAt: user.deletionRequestedAt,
      deleteAt
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
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

    logManual({
      userId: req.user._id,
      userName: req.user.username || req.user.accountId,
      action: 'ACCOUNT_DELETION_CANCELLED',
      target: 'auth',
      details: 'Account deletion cancelled',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ message: '注销申请已取消' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
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
    res.status(500).json({ message: '服务器错误' });
  }
});

router.get('/sse-ticket', protect, async (req, res) => {
  try {
    const ticket = jwt.sign(
      { id: req.user._id, purpose: 'sse-ticket' },
      process.env.JWT_SECRET,
      { expiresIn: '30s' }
    );
    res.json({ ticket });
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

    // 检查新邮箱是否已被使用
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: '该邮箱已被其他账号使用' });
    }
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      return res.status(400).json({ message: '新邮箱与当前邮箱相同' });
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
