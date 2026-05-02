const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const https = require('https');
const protect = require('../middlewares/auth');
const adminProtect = require('../middlewares/adminAuth');
const { validatePassword } = require('../middlewares/security');
const { sendPasswordResetEmail } = require('../utils/email');

const getIpRegion = (ip) => {
  return new Promise((resolve) => {
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
      resolve('本地');
      return;
    }
    const url = `https://ipapi.co/${ip}/json/`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const parts = [];
          if (json.country_name) parts.push(json.country_name);
          if (json.region) parts.push(json.region);
          if (json.city) parts.push(json.city);
          resolve(parts.length > 0 ? parts.join(' · ') : '未知');
        } catch {
          resolve('未知');
        }
      });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve('未知');
    });
    req.on('error', () => {
      resolve('未知');
    });
  });
};

const parseUserAgent = (ua) => {
  const result = { browser: '', browserVersion: '', os: '', osVersion: '', deviceType: '桌面端', deviceModel: '' };

  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    result.deviceType = '移动端';
  } else if (/Tablet/i.test(ua)) {
    result.deviceType = '平板';
  }

  if (/Edg\/(\d+)/.test(ua)) {
    result.browser = 'Microsoft Edge';
    result.browserVersion = ua.match(/Edg\/(\d+[\.\d]*)/)?.[1] || '';
  } else if (/Chrome\/(\d+)/.test(ua) && !/Edg/.test(ua)) {
    result.browser = 'Google Chrome';
    result.browserVersion = ua.match(/Chrome\/(\d+[\.\d]*)/)?.[1] || '';
  } else if (/Firefox\/(\d+)/.test(ua)) {
    result.browser = 'Mozilla Firefox';
    result.browserVersion = ua.match(/Firefox\/(\d+[\.\d]*)/)?.[1] || '';
  } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
    result.browser = 'Apple Safari';
    result.browserVersion = ua.match(/Version\/(\d+[\.\d]*)/)?.[1] || '';
  }

  if (/Windows NT (\d+[\.\d]*)/.test(ua)) {
    result.os = 'Windows';
    const v = ua.match(/Windows NT (\d+[\.\d]*)/)?.[1];
    const winMap = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
    result.osVersion = winMap[v] || v || '';
  } else if (/Mac OS X (\d+[._\d]*)/.test(ua)) {
    result.os = 'macOS';
    result.osVersion = (ua.match(/Mac OS X (\d+[._\d]*)/)?.[1] || '').replace(/_/g, '.');
  } else if (/Android (\d+[\.\d]*)/.test(ua)) {
    result.os = 'Android';
    result.osVersion = ua.match(/Android (\d+[\.\d]*)/)?.[1] || '';
    const buildMatch = ua.match(/;\s*([^;)]+)\s*Build\//);
    if (buildMatch) result.deviceModel = buildMatch[1].trim();
  } else if (/iPhone OS (\d+[_\d]*)/.test(ua)) {
    result.os = 'iOS';
    result.osVersion = (ua.match(/iPhone OS (\d+[_\d]*)/)?.[1] || '').replace(/_/g, '.');
    result.deviceModel = 'iPhone';
  } else if (/iPad/.test(ua)) {
    result.os = 'iPadOS';
    result.osVersion = (ua.match(/CPU OS (\d+[_\d]*)/)?.[1] || '').replace(/_/g, '.');
    result.deviceModel = 'iPad';
  } else if (/Linux/.test(ua)) {
    result.os = 'Linux';
  }

  return result;
};

router.post('/register', async (req, res) => {
  const { username, email, password, deviceInfo } = req.body;
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);
  
  try {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    
    const user = await User.create({
      username,
      email,
      password,
      deviceInfo: {
        browser: deviceInfo?.browser || parsed.browser,
        browserVersion: deviceInfo?.browserVersion || parsed.browserVersion,
        os: deviceInfo?.os || parsed.os,
        osVersion: deviceInfo?.osVersion || parsed.osVersion,
        deviceType: deviceInfo?.deviceType || parsed.deviceType,
        deviceModel: deviceInfo?.deviceModel || parsed.deviceModel || '',
        screenWidth: deviceInfo?.screenWidth || 0,
        screenHeight: deviceInfo?.screenHeight || 0,
        language: deviceInfo?.language || req.headers['accept-language']?.split(',')[0] || '',
        userAgent: ua,
        carrier: deviceInfo?.carrier || ''
      },
      lastLoginAt: new Date(),
      lastLoginIp: req.ip || req.connection.remoteAddress || '',
      lastLoginRegion: await getIpRegion(req.ip || req.connection.remoteAddress || '')
    });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: field === 'email' ? 'User already exists' : 'Username already taken' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, deviceInfo } = req.body;
  const ua = req.headers['user-agent'] || '';
  const parsed = parseUserAgent(ua);
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.deletionRequestedAt) {
      const deleteAt = new Date(user.deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() >= deleteAt) {
        await User.findByIdAndDelete(user._id);
        await require('../models/Follow').deleteMany({ userId: user._id });
        await require('../models/History').deleteMany({ userId: user._id });
        await require('../models/Notification').deleteMany({ userId: user._id });
        return res.status(400).json({ message: '该账号已被注销' });
      }
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.deviceInfo = {
      browser: deviceInfo?.browser || parsed.browser,
      browserVersion: deviceInfo?.browserVersion || parsed.browserVersion,
      os: deviceInfo?.os || parsed.os,
      osVersion: deviceInfo?.osVersion || parsed.osVersion,
      deviceType: deviceInfo?.deviceType || parsed.deviceType,
      deviceModel: deviceInfo?.deviceModel || parsed.deviceModel || '',
      screenWidth: deviceInfo?.screenWidth || 0,
      screenHeight: deviceInfo?.screenHeight || 0,
      language: deviceInfo?.language || req.headers['accept-language']?.split(',')[0] || '',
      userAgent: ua,
      carrier: deviceInfo?.carrier || ''
    };
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || req.connection.remoteAddress || '';
    user.lastLoginRegion = await getIpRegion(req.ip || req.connection.remoteAddress || '');
    await user.save();
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: '当前密码不正确' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/admin/change-password', adminProtect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: '当前密码不正确' });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: '如果该邮箱已注册，重置链接已发送至邮箱' });
    }
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset-password' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: '如果该邮箱已注册，重置链接已发送至邮箱' });
  } catch (error) {
    res.json({ message: '如果该邮箱已注册，重置链接已发送至邮箱' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'reset-password') {
      return res.status(400).json({ message: '无效的重置令牌' });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: '密码重置成功' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: '重置链接已过期，请重新获取' });
    }
    res.status(400).json({ message: '无效的重置令牌' });
  }
});

router.post('/request-deletion', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (user.deletionRequestedAt) {
      return res.status(400).json({ message: '已提交过注销申请' });
    }
    user.deletionRequestedAt = new Date();
    await user.save();
    const deleteAt = new Date(user.deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    res.json({
      message: '注销申请已提交',
      deletionRequestedAt: user.deletionRequestedAt,
      deleteAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/cancel-deletion', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (!user.deletionRequestedAt) {
      return res.status(400).json({ message: '没有注销申请' });
    }
    user.deletionRequestedAt = null;
    await user.save();
    res.json({ message: '注销申请已取消' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/deletion-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    if (!user.deletionRequestedAt) {
      return res.json({ requested: false });
    }
    const deleteAt = new Date(user.deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    res.json({
      requested: true,
      deletionRequestedAt: user.deletionRequestedAt,
      deleteAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;