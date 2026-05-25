import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import zh from '../locales/zh';
import en from '../locales/en';

const translations = { zh, en };

const I18nContext = createContext();

const SUPPORTED_LANGUAGES = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

const LOCALE_MAP = { zh: 'zh-CN', en: 'en-US' };

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('lang');
    if (saved && translations[saved]) return saved;
    const browserLang = navigator.language?.toLowerCase().slice(0, 2);
    if (browserLang && translations[browserLang]) return browserLang;
    return 'zh';
  });

  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key, params) => {
    const keys = key.split('.');
    let value = translations[lang];
    for (const k of keys) {
      if (value === undefined) break;
      value = value[k];
    }
    if (value !== undefined) {
      if (params && typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
      }
      return value;
    }

    let fallback = translations['zh'];
    for (const k of keys) {
      if (fallback === undefined) return key;
      fallback = fallback[k];
    }
    if (fallback !== undefined) {
      if (params && typeof fallback === 'string') {
        return fallback.replace(/\{(\w+)\}/g, (_, k) => params[k] !== undefined ? params[k] : `{${k}}`);
      }
      return fallback;
    }
    return key;
  }, [lang]);

  const switchLang = useCallback((newLang) => {
    if (translations[newLang]) {
      setLang(newLang);
    }
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t, switchLang, supportedLanguages: SUPPORTED_LANGUAGES, locale: LOCALE_MAP[lang] || 'zh-CN' }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};

export default I18nContext;
