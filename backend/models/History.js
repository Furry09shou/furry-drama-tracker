const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    required: true
  },
  watchedEpisodes: {
    type: [Number],
    default: []
  },
  lastWatchedEpisodeNumber: {
    type: Number,
    default: null
  },
  lastWatched: {
    type: Date,
    default: Date.now
  }
});

HistorySchema.index({ userId: 1, episodeId: 1 }, { unique: true });
HistorySchema.index({ lastWatched: 1 });

module.exports = mongoose.model('History', HistorySchema);
