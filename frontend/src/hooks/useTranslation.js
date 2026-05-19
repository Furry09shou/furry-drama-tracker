import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const translationCache = {};
const pendingMap = new Map();
const failureCooldown = new Map();
let batchTimer = null;
const batchQueue = [];
const BATCH_DELAY = 200;
const BATCH_MAX = 20;
const MAX_CONCURRENT_BATCHES = 2;
const FAILURE_COOLDOWN_MS = 60000;
let activeBatchCount = 0;
let updateTimer = null;
const pendingUpdates = new Set();

const isValidTranslation = (text) => {
  if (!text || typeof text !== 'string') return false;
  const upper = text.toUpperCase();
  return !upper.includes('MYMEMORY') && !upper.includes('USAGE LIMITS') && !upper.includes('VISIT HTTPS');
};

Object.keys(translationCache).forEach(key => {
  if (!isValidTranslation(translationCache[key])) {
    delete translationCache[key];
  }
});

const scheduleUpdate = (callback) => {
  pendingUpdates.add(callback);
  if (!updateTimer) {
    updateTimer = setTimeout(() => {
      const updates = [...pendingUpdates];
      pendingUpdates.clear();
      updateTimer = null;
      updates.forEach(cb => cb());
    }, 100);
  }
};

const flushBatch = (lang) => {
  if (batchQueue.length === 0) return;
  if (activeBatchCount >= MAX_CONCURRENT_BATCHES) {
    batchTimer = setTimeout(() => flushBatch(lang), BATCH_DELAY);
    return;
  }

  const items = batchQueue.splice(0, BATCH_MAX);
  const texts = items.map(i => i.text);
  activeBatchCount++;

  axios.post('/api/translate/batch', { texts, targetLang: lang }, {
    timeout: 10000,
    skipRedirect: true,
  })
    .then(res => {
      activeBatchCount = Math.max(0, activeBatchCount - 1);
      if (res.data?.translations) {
        res.data.translations.forEach((translated, i) => {
          const cacheKey = items[i].cacheKey;
          if (translated && translated !== items[i].text && isValidTranslation(translated)) {
            translationCache[cacheKey] = translated;
          } else if (translated && !isValidTranslation(translated)) {
            translated = null;
          }
          pendingMap.delete(cacheKey);
          items[i].resolve(translated);
        });
      } else {
        items.forEach(item => {
          pendingMap.delete(item.cacheKey);
          item.resolve(null);
        });
      }
    })
    .catch((err) => {
      activeBatchCount = Math.max(0, activeBatchCount - 1);
      const isRateLimit = err.response?.status === 429;
      const cooldownMs = isRateLimit ? 120000 : FAILURE_COOLDOWN_MS;
      items.forEach(item => {
        failureCooldown.set(item.cacheKey, Date.now() + cooldownMs);
        pendingMap.delete(item.cacheKey);
        item.resolve(null);
      });
    });

  if (batchQueue.length > 0) {
    batchTimer = setTimeout(() => flushBatch(lang), BATCH_DELAY);
  } else {
    batchTimer = null;
  }
};

const queueTranslation = (text, lang) => {
  const cacheKey = `${lang}:${text}`;
  if (translationCache[cacheKey]) return Promise.resolve(translationCache[cacheKey]);
  if (pendingMap.has(cacheKey)) return pendingMap.get(cacheKey);

  const cooldown = failureCooldown.get(cacheKey);
  if (cooldown && Date.now() < cooldown) {
    return Promise.resolve(null);
  }
  if (cooldown) {
    failureCooldown.delete(cacheKey);
  }

  const promise = new Promise((resolve) => {
    batchQueue.push({ text, cacheKey, resolve });
  });
  pendingMap.set(cacheKey, promise);

  if (!batchTimer) {
    batchTimer = setTimeout(() => flushBatch(lang), BATCH_DELAY);
  }

  return promise;
};

