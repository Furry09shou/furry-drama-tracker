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
// TTL 索引：观看历史 365 天后自动过期清理，防止 History 集合无限增长
HistorySchema.index({ lastWatched: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('History', HistorySchema);
