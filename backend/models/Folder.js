const mongoose = require('mongoose');

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
  sortOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

FolderSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Folder', FolderSchema);
