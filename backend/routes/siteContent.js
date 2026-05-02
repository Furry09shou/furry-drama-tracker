const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const SiteContent = require('../models/SiteContent');
const adminProtect = require('../middlewares/adminAuth');
const superAdminProtect = require('../middlewares/superAdminAuth');

const siteStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'site-' + uniqueSuffix + ext);
  }
});

const siteUpload = multer({
  storage: siteStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

router.post('/upload', adminProtect, siteUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的图片' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: '文件上传失败' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: '文件大小不能超过5MB' });
    }
    return res.status(400).json({ message: '文件上传错误' });
  }
  if (err) {
    return res.status(400).json({ message: err.message || '文件上传失败' });
  }
  next();
});

const DEFAULT_CONTENT = {
  privacy: {
    key: 'privacy',
    title: '隐私政策',
    content: '请在此编辑隐私政策内容。'
  },
  terms: {
    key: 'terms',
    title: '用户协议',
    content: '请在此编辑用户协议内容。'
  },
  about: {
    key: 'about',
    title: '关于我们',
    content: '{"banner":"","logo":"","description":"","version":"1.0.0","updates":[],"icp":"","policeRecord":"","aiDisclaimer":"本网站部分内容由AI生成","copyright":"© 2026 09兽"}'
  },
  settings: {
    key: 'settings',
    title: '站点设置',
    content: '{"siteName":"兽剧聚合平台","navLogo":"","welcomeTitle":"欢迎来到兽剧聚合平台","welcomeSubtitle":"发现和追踪你喜爱的兽剧内容"}'
  }
};

router.get('/:key', async (req, res) => {
  try {
    let content = await SiteContent.findOne({ key: req.params.key });
    if (!content && DEFAULT_CONTENT[req.params.key]) {
      content = await SiteContent.create(DEFAULT_CONTENT[req.params.key]);
    }
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    console.error('Get site content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:key', superAdminProtect, async (req, res) => {
  try {
    const { title, content } = req.body;
    const updated = await SiteContent.findOneAndUpdate(
      { key: req.params.key },
      { title, content, updatedAt: Date.now() },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(updated);
  } catch (error) {
    console.error('Update site content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', superAdminProtect, async (req, res) => {
  try {
    let contents = await SiteContent.find({});
    for (const [key, defaults] of Object.entries(DEFAULT_CONTENT)) {
      if (!contents.find(c => c.key === key)) {
        const created = await SiteContent.create(defaults);
        contents.push(created);
      }
    }
    res.json(contents);
  } catch (error) {
    console.error('Get all site content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
