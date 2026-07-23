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
    // 双 Token：密码变更后清除客户端 cookie，强制重新登录
    clearAuthCookies(res);
    res.json({ message: '密码修改成功' });
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
    const decoded = verifyJwt(token);
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

module.exports = router;
