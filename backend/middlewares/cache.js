const cache = new Map();
const CACHE_DURATION = 3600000; // 1小时

const setCache = (key, value) => {
  cache.set(key, {
    value,
    timestamp: Date.now()
  });
};

const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
};

const clearCache = (key) => {
  cache.delete(key);
};

module.exports = { setCache, getCache, clearCache };