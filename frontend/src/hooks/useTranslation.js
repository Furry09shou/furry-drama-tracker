import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import translationCache, { setCache } from '../utils/translationCache';

const MAX_CONCURRENT = 6;
const REQUEST_TIMEOUT = 15000;
let activeRequests = 0;
const requestQueue = [];
const inFlightRequests = new Map();

const processQueue = () => {
  while (activeRequests < MAX_CONCURRENT && requestQueue.length > 0) {
    const { text, lang, resolve, cacheKey, promise } = requestQueue.shift();
    activeRequests++;
    inFlightRequests.set(cacheKey, { resolve, promise });
    axios.post('/api/translate', { key: text, targetLang: lang }, { timeout: REQUEST_TIMEOUT, skipRedirect: true })
      .then(res => {
        activeRequests--;
        inFlightRequests.delete(cacheKey);
        if (res.data?.translation) {
          setCache(cacheKey, res.data.translation);
        }
        resolve(res.data?.translation || null);
        processQueue();
      })
      .catch(() => {
        activeRequests--;
        inFlightRequests.delete(cacheKey);
        resolve(null);
        processQueue();
      });
  }
};

const requestTranslation = (text, lang) => {
  const cacheKey = `${lang}:${text}`;
  if (translationCache[cacheKey]) return Promise.resolve(translationCache[cacheKey]);
  if (inFlightRequests.has(cacheKey)) return inFlightRequests.get(cacheKey).promise;

  const existing = requestQueue.find(item => item.cacheKey === cacheKey);
  if (existing) return existing.promise;

  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  requestQueue.push({ text, lang, resolve: resolvePromise, cacheKey, promise });
  processQueue();
  return promise;
};

const useTranslation = () => {
  const { lang } = useI18n();
  const pendingRef = useRef({});
  const failedRef = useRef(new Set());
  const [tick, setTick] = useState(0);
  const mountedRef = useRef(true);
  const scheduleTimerRef = useRef(null);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    pendingRef.current = {};
    failedRef.current = new Set();
    setTick(t => t + 1);
  }, [lang]);

  const scheduleTick = useCallback(() => {
    if (scheduleTimerRef.current) return;
    scheduleTimerRef.current = setTimeout(() => {
      scheduleTimerRef.current = null;
      if (mountedRef.current) setTick(t => t + 1);
    }, 100);
  }, []);

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
    if (failedRef.current.has(cacheKey)) return originalText;
    if (pendingRef.current[cacheKey]) return originalText;

    const currentLang = lang;
    pendingRef.current[cacheKey] = true;
    requestTranslation(originalText, currentLang).then((result) => {
      if (!mountedRef.current) return;
      delete pendingRef.current[cacheKey];
      if (result) {
        failedRef.current.delete(cacheKey);
        scheduleTick();
      } else {
        failedRef.current.add(cacheKey);
      }
    });

    return originalText;
  }, [lang, tick, scheduleTick]);

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

      const cacheKey = `${lang}:${originalText}`;
      if (translationCache[cacheKey]) return translationCache[cacheKey];
      if (failedRef.current.has(cacheKey)) return originalText;
      if (pendingRef.current[cacheKey]) return originalText;

      const currentLang = lang;
      pendingRef.current[cacheKey] = true;
      requestTranslation(originalText, currentLang).then((result) => {
        if (!mountedRef.current) return;
        delete pendingRef.current[cacheKey];
        if (result) {
          failedRef.current.delete(cacheKey);
          scheduleTick();
        } else {
          failedRef.current.add(cacheKey);
        }
      });

      return originalText;
    } catch {
      return '';
    }
  }, [lang, tick, scheduleTick]);

  const translateText = useCallback(async (text, targetLang) => {
    if (!text) return text;
    const tLang = targetLang || lang;
    if (tLang === 'zh') return text;
    const cacheKey = `${tLang}:${text}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];
    try {
      const result = await requestTranslation(text, tLang);
      return result || text;
    } catch {
      return text;
    }
  }, [lang]);

  const translateBatch = useCallback(async (texts, targetLang) => {
    if (!texts || texts.length === 0) return texts;
    const tLang = targetLang || lang;
    if (tLang === 'zh') return texts;
    const uncached = [];
    const uncachedIndices = [];
    const results = [...texts];
    texts.forEach((text, i) => {
      const cacheKey = `${tLang}:${text}`;
      if (translationCache[cacheKey]) {
        results[i] = translationCache[cacheKey];
      } else {
        uncached.push(text);
        uncachedIndices.push(i);
      }
    });
    if (uncached.length === 0) return results;
    try {
      const res = await axios.post('/api/translate/batch', { texts: uncached, targetLang: tLang }, { timeout: 30000, skipRedirect: true });
      if (res.data?.translations) {
        res.data.translations.forEach((translated, i) => {
          const originalIndex = uncachedIndices[i];
          results[originalIndex] = translated;
          const cacheKey = `${tLang}:${uncached[i]}`;
          setCache(cacheKey, translated);
        });
      }
    } catch {}
    return results;
  }, [lang]);

  return {
    getLocalizedField,
    getLocalizedTitle,
    getLocalizedDescription,
    getLocalizedName,
    getLocalizedSubtitle,
    getLocalizedContent,
    translateText,
    translateBatch,
    lang,
  };
};

export default useTranslation;
export { requestTranslation };
