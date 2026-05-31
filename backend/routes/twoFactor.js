const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authFactory');
const User = require('../models/User');
const { verifyTOTP, generateTOTPSecret, generateBackupCodes } = require('../utils/helpers');
const { logManual } = require('../middlewares/auditLog');

router.post('/enable', protect, async (req, res) => {
  try {
    const secret = generateTOTPSecret();
    const backupCodes = generateBackupCodes();

    await User.findByIdAndUpdate(req.user._id, {
      twoFactorSecret: secret,
      twoFactorBackupCodes: backupCodes,
      twoFactorEnabled: false,
    });

    const user = await User.findById(req.user._id);

    const otpauthUrl = `otpauth://totp/FurryDrama:${user.accountId}?secret=${encodeURIComponent(secret)}&issuer=FurryDrama`;

    logManual({
      userId: req.user._id,
      userName: req.user.username || req.user.accountId,
      action: '2FA_SETUP_INITIATED',
      target: '2fa',
      details: '2FA setup initiated',
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      secret,
      backupCodes,
      otpauthUrl,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-enable', protect, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA not set up' });
    }

    if (!verifyTOTP(user.twoFactorSecret, token)) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    logManual({
      userId: req.user._id,
      userName: req.user.username || req.user.accountId,
      action: '2FA_ENABLED',
      target: '2fa',
      details: '2FA enabled successfully',
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/disable', protect, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret +twoFactorBackupCodes');

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA not enabled' });
    }

    if (!verifyTOTP(user.twoFactorSecret, token) && !user.twoFactorBackupCodes.includes(token)) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (user.twoFactorBackupCodes.includes(token)) {
      user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(c => c !== token);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    logManual({
      userId: req.user._id,
      userName: req.user.username || req.user.accountId,
      action: '2FA_DISABLED',
      target: '2fa',
      details: '2FA disabled',
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify', protect, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select('+twoFactorSecret +twoFactorBackupCodes');

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA not enabled for this account' });
    }

    if (verifyTOTP(user.twoFactorSecret, token) || user.twoFactorBackupCodes.includes(token)) {
      if (user.twoFactorBackupCodes.includes(token)) {
        user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(c => c !== token);
        await user.save();
      }
      return res.json({ verified: true });
    }

    res.status(400).json({ message: 'Invalid verification code' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
