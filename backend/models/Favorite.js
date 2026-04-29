const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    required: true
  }
}, { timestamps: true });

FavoriteSchema.index({ userId: 1, episodeId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);
