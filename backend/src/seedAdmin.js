const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('数据库连接成功');

    const adminExists = await Admin.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('管理员已存在');
      process.exit(0);
    }

    const admin = await Admin.create({
    username: 'admin',
    password: 'admin123',
    role: 'superadmin'
  });

    console.log('管理员创建成功!');
    console.log('用户名: admin');
    console.log('密码: admin123');
    process.exit(0);
  } catch (error) {
    console.error('管理员创建失败:', error);
    process.exit(1);
  }
};

seedAdmin();