const mongoose = require('mongoose');

const FriendLinkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nameEn: {
    type: String,
    default: ''
  },
  nameJa: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  descriptionEn: {
    type: String,
    default: ''
  },
  descriptionJa: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

FriendLinkSchema.index({ order: 1 });

module.exports = mongoose.model('FriendLink', FriendLinkSchema);
