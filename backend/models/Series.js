const mongoose = require('mongoose');

const SeriesSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameEn: { type: String, default: '' },
  nameJa: { type: String, default: '' },
  description: { type: String, default: '' },
  descriptionEn: { type: String, default: '' },
  descriptionJa: { type: String, default: '' },
  episodes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Episode' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Series', SeriesSchema);
