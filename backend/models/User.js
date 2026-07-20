const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const accountLockoutPlugin = require('../utils/accountLockout');

const UserSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ''
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
    carrier: { type: String, default: '' }
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastLoginIp: {
    type: String,
    default: ''
  },
  lastLoginRegion: {
    type: String,
    default: ''
  },
  deletionRequestedAt: {
    type: Date,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'creator', 'admin', 'superadmin']
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorBackupCodes: [{
    type: String,
    select: false
  }],
  emailNotificationPrefs: {
    episodeUpdate: { type: Boolean, default: true },
    newDeviceLogin: { type: Boolean, default: true },
    feedbackReply: { type: Boolean, default: true },
    friendLinkStatus: { type: Boolean, default: true },
    friendLinkApply: { type: Boolean, default: true },
    announcement: { type: Boolean, default: true },
  },
  backgroundPrefs: {
    image: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    opacity: { type: Number, default: 30, min: 0, max: 100 },
    blur: { type: Number, default: 0, min: 0, max: 20 },
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 密码加密
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// 密码验证
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// 账户锁定插件
accountLockoutPlugin(UserSchema);

// email和accountId的索引由unique: true自动创建，无需重复声明

module.exports = mongoose.model('User', UserSchema);