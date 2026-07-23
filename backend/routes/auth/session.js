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

router.get('/captcha', async (req, res) => {
  try {
    const challenge = await createChallenge({
      algorithm: 'SHA-256',
      hmacSignatureSecret: ALTCHA_HMAC_KEY,
      deriveKey: sha.deriveKey,
      cost: 10000,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });
    res.json(challenge);
  } catch (e) {
    console.error('[Altcha] Failed to create challenge:', e.message);
    res.status(500).json({ message: '服务器错误' });
  }
});


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
            <p>如非本人操作，请忽略此邮件。如确认是本人，请点击下方按钮获取验证码，并在原浏览器中输入验证码完成登录：</p>
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

    // 双 Token：Access(15min) + Refresh(7d, 轮换)
    const accessToken = createAccessToken(user._id);
    const { token: refreshToken } = createRefreshToken(user._id);

    await createUserSession(user._id, refreshToken, deviceInfo, parsed, ua, getClientIp(req));

    setAuthCookies(res, accessToken, refreshToken);

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
      backgroundPrefs: user.backgroundPrefs || {},
      personalWallpapers: user.personalWallpapers || [],
    });
  } catch (error) {
    console.error('Login error:', error);
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
    // 双 Token 登出：通过 refresh token cookie 标记对应 session 失效
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


// 双 Token 刷新端点
// 流程：
// 1. verifyRefreshToken 校验 refresh token（含重用检测）
// 2. 生成新的 access token + 新的 refresh token（轮换）
// 3. 旧 refresh token 标记 isActive=false（防止重用）
// 4. 创建新的 UserSession 记录（保留设备信息）
// 5. 设置新 cookie
//
// 安全特性：
// - 旧 refresh token 一旦被使用即失效，再次使用会触发重用检测，吊销所有 session
// - 新 refresh token 每次都不同，防止重放
// - 限流防刷：5次/15分钟（在 server.js 注册路由时挂载）
router.post('/refresh', async (req, res) => {
  try {
    const result = await verifyRefreshToken(req);
    if (!result.ok) {
      clearAuthCookies(res);
      return res.status(result.code).json({
        message: result.message,
        messageKey: result.messageKey
      });
    }

    const { user, session } = result;

    // 旧 refresh token 立即失效（轮换）
    session.isActive = false;
    session.logoutAt = new Date();
    await session.save();

    // 生成新双 Token
    const accessToken = createAccessToken(user._id);
    const { token: newRefreshToken } = createRefreshToken(user._id);

    // 创建新 session（继承设备信息）
    await UserSession.create({
      userId: user._id,
      refreshTokenHash: hashToken(newRefreshToken),
      deviceInfo: session.deviceInfo,
      ip: session.ip,
      loginAt: session.loginAt,
      lastActiveAt: new Date()
    });

    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      _id: user._id,
      accountId: user.accountId,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      role: user.role || 'user',
      forceEmailChange: user.role === 'superadmin' && user.email === 'admin@furry09.com',
      backgroundPrefs: user.backgroundPrefs || {},
      personalWallpapers: user.personalWallpapers || [],
    });
  } catch (error) {
    console.error('Token refresh error:', error);
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
      emailNotificationPrefs: user.emailNotificationPrefs || {},
      backgroundPrefs: user.backgroundPrefs || {},
      personalWallpapers: user.personalWallpapers || []
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

module.exports = router;
