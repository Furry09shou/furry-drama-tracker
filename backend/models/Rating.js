const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
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
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  }
}, { timestamps: true });

RatingSchema.index({ userId: 1, episodeId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', RatingSchema);
