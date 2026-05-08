const express = require('express');
const router = express.Router();
const FriendLink = require('../models/FriendLink');
const adminProtect = require('../middlewares/adminAuth');
const { realAdminOnly } = require('../middlewares/adminAuth');

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
    const links = await FriendLink.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(links);
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

router.post('/', adminProtect, realAdminOnly, async (req, res) => {
  try {
    const { name, url, logo, description, order, isActive } = req.body;
    if (!name || !url) {
      return res.status(400).json({ message: '名称和链接为必填项' });
    }
    if (!isValidUrl(url)) {
      return res.status(400).json({ message: '链接格式不合法，仅支持 http/https 协议' });
    }
    if (logo && !isValidUrl(logo)) {
      return res.status(400).json({ message: 'Logo URL 格式不合法' });
    }
    const link = await FriendLink.create({ name, url, logo, description, order: order || 0, isActive: isActive !== undefined ? isActive : true });
    res.json(link);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', adminProtect, realAdminOnly, async (req, res) => {
  try {
    const { name, url, logo, description, order, isActive } = req.body;
    if (url && !isValidUrl(url)) {
      return res.status(400).json({ message: '链接格式不合法，仅支持 http/https 协议' });
    }
    if (logo && !isValidUrl(logo)) {
      return res.status(400).json({ message: 'Logo URL 格式不合法' });
    }
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (logo !== undefined) updateData.logo = logo;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    const link = await FriendLink.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!link) return res.status(404).json({ message: '友链不存在' });
    res.json(link);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', adminProtect, realAdminOnly, async (req, res) => {
  try {
    const link = await FriendLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ message: '友链不存在' });
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
