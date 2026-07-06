const express = require('express');
const router = express.Router();
const FriendLink = require('../models/FriendLink');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushToUser } = require('./notifications');
const { adminProtect, protect } = require('../middlewares/authFactory');
const jwt = require('jsonwebtoken');

const optionalProtect = async (req, res, next) => {
  try {
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token && req.cookies) {
      token = req.cookies.token;
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require('../models/User');
      const UserSession = require('../models/UserSession');
      const { hashToken } = require('../utils/helpers');
const { asyncHandler } = require('../utils/errorHandler');
      const tokenHash = hashToken(token);
      const session = await UserSession.findOne({ tokenHash, isActive: true });
      if (session) {
        req.user = await User.findById(decoded.id);
      }
    }
  } catch (e) {}
  next();
};

const isValidUrl = (str) => {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

router.get('/', async (req, res) => {
  try {
    const links = await FriendLink.find({
      isActive: true,
      $or: [{ status: 'approved' }, { status: { $exists: false } }]
    }).sort({ order: 1, createdAt: 1 });
    res.json(links);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/apply', optionalProtect, async (req, res) => {
  try {
    const { name, url, logo, description, captchaId, captchaAnswer } = req.body;
    if (!name || !url) {
      return res.status(400).json({ message: '站点名称和链接为必填项' });
    }
    // 验证验证码
    if (!captchaId || !captchaAnswer) {
      return res.status(400).json({ message: '请输入验证码' });
    }
    // 使用内存验证码存储验证
    const captchaVerified = global._captchaStore && global._captchaStore.get(captchaId);
    if (!captchaVerified) {
      return res.status(400).json({ message: '验证码无效或已过期' });
    }
    if (captchaVerified.expires < Date.now()) {
      global._captchaStore.delete(captchaId);
      return res.status(400).json({ message: '验证码已过期' });
    }
    if (String(captchaVerified.answer) !== String(captchaAnswer).trim().toLowerCase()) {
      global._captchaStore.delete(captchaId);
      return res.status(400).json({ message: '验证码错误' });
    }
    global._captchaStore.delete(captchaId);
    if (!isValidUrl(url)) {
      return res.status(400).json({ message: '链接格式不合法，仅支持 http/https 协议' });
    }
    if (logo && !isValidUrl(logo)) {
      return res.status(400).json({ message: 'Logo URL 格式不合法' });
    }
    const applicantId = req.user ? req.user._id : null;
    await FriendLink.create({
      name, url, logo: logo || '', description: description || '',
      order: 0, isActive: false, status: 'pending', applicantId
    });
    const superAdmins = await User.find({ role: 'superadmin' });
    if (superAdmins.length > 0) {
      const notifications = superAdmins.map(a => ({
        userId: a._id,
        type: 'friend_link_apply',
        message: `新友链申请：${name}`,
        metadata: { name }
      }));
      await Notification.insertMany(notifications);
      superAdmins.forEach(a => {
        sendPushToUser(String(a._id), {
          title: '新友链申请',
          body: `收到来自「${name}」的友链申请`,
          icon: '/vite.svg',
          data: { url: '/admin/friend-links' }
        });
      });
    }
    res.json({ message: '申请已提交，等待管理员审核' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my-applications', protect, async (req, res) => {
  try {
    const applications = await FriendLink.find({ applicantId: req.user._id }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/all', adminProtect, async (req, res) => {
  try {
    const links = await FriendLink.find().sort({ order: 1, createdAt: 1 });
    res.json(links);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', adminProtect, async (req, res) => {
  try {
    const { name, nameEn, nameJa, url, logo, description, descriptionEn, descriptionJa, order, isActive } = req.body;
    if (!name || !url) {
      return res.status(400).json({ message: '名称和链接为必填项' });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ message: '链接格式不合法，仅支持 http/https 协议' });
    }
    if (logo && !isValidUrl(logo)) {
      return res.status(400).json({ message: 'Logo URL 格式不合法' });
    }
    const link = await FriendLink.create({ name, nameEn: nameEn || '', nameJa: nameJa || '', url, logo, description, descriptionEn: descriptionEn || '', descriptionJa: descriptionJa || '', order: order || 0, isActive: isActive !== undefined ? isActive : true });
    res.json(link);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', adminProtect, async (req, res) => {
  try {
    const { name, nameEn, nameJa, url, logo, description, descriptionEn, descriptionJa, order, isActive, status } = req.body;
    if (url && !isValidUrl(url)) {
      return res.status(400).json({ message: '链接格式不合法，仅支持 http/https 协议' });
    }
    if (logo && !isValidUrl(logo)) {
      return res.status(400).json({ message: 'Logo URL 格式不合法' });
    }
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: '无效的状态值' });
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (nameJa !== undefined) updateData.nameJa = nameJa;
    if (url !== undefined) updateData.url = url;
    if (logo !== undefined) updateData.logo = logo;
    if (description !== undefined) updateData.description = description;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn;
    if (descriptionJa !== undefined) updateData.descriptionJa = descriptionJa;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'approved') updateData.isActive = true;
      if (status === 'rejected') updateData.isActive = false;
    }
    const link = await FriendLink.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!link) return res.status(404).json({ message: '友链不存在' });
    if (status && link.applicantId) {
      const statusLabel = status === 'approved' ? '已通过' : status === 'rejected' ? '已拒绝' : status;
      await Notification.create({
        userId: link.applicantId,
        type: 'friend_link_status',
        message: `友链「${link.name}」申请${statusLabel}`,
        metadata: { name: link.name, status: statusLabel }
      });
      sendPushToUser(String(link.applicantId), {
        title: '友链审核结果',
        body: `友链「${link.name}」申请${statusLabel}`,
        icon: '/vite.svg',
        data: { url: '/profile' }
      });
    }
    res.json(link);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const link = await FriendLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ message: '友链不存在' });
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
