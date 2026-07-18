const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const User = require('../models/User');
const CreatorProfile = require('../models/CreatorProfile');

dotenv.config();

const generateSecurePassword = () => {
  return crypto.randomBytes(12).toString('base64url').slice(0, 20);
};

// 为指定用户创建初始状态的创作者主页（若不存在）
const ensureCreatorProfile = async (user) => {
  try {
    const existing = await CreatorProfile.findOne({ adminId: user._id });
    if (existing) {
      console.log('创作者主页已存在:', existing.displayName);
      return;
    }
    await CreatorProfile.create({
      adminId: user._id,
      displayName: user.username || '管理员',
      bio: '站点管理员，负责内容审核与平台运营。',
      socialLinks: {}
    });
    console.log('已为超级管理员创建初始状态的创作者主页');
  } catch (e) {
    console.warn('创建初始创作者主页失败（不阻断流程）:', e.message);
  }
};

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('数据库连接成功');

    // 检查是否已存在超级管理员
    const existingSuper = await User.findOne({ role: 'superadmin' });
    if (existingSuper) {
      console.log('超级管理员已存在:', existingSuper.email);
      await ensureCreatorProfile(existingSuper);
      process.exit(0);
    }

    // 检查邮箱是否被占用
    const email = process.env.SUPERADMIN_EMAIL || 'admin@furry09.com';
    const accountId = process.env.SUPERADMIN_ACCOUNT_ID || 'admin';
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      // 已有该邮箱用户，直接提升为超级管理员
      emailExists.role = 'superadmin';
      await emailExists.save();
      console.log('已将现有用户提升为超级管理员:', email);
      await ensureCreatorProfile(emailExists);
      process.exit(0);
    }

    // 从环境变量读取密码，未设置则生成随机安全密码
    const password = process.env.SUPERADMIN_PASSWORD || generateSecurePassword();

    const admin = await User.create({
      accountId,
      username: 'admin',
      email,
      password,
      role: 'superadmin',
      isEmailVerified: true
    });

    await ensureCreatorProfile(admin);

    console.log('超级管理员创建成功!');
    console.log('邮箱:', email);
    console.log('账号ID:', accountId);
    if (process.env.SUPERADMIN_PASSWORD) {
      console.log('密码: (来自 SUPERADMIN_PASSWORD 环境变量)');
    } else {
      console.log('密码:', password);
      console.log('⚠️  请立即修改此密码！这是唯一一次显示，关闭后无法再次查看。');
    }
    process.exit(0);
  } catch (error) {
    console.error('超级管理员创建失败:', error);
    process.exit(1);
  }
};

seedAdmin();
