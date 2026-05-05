const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Favorite = require('../models/Favorite');
const Rating = require('../models/Rating');
const History = require('../models/History');
const Wishlist = require('../models/Wishlist');
const protect = require('../middlewares/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

router.post('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl });
    res.json({ url: avatarUrl });
  } catch (error) {
    res.status(500).json({ message: '头像上传失败' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
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
    if (username && username.trim()) {
      const existing = await User.findOne({ username: username.trim(), _id: { $ne: req.user._id } });
      if (existing) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      updateData.username = username.trim();
    }
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No data to update' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/export-my-data', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('-password');
    const follows = await Follow.find({ userId }).populate('episodeId', 'title coverImage status');
    const favorites = await Favorite.find({ userId }).populate('episodeId', 'title coverImage status');
    const ratings = await Rating.find({ userId }).populate('episodeId', 'title');
    const history = await History.find({ userId }).populate('episodeId', 'title');
    const wishlist = await Wishlist.find({ userId }).populate('episodeId', 'title coverImage status');
    const exportData = {
      exportDate: new Date().toISOString(),
      user: user,
      follows: follows,
      favorites: favorites,
      ratings: ratings,
      watchHistory: history,
      wishlist: wishlist
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=my_data_${new Date().toISOString().split('T')[0]}.json`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
