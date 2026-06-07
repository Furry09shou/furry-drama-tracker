const mongoose = require('mongoose');

const ensureIndexes = async () => {
  try {
    const db = mongoose.connection.db;

    // 使用 background: true 避免阻塞，使用 name 避免冲突
    // 某些集合已有 unique 索引（如 ratings/follows/favorites 的 userId+episodeId），跳过
    const indexOps = [
      { collection: 'histories', index: { userId: 1, lastWatched: -1 }, name: 'userId_1_lastWatched_-1' },
      { collection: 'notifications', index: { userId: 1, isRead: 1 }, name: 'userId_1_isRead_1' },
      { collection: 'adminsessions', index: { adminId: 1, isActive: 1 }, name: 'adminId_1_isActive_1' },
      { collection: 'usersessions', index: { userId: 1, isActive: 1 }, name: 'userId_1_isActive_1' },
      { collection: 'episodes', index: { createdBy: 1 }, name: 'createdBy_1' },
      { collection: 'episodes', index: { updatedAt: -1 }, name: 'updatedAt_-1' },
      { collection: 'feedbacks', index: { userId: 1 }, name: 'userId_1' },
      { collection: 'folders', index: { userId: 1, type: 1, name: 1 }, name: 'userId_1_type_1_name_1' },
      { collection: 'usersessions', index: { isActive: 1, lastActiveAt: -1 }, name: 'isActive_1_lastActiveAt_-1' },
      { collection: 'adminsessions', index: { isActive: 1, lastActiveAt: -1 }, name: 'isActive_1_lastActiveAt_-1' },
      { collection: 'episodeversions', index: { episodeId: 1, version: -1 }, name: 'episodeId_1_version_-1' },
      { collection: 'ratings', index: { episodeId: 1 }, name: 'episodeId_1' },
    ];

    for (const op of indexOps) {
      try {
        await db.collection(op.collection).createIndex(op.index, { background: true, name: op.name });
      } catch (e) {
        // 索引已存在则忽略
        if (!e.message.includes('already exists')) {
          console.error(`创建索引失败 (${op.collection}):`, e.message);
        }
      }
    }

    console.log('数据库索引检查完成');
  } catch (error) {
    console.error('索引检查失败:', error.message);
  }
};

module.exports = { ensureIndexes };
