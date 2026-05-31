const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  nameEn: {
    type: String,
    default: ''
  },
  nameJa: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Category', CategorySchema);
