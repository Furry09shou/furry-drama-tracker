const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  adminName: {
    type: String,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  userName: {
    type: String,
  },
  action: {
    type: String,
    required: true
  },
  target: {
    type: String,
    default: ''
  },
  details: {
    type: String,
    default: ''
  },
  ip: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ adminId: 1 });
AuditLogSchema.index({ userId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
