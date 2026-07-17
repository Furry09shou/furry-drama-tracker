const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  titleEn: {
    type: String,
    default: '',
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  contentEn: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'maintenance', 'update'],
    default: 'info'
  },
  // 展示渠道开关（发布时自主选择）
  showPopup: {
    type: Boolean,
    default: false
  },
  showBanner: {
    type: Boolean,
    default: false
  },
  sendNotification: {
    type: Boolean,
    default: false
  },
  sendEmail: {
    type: Boolean,
    default: false
  },
  // 弹窗是否可关闭
  dismissible: {
    type: Boolean,
    default: true
  },
  active: {
    type: Boolean,
    default: true
  },
  pinned: {
    type: Boolean,
    default: false
  },
  // 发布与过期时间
  publishAt: {
    type: Date,
    default: Date.now
  },
  expireAt: {
    type: Date,
    default: null
  },
  // 推送状态记录（避免重复发送）
  notificationSent: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  emailSentCount: {
    type: Number,
    default: 0
  },
  link: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

AnnouncementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);
