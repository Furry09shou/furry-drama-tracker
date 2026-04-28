const mongoose = require('mongoose');

const SingleEpisodeSchema = new mongoose.Schema({
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    required: true
  },
  episodeNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    default: ''
  },
  platformLinks: {
    type: Map,
    of: String
  },
  views: {
    type: Number,
    default: 0
  },
  releaseDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SingleEpisode', SingleEpisodeSchema);