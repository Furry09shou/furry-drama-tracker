const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminName: {
    type: String,
    required: true
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ adminId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
