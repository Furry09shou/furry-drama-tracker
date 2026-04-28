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
  lastWatched: {
    type: Date,
    default: Date.now
  }
});

HistorySchema.index({ userId: 1, episodeId: 1 }, { unique: true });

module.exports = mongoose.model('History', HistorySchema);
