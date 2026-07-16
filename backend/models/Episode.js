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
    required: true
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
  reviewStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved'
  },
  reviewNote: {
    type: String,
    default: ''
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
