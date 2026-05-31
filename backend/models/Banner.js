const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  titleEn: {
    type: String,
    default: ''
  },
  titleJa: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  subtitleEn: {
    type: String,
    default: ''
  },
  subtitleJa: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Banner', BannerSchema);
