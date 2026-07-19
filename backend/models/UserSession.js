const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // 兼容旧字段：原 access token 的哈希。双 Token 改造后访问令牌不再入库，
  // 此字段保留仅为旧 session 仍可正常登出，不再写入新 session。
  tokenHash: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  // 双 Token 机制：refresh token 的 sha256 哈希。
  // 每次刷新轮换时更新此字段；重用检测依赖 isActive + refreshTokenHash 不匹配判断。
  refreshTokenHash: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  },
  deviceInfo: {
    browser: { type: String, default: '' },
    browserVersion: { type: String, default: '' },
    os: { type: String, default: '' },
    osVersion: { type: String, default: '' },
    deviceType: { type: String, default: '' },
    deviceModel: { type: String, default: '' },
    screenWidth: { type: Number, default: 0 },
    screenHeight: { type: Number, default: 0 },
    language: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    deviceName: { type: String, default: '' }
  },
  ip: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  loginAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  logoutAt: {
    type: Date,
    default: null
  }
});

UserSessionSchema.index({ tokenHash: 1, isActive: 1 });
UserSessionSchema.index({ refreshTokenHash: 1, isActive: 1 });

module.exports = mongoose.model('UserSession', UserSessionSchema);
