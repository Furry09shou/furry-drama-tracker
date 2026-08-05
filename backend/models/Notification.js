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
  episodeTitleEn: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['new_episode', 'status_change', 'feedback_reply', 'friend_link_apply', 'friend_link_status', 'announcement', 'review_result', 'profile_review', 'report_result'],
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
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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
// TTL 索引：通知 90 天后自动过期清理，防止 Notification 集合无限增长
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', NotificationSchema);
