const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const superAdminProtect = require('../middlewares/superAdminAuth');
const adminProtect = require('../middlewares/adminAuth');
const { validatePassword } = require('../middlewares/security');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const admin = await Admin.findOne({ username });
    if (admin) {
      const isMatch = await admin.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
      });
      
      return res.json({
        _id: admin._id,
        username: admin.username,
        role: admin.role,
        token
      });
    }

    const user = await User.findOne({ email: username });
    if (user && user.adminAccess) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      if (!user.isEmailVerified) {
        return res.status(403).json({ message: '请先验证邮箱' });
      }
      const token = jwt.sign({ id: user._id, role: 'user-admin', userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
      });
      return res.json({
        _id: user._id,
        username: user.username,
        role: 'user-admin',
        token
      });
    }
    
    return res.status(400).json({ message: 'Invalid credentials' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/list', superAdminProtect, async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/register', superAdminProtect, async (req, res) => {
  const { username, password, role = 'admin' } = req.body;
  
  try {
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const adminExists = await Admin.findOne({ username });
    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    
    const admin = await Admin.create({
      username,
      password,
      role
    });
    
    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    res.json({
      _id: admin._id,
      username: admin.username,
      role: admin.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', superAdminProtect, async (req, res) => {
  try {
    if (req.admin._id.toString() === req.params.id) {
      return res.status(400).json({ message: '不能删除自己的账号' });
    }
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: '管理员不存在' });
    }
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: '管理员已删除' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', adminProtect, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', superAdminProtect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    await User.findByIdAndDelete(req.params.id);
    const Follow = require('../models/Follow');
    const History = require('../models/History');
    const Notification = require('../models/Notification');
    const Favorite = require('../models/Favorite');
    const Rating = require('../models/Rating');
    const Report = require('../models/Report');
    const Feedback = require('../models/Feedback');
    await Follow.deleteMany({ userId: req.params.id });
    await History.deleteMany({ userId: req.params.id });
    await Notification.deleteMany({ userId: req.params.id });
    await Favorite.deleteMany({ userId: req.params.id });
    await Report.deleteMany({ reporter: req.params.id });
    await Feedback.deleteMany({ userId: req.params.id });
    const userRatings = await Rating.find({ userId: req.params.id });
    await Rating.deleteMany({ userId: req.params.id });
    for (const r of userRatings) {
      const stats = await Rating.aggregate([
        { $match: { episodeId: r.episodeId } },
        { $group: { _id: '$episodeId', avg: { $avg: '$score' }, count: { $sum: 1 } } }
      ]);
      if (stats.length > 0) {
        await require('../models/Episode').findByIdAndUpdate(r.episodeId, {
          averageRating: Math.round(stats[0].avg * 10) / 10,
          ratingCount: stats[0].count
        });
      } else {
        await require('../models/Episode').findByIdAndUpdate(r.episodeId, {
          averageRating: 0,
          ratingCount: 0
        });
      }
    }
    res.json({ message: '用户已删除' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/role/:id', superAdminProtect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['superadmin', 'admin', 'creator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (req.admin._id.toString() === req.params.id) {
      return res.status(400).json({ message: '不能修改自己的角色' });
    }
    if (role === 'superadmin') {
      return res.status(400).json({ message: '不能通过此接口设置超级管理员' });
    }
    const targetAdmin = await Admin.findById(req.params.id);
    if (!targetAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (targetAdmin.role === 'superadmin') {
      const superAdminCount = await Admin.countDocuments({ role: 'superadmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: '不能降级最后一个超级管理员' });
      }
    }
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/creators', adminProtect, async (req, res) => {
  try {
    const creators = await Admin.find({ role: 'creator' }).select('-password');
    res.json(creators);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-password', adminProtect, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: '请输入密码' });
  try {
    if (req.admin.role === 'user-admin') {
      const user = await User.findById(req.admin._id);
      if (!user) return res.status(404).json({ message: 'Not found' });
      const isMatch = await user.matchPassword(password);
      if (!isMatch) return res.status(400).json({ message: '密码错误' });
      return res.json({ verified: true });
    }
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json({ message: 'Not found' });
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: '密码错误' });
    res.json({ verified: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/user-admin-access/:id', superAdminProtect, async (req, res) => {
  try {
    const { adminAccess } = req.body;
    if (typeof adminAccess !== 'boolean') {
      return res.status(400).json({ message: '参数错误' });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    user.adminAccess = adminAccess;
    await user.save();
    res.json({ message: adminAccess ? '已授予管理后台权限' : '已撤销管理后台权限', adminAccess });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/user-admin-change-password', adminProtect, async (req, res) => {
  if (req.admin.role !== 'user-admin') {
    return res.status(403).json({ message: '无权限' });
  }
  const { currentPassword, newPassword } = req.body;
  try {
    const { validatePassword } = require('../middlewares/security');
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
    const user = await User.findById(req.admin._id);
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

module.exports = router;