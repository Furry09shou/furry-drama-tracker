const mongoose = require('mongoose');

const FriendLinkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
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
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

FriendLinkSchema.index({ order: 1 });

module.exports = mongoose.model('FriendLink', FriendLinkSchema);
