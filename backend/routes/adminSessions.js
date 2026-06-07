const express = require('express');
const router = express.Router();
const AdminSession = require('../models/AdminSession');
const Admin = require('../models/Admin');
const { adminProtect, superAdminProtect } = require('../middlewares/authFactory');
const { parseUserAgent, hashToken, getClientIp } = require('../utils/helpers');

router.post('/create', adminProtect, async (req, res) => {
  try {
    const { screenWidth, screenHeight, language } = req.body;
    const ua = req.headers['user-agent'] || '';
    const ip = getClientIp(req);
    const deviceInfo = parseUserAgent(ua);
    if (screenWidth) deviceInfo.screenWidth = screenWidth;
    if (screenHeight) deviceInfo.screenHeight = screenHeight;
    if (language) deviceInfo.language = language;
    deviceInfo.userAgent = ua;

    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    const tokenHash = hashToken(adminToken);

    const session = new AdminSession({
      adminId: req.admin._id,
      adminUsername: req.admin.username,
      adminRole: req.admin.role,
      tokenHash,
      deviceInfo,
      ip
    });
    await session.save();

    res.json({ sessionId: session._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', adminProtect, async (req, res) => {
  try {
    const sessions = await AdminSession.find({ adminId: req.admin._id })
      .sort({ loginAt: -1 })
      .limit(20);
    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    const currentTokenHash = hashToken(adminToken);
    const result = sessions.map(s => ({
      ...s.toObject(),
      isCurrent: s.tokenHash === currentTokenHash
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', superAdminProtect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const total = await AdminSession.countDocuments({});
    const totalPages = Math.ceil(total / limitNum);
    const sessions = await AdminSession.find()
      .sort({ loginAt: -1 })
      .skip((pageNum - 1) * limitNum).limit(limitNum);
    const adminToken = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.adminToken;
    const currentTokenHash = hashToken(adminToken);
    const result = sessions.map(s => ({
      ...s.toObject(),
      isCurrent: s.tokenHash === currentTokenHash
    }));
    res.json({ list: result, page: pageNum, limit: limitNum, total, totalPages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/name', adminProtect, async (req, res) => {
  try {
    const { deviceName } = req.body;
    if (!deviceName || !deviceName.trim()) {
      return res.status(400).json({ message: '设备名称不能为空' });
    }
    const session = await AdminSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: '会话不存在' });
    if (session.adminId.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: '权限不足' });
    }
    session.deviceInfo.deviceName = deviceName.trim().slice(0, 50);
    await session.save();
    res.json({ message: '设备名称已更新' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const session = await AdminSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: '会话不存在' });

    if (req.admin.role !== 'superadmin' && session.adminId.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: '权限不足' });
    }

    session.isActive = false;
    session.logoutAt = new Date();
    await session.save();

    res.json({ message: '已下线该设备' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/admin/:adminId/all', superAdminProtect, async (req, res) => {
  try {
    await AdminSession.updateMany(
      { adminId: req.params.adminId, isActive: true },
      { isActive: false, logoutAt: new Date() }
    );
    res.json({ message: '已下线该账号所有设备' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/heartbeat', adminProtect, async (req, res) => {
  try {
    const adminToken = req.headers.authorization?.replace('Bearer ', '');
    const tokenHash = hashToken(adminToken);
    await AdminSession.findOneAndUpdate(
      { tokenHash, isActive: true },
      { lastActiveAt: new Date() }
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
