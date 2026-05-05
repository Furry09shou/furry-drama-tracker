const mongoose = require('mongoose');

const SeriesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  episodes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Episode' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Series', SeriesSchema);
