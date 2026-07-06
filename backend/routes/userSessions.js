const express = require('express');
const router = express.Router();
const UserSession = require('../models/UserSession');
const User = require('../models/User');
const { protect, adminProtect, superAdminProtect } = require('../middlewares/authFactory');
const { parseUserAgent, hashToken, getClientIp } = require('../utils/helpers');
const { asyncHandler } = require('../utils/errorHandler');

router.post('/create', protect, async (req, res) => {
  try {
    const { screenWidth, screenHeight, language } = req.body;
    const ua = req.headers['user-agent'] || '';
    const ip = getClientIp(req);
    const deviceInfo = parseUserAgent(ua);
    if (screenWidth) deviceInfo.screenWidth = screenWidth;
    if (screenHeight) deviceInfo.screenHeight = screenHeight;
    if (language) deviceInfo.language = language;
    deviceInfo.userAgent = ua;

    const userToken = req.authToken;
    const tokenHash = hashToken(userToken);

    const session = await UserSession.findOneAndUpdate(
      { tokenHash },
      {
        userId: req.user._id,
        deviceInfo,
        ip,
        isActive: true,
        lastActiveAt: new Date(),
        $setOnInsert: { loginAt: new Date() }
      },
      { upsert: true, new: true }
    );

    res.json({ sessionId: session._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', protect, async (req, res) => {
  try {
    const sessions = await UserSession.find({ userId: req.user._id })
      .sort({ loginAt: -1 })
      .limit(20);
    const userToken = req.authToken;
    const currentTokenHash = hashToken(userToken);
    const result = sessions.map(s => ({
      ...s.toObject(),
      isCurrent: s.tokenHash === currentTokenHash
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/name', protect, async (req, res) => {
  try {
    const { deviceName } = req.body;
    if (!deviceName || !deviceName.trim()) {
      return res.status(400).json({ message: '设备名称不能为空' });
    }
    const session = await UserSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: '会话不存在' });
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '权限不足' });
    }
    session.deviceInfo.deviceName = deviceName.trim().slice(0, 50);
    await session.save();
    res.json({ message: '设备名称已更新' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    const session = await UserSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: '会话不存在' });

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '权限不足' });
    }

    const userToken = req.authToken;
    const currentTokenHash = hashToken(userToken);
    if (session.tokenHash === currentTokenHash) {
      return res.status(400).json({ message: '不能下线当前设备，请使用退出登录' });
    }

    session.isActive = false;
    session.logoutAt = new Date();
    await session.save();

    res.json({ message: '已下线该设备' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/my/all', protect, async (req, res) => {
  try {
    const userToken = req.authToken;
    const currentTokenHash = hashToken(userToken);

    await UserSession.updateMany(
      { userId: req.user._id, isActive: true, tokenHash: { $ne: currentTokenHash } },
      { isActive: false, logoutAt: new Date() }
    );

    res.json({ message: '已下线其他所有设备' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/heartbeat', protect, async (req, res) => {
  try {
    const userToken = req.authToken;
    const tokenHash = hashToken(userToken);
    await UserSession.findOneAndUpdate(
      { tokenHash, isActive: true },
      { lastActiveAt: new Date() }
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== 管理员级会话管理端点 =====

// 列出所有用户的会话（仅管理员）
router.get('/all', adminProtect, async (req, res) => {
  try {
    const sessions = await UserSession.find({})
      .populate('userId', 'username accountId email role avatar')
      .sort({ loginAt: -1 })
      .limit(200);
    const userToken = req.authToken;
    const currentTokenHash = hashToken(userToken);
    const result = sessions.map(s => {
      const obj = s.toObject();
      obj.isCurrent = s.tokenHash === currentTokenHash;
      obj.username = s.userId?.username;
      obj.userId = s.userId?._id;
      obj.userRole = s.userId?.role;
      return obj;
    });
    res.json({ list: result });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 管理员下线任意会话
router.delete('/admin/:id', superAdminProtect, async (req, res) => {
  try {
    const session = await UserSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: '会话不存在' });
    session.isActive = false;
    session.logoutAt = new Date();
    await session.save();
    res.json({ message: '已下线该设备' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 管理员下线某用户的所有会话
router.delete('/admin/user/:userId/all', superAdminProtect, async (req, res) => {
  try {
    await UserSession.updateMany(
      { userId: req.params.userId, isActive: true },
      { isActive: false, logoutAt: new Date() }
    );
    res.json({ message: '已下线该用户所有设备' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
