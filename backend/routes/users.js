const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Follow = require('../models/Follow');
const Favorite = require('../models/Favorite');
const Rating = require('../models/Rating');
const History = require('../models/History');
const { protect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');
const { createUploadConfig } = require('../utils/upload');
const rateLimit = require('express-rate-limit');

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 exports per hour
  message: { message: '导出请求过于频繁，请1小时后再试' }
});

const upload = createUploadConfig('avatar', 2 * 1024 * 1024);

router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await User.findById(req.user._id);
    // 删除旧头像文件
    if (user && user.avatar && user.avatar.startsWith('/uploads/')) {
      const fs = require('fs');
      const oldPath = require('path').join(__dirname, '..', user.avatar);
      fs.unlink(oldPath, () => {});
    }
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    res.json({ url: avatarUrl });
  } catch (error) {
    res.status(500).json({ message: '头像上传失败' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小不能超过2MB' });
    }
    return res.status(400).json({ message: '文件上传错误' });
  }
  if (err) {
    return res.status(400).json({ message: err.message || '文件上传失败' });
  }
  next();
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { username } = req.body;
    const updateData = {};
    if (username !== undefined && username.trim()) {
      if (username.trim().length > 20) {
        return res.status(400).json({ message: '昵称长度不能超过20个字符' });
      }
      updateData.username = username.trim();
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: '没有需要更新的数据' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json({
      _id: user._id,
      accountId: user.accountId,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      role: user.role || 'user',
      avatar: user.avatar || ''
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/export-my-data', protect, exportLimiter, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select('-password');
  const follows = await Follow.find({ userId }).populate('episodeId', 'title coverImage status');
  const favorites = await Favorite.find({ userId }).populate('episodeId', 'title coverImage status');
  const ratings = await Rating.find({ userId }).populate('episodeId', 'title');
  const history = await History.find({ userId }).populate('episodeId', 'title');
  const format = req.query.format || 'json';

  if (format === 'csv') {
    const escapeCsv = (str) => {
      if (str == null) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    let csv = '';

    csv += '用户信息\n';
    csv += '字段,值\n';
    csv += `账号ID,${escapeCsv(user.accountId)}\n`;
    csv += `昵称,${escapeCsv(user.username)}\n`;
    csv += `邮箱,${escapeCsv(user.email)}\n`;
    csv += `注册时间,${escapeCsv(user.createdAt)}\n`;
    csv += '\n';

    csv += '关注列表\n';
    csv += '剧名,状态\n';
    follows.forEach(f => {
      const title = f.episodeId ? f.episodeId.title : '';
      const status = f.episodeId ? f.episodeId.status : '';
      csv += `${escapeCsv(title)},${escapeCsv(status)}\n`;
    });
    csv += '\n';

    csv += '收藏列表\n';
    csv += '剧名,状态\n';
    favorites.forEach(f => {
      const title = f.episodeId ? f.episodeId.title : '';
      const status = f.episodeId ? f.episodeId.status : '';
      csv += `${escapeCsv(title)},${escapeCsv(status)}\n`;
    });
    csv += '\n';

    csv += '评分记录\n';
    csv += '剧名,评分\n';
    ratings.forEach(r => {
      const title = r.episodeId ? r.episodeId.title : '';
      csv += `${escapeCsv(title)},${r.score}\n`;
    });
    csv += '\n';

    csv += '观看历史\n';
    csv += '剧名,最后观看时间\n';
    history.forEach(h => {
      const title = h.episodeId ? h.episodeId.title : '';
      csv += `${escapeCsv(title)},${escapeCsv(h.lastWatched)}\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=my_data_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv);
  } else {
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        _id: user._id,
        accountId: user.accountId,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar || '',
        createdAt: user.createdAt
      },
      follows: follows,
      favorites: favorites,
      ratings: ratings,
      watchHistory: history
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=my_data_${new Date().toISOString().split('T')[0]}.json`);
    res.json(exportData);
  }
}));

module.exports = router;
