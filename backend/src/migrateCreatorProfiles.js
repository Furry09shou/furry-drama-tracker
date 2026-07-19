const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const CreatorProfile = require('../models/CreatorProfile');

dotenv.config();

// 为所有 creator/admin/superadmin 角色但没有 CreatorProfile 的用户补建初始状态创作者主页
const migrateCreatorProfiles = async () => {
  try {
    const users = await User.find({
      role: { $in: ['creator', 'admin', 'superadmin'] }
    }).select('_id username role');

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      const existing = await CreatorProfile.findOne({ adminId: user._id });
      if (existing) {
        skipped += 1;
        continue;
      }

      const defaultBio = user.role === 'superadmin'
        ? '站点管理员，负责内容审核与平台运营。'
        : '这位创作者还没有填写个人简介。';

      try {
        await CreatorProfile.create({
          adminId: user._id,
          displayName: user.username || '创作者',
          bio: defaultBio,
          socialLinks: {}
        });
        created += 1;
        console.log(`已为 ${user.username} (${user.role}) 创建创作者主页`);
      } catch (e) {
        if (e.code !== 11000) console.warn('跳过:', user.username, e.message);
        skipped += 1;
      }
    }

    console.log(`迁移完成：新建 ${created} 个，已存在跳过 ${skipped} 个`);
  } catch (error) {
    console.error('迁移创作者主页失败:', error);
  }
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('数据库连接成功');
    await migrateCreatorProfiles();
    process.exit(0);
  } catch (error) {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  }
};

// 支持作为独立脚本运行，也可被 require 调用
if (require.main === module) {
  run();
}

module.exports = { migrateCreatorProfiles };
