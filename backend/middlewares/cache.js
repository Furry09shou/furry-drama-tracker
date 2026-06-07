const config = require('../src/config');
const CACHE_DURATION = config.CACHE_DURATION;
const MAX_CACHE_SIZE = config.CACHE_MAX_SIZE;

const cache = new Map();

const setCache = (key, value) => {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, { value, timestamp: Date.now() });
};

const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  // LRU: 访问时移到末尾
  cache.delete(key);
  cache.set(key, item);
  return item.value;
};

const clearCache = (key) => {
  cache.delete(key);
};

const clearCacheByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

module.exports = { setCache, getCache, clearCache, clearCacheByPrefix };

setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache) {
    if (now - item.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000);
