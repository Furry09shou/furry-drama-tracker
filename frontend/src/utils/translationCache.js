const CACHE_KEY = 'translation_cache_v2';
const CACHE_TTL_KEY = 'translation_cache_ttl_v2';
const MAX_CACHE_ENTRIES = 2000;
const CACHE_TTL = 24 * 60 * 60 * 1000;

const translationCache = (() => {
  try {
    localStorage.removeItem('translation_cache');
    localStorage.removeItem('translation_cache_ttl');
  } catch {}
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    const ttlMap = localStorage.getItem(CACHE_TTL_KEY);
    if (saved && ttlMap) {
      const parsed = JSON.parse(saved);
      const ttls = JSON.parse(ttlMap);
      const now = Date.now();
      const filtered = {};
      for (const key of Object.keys(parsed)) {
        if (ttls[key] && now - ttls[key] < CACHE_TTL) {
          filtered[key] = parsed[key];
        }
      }
      return filtered;
    }
  } catch {}
  return {};
})();

const ttlMap = (() => {
  try {
    const saved = localStorage.getItem(CACHE_TTL_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
})();

const persistCache = (() => {
  let timer = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const keys = Object.keys(translationCache);
        if (keys.length > MAX_CACHE_ENTRIES) {
          const toRemove = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
          toRemove.forEach(k => {
            delete translationCache[k];
            delete ttlMap[k];
          });
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
        localStorage.setItem(CACHE_TTL_KEY, JSON.stringify(ttlMap));
      } catch {}
    }, 500);
  };
})();

export const setCache = (key, value) => {
  translationCache[key] = value;
  ttlMap[key] = Date.now();
  persistCache();
};

export default translationCache;
