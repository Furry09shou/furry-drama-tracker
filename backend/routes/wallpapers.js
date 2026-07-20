const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SystemWallpaper = require('../models/SystemWallpaper');
const { protect, adminProtect } = require('../middlewares/authFactory');
const { createUploadConfig } = require('../utils/upload');
const fs = require('fs');
const path = require('path');

const wpUpload = createUploadConfig('wallpaper', 8 * 1024 * 1024);

// ===== 系统壁纸（管理员管理 / 所有人查看） =====

// 获取所有启用的系统壁纸（公开接口，无需登录）
router.get('/system', async (req, res) => {
  try {
    const list = await SystemWallpaper.find({ enabled: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .select('name url thumbnailUrl sortOrder');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: '获取系统壁纸失败' });
  }
});

// 管理员：获取所有系统壁纸（含禁用）
router.get('/system/all', adminProtect, async (req, res) => {
  try {
    const list = await SystemWallpaper.find()
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: '获取系统壁纸失败' });
  }
});

// 管理员：上传系统壁纸
router.post('/system', adminProtect, wpUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请选择要上传的图片' });
    const url = `/uploads/${req.file.filename}`;
    const { name, enabled, sortOrder } = req.body;
    const wp = await SystemWallpaper.create({
      url,
      name: name || '',
      enabled: enabled !== 'false',
      sortOrder: parseInt(sortOrder) || 0,
      uploadedBy: req.user._id,
    });
    res.json(wp);
  } catch (error) {
    res.status(500).json({ message: '上传系统壁纸失败' });
  }
});

// 管理员：更新系统壁纸
router.put('/system/:id', adminProtect, async (req, res) => {
  try {
    const { name, enabled, sortOrder } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (enabled !== undefined) update.enabled = !!enabled;
    if (sortOrder !== undefined) update.sortOrder = parseInt(sortOrder) || 0;
    const wp = await SystemWallpaper.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!wp) return res.status(404).json({ message: '壁纸不存在' });
    res.json(wp);
  } catch (error) {
    res.status(500).json({ message: '更新系统壁纸失败' });
  }
});

// 管理员：删除系统壁纸
router.delete('/system/:id', adminProtect, async (req, res) => {
  try {
    const wp = await SystemWallpaper.findByIdAndDelete(req.params.id);
    if (!wp) return res.status(404).json({ message: '壁纸不存在' });
    // 删除文件
    if (wp.url && wp.url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', wp.url);
      fs.unlink(filePath, () => {});
    }
    res.json({ message: '已删除' });
  } catch (error) {
    res.status(500).json({ message: '删除系统壁纸失败' });
  }
});

// ===== 个人壁纸（登录用户管理自己的） =====

// 获取我的个人壁纸列表
router.get('/personal', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('personalWallpapers');
    res.json(user.personalWallpapers || []);
  } catch (error) {
    res.status(500).json({ message: '获取个人壁纸失败' });
  }
});

// 上传个人壁纸
router.post('/personal', protect, wpUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请选择要上传的图片' });
    const url = `/uploads/${req.file.filename}`;
    const { name } = req.body;
    const user = await User.findById(req.user._id);
    // 限制个人壁纸数量
    if (user.personalWallpapers && user.personalWallpapers.length >= 20) {
      // 删除刚上传的文件
      fs.unlinkSync(path.join(__dirname, '..', url));
      return res.status(400).json({ message: '个人壁纸最多 20 张，请先删除旧的' });
    }
    user.personalWallpapers.push({ url, name: name || '' });
    await user.save();
    res.json({ url, name: name || '', addedAt: new Date() });
  } catch (error) {
    res.status(500).json({ message: '上传个人壁纸失败' });
  }
});

// 删除个人壁纸
router.delete('/personal', protect, async (req, res) => {
  try {
    const { url } = req.body;
    const user = await User.findById(req.user._id);
    user.personalWallpapers = (user.personalWallpapers || []).filter(w => w.url !== url);
    await user.save();
    // 删除文件
    if (url && url.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', url);
      fs.unlink(filePath, () => {});
    }
    res.json({ message: '已删除' });
  } catch (error) {
    res.status(500).json({ message: '删除个人壁纸失败' });
  }
});

module.exports = router;
