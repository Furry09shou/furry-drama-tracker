const ApiUsage = require('../models/ApiUsage');

const trackApiUsage = (req, res, next) => {
  res.on('finish', () => {
    if (!req.path.startsWith('/api/')) return;
    const endpoint = req.route ? `${req.method} ${req.route.path}` : `${req.method} ${req.path}`;
    const today = new Date().toISOString().split('T')[0];
    ApiUsage.findOneAndUpdate(
      { endpoint, date: today },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    ).catch(() => {});
  });
  next();
};

module.exports = trackApiUsage;
