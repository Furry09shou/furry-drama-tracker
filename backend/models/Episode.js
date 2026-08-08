const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  titleEn: {
    type: String,
    default: ''
  },
  titleJa: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  descriptionEn: {
    type: String,
    default: ''
  },
  descriptionJa: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    required: true
  },
  totalEpisodes: {
    type: Number,
    default: null,
    set: v => v === null || v === undefined || v === '' ? null : Number(v)
  },
  currentEpisodes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'upcoming'],
    default: 'ongoing'
  },
  category: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    default: []
  },
  platformLinks: {
    type: Map,
    of: String
  },
  views: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    default: 0
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  updateDay: {
    type: String,
    default: ''
  },
  premiereDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hideCreator: {
    type: Boolean,
    default: false
  },
  allowedEditors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  customAuthors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // 剧集独立的 QQ 群链接（非必填）：填写后剧集详情页展示「联系QQ群」跳转入口
  qqGroupLink: {
    type: String,
    default: ''
  },
  reviewStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved'
  },
  reviewNote: {
    type: String,
    default: ''
  },
  // 审核人：记录谁审核的，便于追溯。approved/pending/rejected 状态变更时更新
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
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

EpisodeSchema.index({ reviewStatus: 1, updatedAt: -1 });
EpisodeSchema.index({ tags: 1 });
EpisodeSchema.index({ reviewStatus: 1, averageRating: -1 });
EpisodeSchema.index({ reviewStatus: 1, views: -1 });
EpisodeSchema.index({ status: 1, premiereDate: 1 });
EpisodeSchema.index({ title: 'text', description: 'text', titleEn: 'text' });

module.exports = mongoose.model('Episode', EpisodeSchema);
