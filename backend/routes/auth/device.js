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
const mongoose = require('mongoose');
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

// 设备验证一次性登录码（内存存储，10分钟过期）
const deviceLoginCodes = require('../../utils/deviceLoginCodes');


router.post('/verify-device', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: '缺少验证令牌' });
    const tokenHash = hashToken(token);
    if (await isTokenUsed(tokenHash)) {
      return res.status(400).json({ message: '该验证链接已被使用' });
    }
    const decoded = verifyJwt(token);
    if (decoded.purpose !== 'device-verify') return res.status(400).json({ message: '无效的验证令牌' });
    const user = await User.findById(decoded.id).select('+loginAttempts +lockUntil +twoFactorEnabled');
    if (!user) return res.status(400).json({ message: '用户不存在' });
    await markTokenUsed(tokenHash, 'device-verify', 30 * 60 * 1000);

    // 生成 6 位一次性登录码，不设置 cookie，不创建会话
    // 用户需回到原浏览器输入此码完成登录（解决邮箱App内置浏览器cookie不共享问题）
    // 使用 crypto.randomInt 而非 Math.random，避免可预测性
    const loginCode = String(crypto.randomInt(100000, 1000000));
    deviceLoginCodes.set(loginCode, {
      userId: user._id.toString(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      need2FA: !!user.twoFactorEnabled,
      attempts: 0
    });

    res.json({ verified: true, loginCode });
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(400).json({ message: '验证链接已过期，请重新登录' });
    res.status(400).json({ message: '验证失败' });
  }
});


// 确认设备登录：用户在原浏览器输入验证码完成登录
router.post('/confirm-device-login', async (req, res) => {
  try {
    const { loginCode } = req.body;
    if (!loginCode) return res.status(400).json({ message: '请输入验证码' });

    const entry = deviceLoginCodes.get(String(loginCode));
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) deviceLoginCodes.delete(String(loginCode));
      return res.status(400).json({ message: '验证码无效或已过期，请重新验证' });
    }

    // 单码尝试上限：防止分布式 IP 暴力 6 位码。达到 5 次立即作废
    entry.attempts = (entry.attempts || 0) + 1;
    // 注意：此处只是计数，真正"无效"的判定在下方（用户存在性/2FA 流程）。
    // 若本次调用进入 2FA 分支或成功登录，会删除条目；否则保留以累计尝试。
    // 为避免误删，仅在明确失败前检查上限
    if (entry.attempts > 5) {
      deviceLoginCodes.delete(String(loginCode));
      return res.status(400).json({ message: '尝试次数过多，验证码已作废，请重新验证' });
    }

    const user = await User.findById(entry.userId).select('+loginAttempts +lockUntil');
    if (!user) {
      deviceLoginCodes.delete(String(loginCode));
      return res.status(400).json({ message: '用户不存在' });
    }

    // 如果开启了 2FA，生成挑战令牌（携带 loginCode），让用户继续 2FA 流程
    if (entry.need2FA) {
      const twoFactorChallenge = jwt.sign(
        { id: user._id, purpose: '2fa-challenge', deviceLoginCode: String(loginCode) },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        need2FA: true,
        email: user.email,
        twoFactorChallenge
      });
    }

    // 未开启 2FA，直接完成登录
    deviceLoginCodes.delete(String(loginCode));

    const ua = req.headers['user-agent'] || '';
    const parsed = parseUserAgent(ua);
    const accessToken = createAccessToken(user._id);
    const { token: refreshToken } = createRefreshToken(user._id);
    await createUserSession(user._id, refreshToken, null, parsed, ua, getClientIp(req));
    setAuthCookies(res, accessToken, refreshToken);

    user.deviceInfo = buildDeviceInfo({}, parsed, ua, req);
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    user.lastLoginRegion = await getCachedIpRegion(getClientIp(req));
    await user.save();

    // 新设备登录提醒邮件
    sendNotificationEmailToUser(
      user._id,
      'newDeviceLogin',
      { browser: parsed.browser, browserVersion: parsed.browserVersion, os: parsed.os, osVersion: parsed.osVersion, deviceType: parsed.deviceType },
      getClientIp(req),
      user.lastLoginRegion,
      new Date()
    );

    res.json({
      _id: user._id, accountId: user.accountId, username: user.username, email: user.email,
      isEmailVerified: user.isEmailVerified, role: user.role || 'user',
    });
  } catch (error) {
    console.error('Confirm device login error:', error);
    res.status(500).json({ message: '服务器错误' });
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
      challengePayload = verifyJwt(twoFactorChallenge);
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
      // 2FA 失败同样计入账号锁定尝试，防止在 5 分钟挑战窗口内无限试码
      await user.incLoginAttempts();
      if (user.isLocked || (user.loginAttempts !== undefined && user.loginAttempts + 1 >= 5)) {
        return res.status(423).json({ message: '账号已被锁定，请30分钟后再试' });
      }
      return res.status(400).json({ message: '验证码无效' });
    }

    // 2FA 通过：重置尝试计数
    await user.resetLoginAttempts();

    if (backupCodes.some(c => timingSafeCompare(c, twoFactorToken))) {
      const remaining = backupCodes.filter(c => !timingSafeCompare(c, twoFactorToken));
      user.twoFactorBackupCodes = encryptArray(remaining);
    }

    user.deviceInfo = buildDeviceInfo(deviceInfo, parsed, ua, req);
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    user.lastLoginRegion = await getCachedIpRegion(getClientIp(req));
    await user.save();

    const accessToken = createAccessToken(user._id);
    const { token: refreshToken } = createRefreshToken(user._id);
    await createUserSession(user._id, refreshToken, deviceInfo, parsed, ua, getClientIp(req));

    logManual({
      userId: user._id,
      userName: user.username || user.accountId,
      action: 'LOGIN_2FA',
      target: 'auth',
      details: 'User login with 2FA',
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || '',
    });

    setAuthCookies(res, accessToken, refreshToken);

    // 如果来自设备验证流程，删除一次性登录码
    if (challengePayload.deviceLoginCode) {
      deviceLoginCodes.delete(challengePayload.deviceLoginCode);
    }

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
      backgroundPrefs: user.backgroundPrefs || {},
      personalWallpapers: user.personalWallpapers || [],
    });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router;
