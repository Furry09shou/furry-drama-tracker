const cache = new Map();
const CACHE_DURATION = 3600000;
const MAX_CACHE_SIZE = 200;

const setCache = (key, value) => {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
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

const clearCacheByPrefix = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

module.exports = { setCache, getCache, clearCache, clearCacheByPrefix };

// 定期清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache) {
    if (now - item.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000);
