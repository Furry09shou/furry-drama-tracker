const ApiUsage = require('../models/ApiUsage');

const buffer = [];
const FLUSH_INTERVAL = 60 * 1000;
const MAX_BUFFER_SIZE = 50;

const flushBuffer = async () => {
  if (buffer.length === 0) return;
  const items = buffer.splice(0, buffer.length);
  const bulkOps = {};
  for (const item of items) {
    const key = `${item.endpoint}|${item.date}`;
    if (!bulkOps[key]) {
      bulkOps[key] = { endpoint: item.endpoint, date: item.date, count: 0 };
    }
    bulkOps[key].count += 1;
  }
  try {
    await Promise.all(Object.values(bulkOps).map(op =>
      ApiUsage.findOneAndUpdate(
        { endpoint: op.endpoint, date: op.date },
        { $inc: { count: op.count } },
        { upsert: true }
      ).catch(() => {})
    ));
  } catch (e) {}
};

setInterval(flushBuffer, FLUSH_INTERVAL);

const trackApiUsage = (req, res, next) => {
  res.on('finish', () => {
    if (!req.path.startsWith('/api/')) return;
    const endpoint = req.route ? `${req.method} ${req.route.path}` : `${req.method} ${req.path}`;
    const today = new Date().toISOString().split('T')[0];
    buffer.push({ endpoint, date: today });
    if (buffer.length >= MAX_BUFFER_SIZE) {
      setImmediate(flushBuffer);
    }
  });
  next();
};

module.exports = trackApiUsage;
