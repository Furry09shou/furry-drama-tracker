const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
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
  adminAccess: {
    type: Boolean,
    default: false
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 密码加密
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 密码验证
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);