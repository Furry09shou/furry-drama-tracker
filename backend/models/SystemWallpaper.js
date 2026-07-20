const mongoose = require('mongoose');

const systemWallpaperSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('SystemWallpaper', systemWallpaperSchema);
