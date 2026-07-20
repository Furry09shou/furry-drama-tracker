const express = require('express');
const router = express.Router();
const SiteContent = require('../models/SiteContent');
const { adminProtect, superAdminProtect } = require('../middlewares/authFactory');
const { asyncHandler } = require('../utils/errorHandler');
const nodemailer = require('nodemailer');
const { clearEmailCache } = require('../utils/email');
const { createUploadConfig } = require('../utils/upload');
const { encryptField, decryptField } = require('../utils/crypto');

const siteUpload = createUploadConfig('site', 5 * 1024 * 1024);

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
  if (err instanceof require('multer').MulterError) {
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
    content: '{"siteName":"兽剧聚合平台","navLogo":"","welcomeTitle":"欢迎来到兽剧聚合平台","welcomeSubtitle":"发现和追踪你喜爱的兽剧内容","favicon":"","browserTitle":"兽剧聚合平台","pwaName":"兽剧聚合平台","pwaShortName":"兽剧","pwaDescription":"兽剧内容聚合平台 - 发现和追踪你喜爱的兽剧内容","pwaIcon192":"","pwaIcon512":"","pwaMaskableIcon":"","pwaBackgroundColor":"#0f172a","pwaThemeColor":"#6366f1","backgroundImage":"","backgroundEnabled":false,"backgroundOpacity":30,"backgroundBlur":0}'
  },
  email: {
    key: 'email',
    title: '邮件服务',
    content: '{"host":"","port":"465","user":"","pass":"","fromName":"兽剧聚合平台","enabled":false}'
  }
};

// 公开 PWA manifest 端点：根据站点设置动态返回 manifest，使浏览器安装提示展示自定义名称和图标
router.get('/pwa-manifest', asyncHandler(async (req, res) => {
  let settingsData = null;
  try {
    let content = await SiteContent.findOne({ key: 'settings' });
    if (!content && DEFAULT_CONTENT.settings) {
      content = await SiteContent.create(DEFAULT_CONTENT.settings);
    }
    if (content && content.content) {
      settingsData = JSON.parse(content.content);
    }
  } catch {}

  const s = settingsData || {};
  const pwaName = s.pwaName || s.siteName || '兽剧聚合平台';
  const pwaShortName = s.pwaShortName || (pwaName || '').slice(0, 12);
  const pwaDescription = s.pwaDescription || '兽剧内容聚合平台 - 发现和追踪你喜爱的兽剧内容';
  const pwaThemeColor = s.pwaThemeColor || '#6366f1';
  const pwaBackgroundColor = s.pwaBackgroundColor || '#0f172a';
  const pwaIcon192 = s.pwaIcon192 || '/icon-192x192.png';
  const pwaIcon512 = s.pwaIcon512 || '/icon-512x512.png';
  const pwaMaskableIcon = s.pwaMaskableIcon || pwaIcon512;

  const manifest = {
    name: pwaName,
    short_name: pwaShortName,
    description: pwaDescription,
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: pwaBackgroundColor,
    theme_color: pwaThemeColor,
    categories: ['entertainment', 'social'],
    scope: '/',
    icons: [
      { src: pwaIcon192, sizes: '192x192', type: 'image/png' },
      { src: pwaIcon512, sizes: '512x512', type: 'image/png' },
      { src: pwaMaskableIcon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: '最新剧集', short_name: '最新', url: '/?tab=latest', icons: [{ src: pwaIcon192, sizes: '192x192' }] },
      { name: '搜索', short_name: '搜索', url: '/?action=search', icons: [{ src: pwaIcon192, sizes: '192x192' }] }
    ],
  };

  res.set('Content-Type', 'application/manifest+json');
  res.set('Cache-Control', 'public, max-age=300');
  res.json(manifest);
}));

router.get('/:key', (req, res, next) => {
  const sensitiveKeys = ['email'];
  if (sensitiveKeys.includes(req.params.key)) {
    return adminProtect(req, res, next);
  }
  next();
}, asyncHandler(async (req, res) => {
  let content = await SiteContent.findOne({ key: req.params.key });
  if (!content && DEFAULT_CONTENT[req.params.key]) {
    content = await SiteContent.create(DEFAULT_CONTENT[req.params.key]);
  }
  if (!content) {
    return res.status(404).json({ message: 'Content not found' });
  }
  if (req.params.key === 'email' && content.content) {
    try {
      const data = JSON.parse(content.content);
      if (data.pass) {
        data.pass = decryptField(data.pass);
        content = { ...content.toObject(), content: JSON.stringify(data) };
      }
    } catch {}
  }
  res.json(content);
}));

router.put('/:key', superAdminProtect, asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  let processedContent = content;
  if (req.params.key === 'email' && content) {
    try {
      const data = JSON.parse(content);
      if (data.pass) {
        data.pass = encryptField(data.pass);
        processedContent = JSON.stringify(data);
      }
    } catch {}
  }
  const updated = await SiteContent.findOneAndUpdate(
    { key: req.params.key },
    { title, content: processedContent, updatedAt: Date.now() },
    { new: true, upsert: true, runValidators: true }
  );
  if (req.params.key === 'email') {
    clearEmailCache();
  }
  res.json(updated);
}));

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
    res.status(400).json({ message: '邮件发送失败，请检查邮件服务配置' });
  }
});

module.exports = router;
