const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['episode', 'creator'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['inappropriate', 'copyright', 'spam', 'misleading', 'other']
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolveNote: {
    type: String,
    default: ''
  }
}, { timestamps: true });

ReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);
