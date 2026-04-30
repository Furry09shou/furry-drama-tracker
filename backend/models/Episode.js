const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
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
    ref: 'Admin'
  },
  allowedEditors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
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

module.exports = mongoose.model('Episode', EpisodeSchema);
