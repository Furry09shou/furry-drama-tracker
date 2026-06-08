const mongoose = require('mongoose');
const crypto = require('crypto');

const FolderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['follow', 'favorite'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  shareToken: {
    type: String,
    default: null,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

FolderSchema.index({ userId: 1, type: 1 });

FolderSchema.methods.generateShareToken = function() {
  this.shareToken = crypto.randomBytes(12).toString('hex');
  return this.shareToken;
};

FolderSchema.methods.revokeShareToken = function() {
  this.shareToken = null;
};

module.exports = mongoose.model('Folder', FolderSchema);
