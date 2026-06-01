const mongoose = require('mongoose');

const UserSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
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

module.exports = mongoose.model('UserSession', UserSessionSchema);
