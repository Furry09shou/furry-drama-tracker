const mongoose = require('mongoose');

const SavedFolderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shareToken: {
    type: String,
    required: true,
    index: true
  },
  folderName: {
    type: String,
    required: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  folderType: {
    type: String,
    enum: ['follow', 'favorite'],
    default: 'favorite'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

SavedFolderSchema.index({ userId: 1, shareToken: 1 }, { unique: true });

module.exports = mongoose.model('SavedFolder', SavedFolderSchema);
