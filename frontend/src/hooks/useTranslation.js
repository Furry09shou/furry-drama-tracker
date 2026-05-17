import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const translationCache = {};

const useTranslation = () => {
  const { lang } = useI18n();
  const [pendingTranslations, setPendingTranslations] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
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
    if (pendingTranslations[cacheKey]) return originalText;

    axios.post('/api/translate', { key: originalText, targetLang: lang }, { skipRedirect: true })
      .then(res => {
        if (res.data?.translation && mountedRef.current) {
          translationCache[cacheKey] = res.data.translation;
          setPendingTranslations(prev => {
            const next = { ...prev };
            delete next[cacheKey];
            return next;
          });
        }
      })
      .catch(() => {});

    setPendingTranslations(prev => ({ ...prev, [cacheKey]: true }));
    return originalText;
  }, [lang, pendingTranslations]);

  const getLocalizedTitle = useCallback((item) => {
    return getLocalizedField(item, 'title');
  }, [getLocalizedField]);

  const getLocalizedDescription = useCallback((item) => {
    return getLocalizedField(item, 'description');
  }, [getLocalizedField]);

  const getLocalizedName = useCallback((item) => {
    return getLocalizedField(item, 'name');
  }, [getLocalizedField]);

  const getLocalizedSubtitle = useCallback((item) => {
    return getLocalizedField(item, 'subtitle');
  }, [getLocalizedField]);

  const translateText = useCallback(async (text, targetLang) => {
    if (!text || targetLang === 'zh') return text;
    const tLang = targetLang || lang;
    const cacheKey = `${tLang}:${text}`;
    if (translationCache[cacheKey]) return translationCache[cacheKey];
    try {
      const res = await axios.post('/api/translate', { key: text, targetLang: tLang }, { skipRedirect: true });
      if (res.data?.translation) {
        translationCache[cacheKey] = res.data.translation;
        return res.data.translation;
      }
    } catch {}
    return text;
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
      const res = await axios.post('/api/translate/batch', { texts: uncached, targetLang: tLang }, { skipRedirect: true });
      if (res.data?.translations) {
        res.data.translations.forEach((translated, i) => {
          const originalIndex = uncachedIndices[i];
          results[originalIndex] = translated;
          const cacheKey = `${tLang}:${uncached[i]}`;
          translationCache[cacheKey] = translated;
        });
      }
    } catch {}
    return results;
  }, [lang]);

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
      if (pendingTranslations[cacheKey]) return originalText;

      axios.post('/api/translate', { key: originalText, targetLang: lang }, { skipRedirect: true })
        .then(res => {
          if (res.data?.translation && mountedRef.current) {
            translationCache[cacheKey] = res.data.translation;
            setPendingTranslations(prev => {
              const next = { ...prev };
              delete next[cacheKey];
              return next;
            });
          }
        })
        .catch(() => {});

      setPendingTranslations(prev => ({ ...prev, [cacheKey]: true }));
      return originalText;
    } catch {
      return '';
    }
  }, [lang, pendingTranslations]);

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
