const mongoose = require('mongoose');

const AdminSessionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  adminUsername: {
    type: String,
    required: true
  },
  adminRole: {
    type: String,
    required: true
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
  region: {
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

module.exports = mongoose.model('AdminSession', AdminSessionSchema);
