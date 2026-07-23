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

module.exports = router;
