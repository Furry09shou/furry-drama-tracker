const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    default: null
  },
  episodeTitle: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['new_episode', 'status_change', 'feedback_reply', 'friend_link_apply', 'friend_link_status'],
    default: 'new_episode'
  },
  link: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

NotificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
