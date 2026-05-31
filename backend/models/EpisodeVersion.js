const mongoose = require('mongoose');

const EpisodeVersionSchema = new mongoose.Schema({
  episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true },
  version: { type: Number, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  changeSummary: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

EpisodeVersionSchema.index({ episodeId: 1, version: -1 });

module.exports = mongoose.model('EpisodeVersion', EpisodeVersionSchema);
