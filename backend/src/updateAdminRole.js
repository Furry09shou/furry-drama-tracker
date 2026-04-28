const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

dotenv.config();

const updateAdminRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('数据库连接成功');

    // 更新现有管理员为超级管理员
    const admin = await Admin.findOneAndUpdate(
      { username: 'admin' },
      { role: 'superadmin' },
      { new: true }
    );

    if (admin) {
      console.log('管理员角色更新成功!');
      console.log('用户名: admin');
      console.log('角色: superadmin');
    } else {
      console.log('未找到管理员账号');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  }
};

updateAdminRole();