const useTranslation = () => {
  const { lang } = useI18n();
  const [translationVersion, setTranslationVersion] = useState(0);
  const mountedRef = useRef(true);
  const translationsRef = useRef({});

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    translationsRef.current = {};
    setTranslationVersion(v => v + 1);
  }, [lang]);

  const getLocalizedField = useCallback((item, field) => {
    if (!item) return '';
    if (lang === 'zh') return item[field] || '';
    const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
    const localizedField = `${field}${suffix}`;
    if (item[localizedField]) return item[localizedField];
    const originalText = item[field] || '';
    if (!originalText) return '';

    const cacheKey = `${lang}:${originalText}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];

    const refKey = `${item._id || ''}:${field}:${lang}:${originalText}`;
    if (translationsRef.current[refKey] !== undefined) return translationsRef.current[refKey];

    const cooldown = failureCooldown.get(cacheKey);
    if (cooldown && Date.now() < cooldown) {
      return originalText;
    }

    if (!pendingMap.has(cacheKey)) {
      queueTranslation(originalText, lang).then(result => {
        if (result && mountedRef.current) {
          translationsRef.current[refKey] = result;
          scheduleUpdate(() => {
            if (mountedRef.current) setTranslationVersion(v => v + 1);
          });
        }
      });
    } else {
      pendingMap.get(cacheKey).then(result => {
        if (result && mountedRef.current) {
          translationsRef.current[refKey] = result;
          scheduleUpdate(() => {
            if (mountedRef.current) setTranslationVersion(v => v + 1);
          });
        }
      });
    }

    return originalText;
  }, [lang, translationVersion]);

  const getLocalizedTitle = useCallback((item) => getLocalizedField(item, 'title'), [getLocalizedField]);
  const getLocalizedDescription = useCallback((item) => getLocalizedField(item, 'description'), [getLocalizedField]);
  const getLocalizedName = useCallback((item) => getLocalizedField(item, 'name'), [getLocalizedField]);
  const getLocalizedSubtitle = useCallback((item) => getLocalizedField(item, 'subtitle'), [getLocalizedField]);

  const getLocalizedContent = useCallback((siteContent, field) => {
    if (!siteContent) return '';
    const content = siteContent.content;
    if (!content) return '';
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (lang === 'zh') return parsed[field] || '';
      const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
      const localizedField = `${field}${suffix}`;
      if (parsed[localizedField]) return parsed[localizedField];
      const originalText = parsed[field] || '';
      if (!originalText) return '';

      const cacheKey = `${lang}:siteContent:${field}:${originalText}`;
      if (translationCache[cacheKey]) return translationCache[cacheKey];

      const refKey = `siteContent:${field}:${lang}:${originalText}`;
      if (translationsRef.current[refKey] !== undefined) return translationsRef.current[refKey];

      const cooldown = failureCooldown.get(cacheKey);
      if (cooldown && Date.now() < cooldown) {
        return originalText;
      }

      if (!pendingMap.has(cacheKey)) {
        queueTranslation(originalText, lang).then(result => {
          if (result && mountedRef.current) {
            translationsRef.current[refKey] = result;
            scheduleUpdate(() => {
              if (mountedRef.current) setTranslationVersion(v => v + 1);
            });
          }
        });
      } else {
        pendingMap.get(cacheKey).then(result => {
          if (result && mountedRef.current) {
            translationsRef.current[refKey] = result;
            scheduleUpdate(() => {
              if (mountedRef.current) setTranslationVersion(v => v + 1);
            });
          }
        });
      }

      return originalText;
    } catch {
      return '';
    }
  }, [lang, translationVersion]);

  const translateText = useCallback(async (text, targetLang) => {
    if (!text) return text;
    const tLang = targetLang || lang;
    if (tLang === 'zh') return text;
    const cacheKey = `${tLang}:${text}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];
    try {
      const result = await queueTranslation(text, tLang);
      return result || text;
    } catch {
      return text;
    }
  }, [lang]);

  return {
    getLocalizedField,
    getLocalizedTitle,
    getLocalizedDescription,
    getLocalizedName,
    getLocalizedSubtitle,
    getLocalizedContent,
    translateText,
    lang,
  };
};

export { translationCache, pendingMap, failureCooldown, queueTranslation };
export default useTranslation;
