const mongoose = require('mongoose');

const CreatorProfileSchema = new mongoose.Schema({
  // 创作者用户 ID（曾用名 adminId，语义易误解为"管理员 ID"，已重命名为 creatorId）
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  socialLinks: {
    type: Map,
    of: String,
    default: {}
  },
  // QQ 群链接：创作者可配置自己的 QQ 群，剧集详情页和创作者主页展示「联系QQ群」跳转入口
  qqGroupLink: {
    type: String,
    default: ''
  },
  // 审核状态：创作者修改主页后变为 pending，管理员审核通过后才对外生效
  reviewStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved'
  },
  reviewNote: {
    type: String,
    default: ''
  },
  // 待审核的修改内容：创作者提交后暂存于此，审核通过后才会应用到上方正式字段
  pendingChanges: {
    displayName: { type: String, default: '' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    socialLinks: { type: Map, of: String, default: {} },
    qqGroupLink: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CreatorProfile', CreatorProfileSchema);
