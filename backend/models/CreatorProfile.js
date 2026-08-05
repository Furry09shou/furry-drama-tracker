const mongoose = require('mongoose');

const CreatorProfileSchema = new mongoose.Schema({
  adminId: {
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
    socialLinks: { type: Map, of: String, default: {} }
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
