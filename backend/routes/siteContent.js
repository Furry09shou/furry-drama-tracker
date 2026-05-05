const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const SiteContent = require('../models/SiteContent');
const adminProtect = require('../middlewares/adminAuth');
const superAdminProtect = require('../middlewares/superAdminAuth');
const nodemailer = require('nodemailer');
const { clearEmailCache } = require('../utils/email');

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
    content: '{"banner":"","logo":"","description":"","version":"1.0.0","updates":[],"changelog":[{"version":"1.0.0","date":"2026-05-02","items":["平台上线"]}],"icp":"","policeRecord":"","aiDisclaimer":"本网站部分内容由AI生成","copyright":"© 2026 09兽"}'
  },
  settings: {
    key: 'settings',
    title: '站点设置',
    content: '{"siteName":"兽剧聚合平台","navLogo":"","welcomeTitle":"欢迎来到兽剧聚合平台","welcomeSubtitle":"发现和追踪你喜爱的兽剧内容","favicon":"","browserTitle":"兽剧聚合平台"}'
  },
  email: {
    key: 'email',
    title: '邮件服务',
    content: '{"host":"","port":"465","user":"","pass":"","fromName":"兽剧聚合平台","enabled":false}'
  }
};

router.get('/:key', async (req, res) => {
  try {
    const sensitiveKeys = ['email'];
    if (sensitiveKeys.includes(req.params.key)) {
      const adminToken = req.headers.authorization?.replace('Bearer ', '');
      if (!adminToken) return res.status(403).json({ message: 'Forbidden' });
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
        if (!decoded.role || !['admin', 'superadmin', 'creator'].includes(decoded.role)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } catch (e) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
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
    if (req.params.key === 'email') {
      clearEmailCache();
    }
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

router.post('/test-email', superAdminProtect, async (req, res) => {
  try {
    const { host, port, user, pass, fromName, to } = req.body;
    if (!host || !user || !pass || !to) {
      return res.status(400).json({ message: '请填写完整的邮件服务配置和收件地址' });
    }
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || '465'),
      secure: parseInt(port || '465') === 465,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: { user, pass }
    });
    await transporter.sendMail({
      from: `"${fromName || '兽剧聚合平台'}" <${user}>`,
      to,
      subject: '邮件服务测试 - 兽剧聚合平台',
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:20px;">
          <h2 style="color:#6366f1;">邮件服务测试</h2>
          <p>这是一封测试邮件，用于验证邮件服务配置是否正确。</p>
          <p>如果您收到了此邮件，说明邮件服务配置成功！</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
          <p style="color:#94a3b8;font-size:12px;">此邮件由管理后台发送，请勿回复。</p>
        </div>
      `
    });
    res.json({ message: '测试邮件发送成功，请检查收件箱' });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(400).json({ message: `邮件发送失败：${error.message || '未知错误'}` });
  }
});

module.exports = router;
