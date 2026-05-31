const mongoose = require('mongoose');

const ApiUsageSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  method: { type: String, default: '' },
  count: { type: Number, default: 0 },
  date: { type: String, required: true }
});

ApiUsageSchema.index({ endpoint: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ApiUsage', ApiUsageSchema);
