const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('数据库连接成功');

    // 检查是否已存在超级管理员
    const existingSuper = await User.findOne({ role: 'superadmin' });
    if (existingSuper) {
      console.log('超级管理员已存在:', existingSuper.email);
      process.exit(0);
    }

    // 检查邮箱是否被占用
    const email = 'admin@furry09.com';
    const accountId = 'admin';
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      // 已有该邮箱用户，直接提升为超级管理员
      emailExists.role = 'superadmin';
      await emailExists.save();
      console.log('已将现有用户提升为超级管理员:', email);
      process.exit(0);
    }

    const admin = await User.create({
      accountId,
      username: 'admin',
      email,
      password: 'admin123',
      role: 'superadmin',
      isEmailVerified: true
    });

    console.log('超级管理员创建成功!');
    console.log('邮箱: admin@furry09.com');
    console.log('账号ID: admin');
    console.log('密码: admin123');
    process.exit(0);
  } catch (error) {
    console.error('超级管理员创建失败:', error);
    process.exit(1);
  }
};

seedAdmin();
