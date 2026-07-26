import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import zh from '../locales/zh';
import en from '../locales/en';

const translations = { zh, en };

// HMR 安全：热更新时复用同一个 context 对象，避免 Provider（旧 context）
// 与 Consumer（新 context）不匹配导致 this.context 为 undefined 的崩溃。
const I18nContext = import.meta.hot?.data?.I18nContext || createContext();
if (import.meta.hot) {
  import.meta.hot.dispose((data) => { data.I18nContext = I18nContext; });
}
export { I18nContext };

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
    const fullLocale = LOCALE_MAP[lang] || lang;
    localStorage.setItem('lang', lang);
    // 使用完整 locale（zh-CN / en-US）告知浏览器当前页面语言，
    // 以便浏览器翻译、拼写检查、无障碍等服务正确适配用户。
    document.documentElement.lang = fullLocale;
    // 同步更新 og:locale 元数据，让社交平台抓取到正确的语言信息。
    let ogLocale = document.querySelector('meta[property="og:locale"]');
    if (!ogLocale) {
      ogLocale = document.createElement('meta');
      ogLocale.setAttribute('property', 'og:locale');
      document.head.appendChild(ogLocale);
    }
    ogLocale.setAttribute('content', fullLocale);
    // 同步 content-language 与 language meta，确保浏览器翻译可靠识别语言，
    // 避免 SPA 初始内容为空时浏览器回退到"检测到的语言"。
    const metaTags = [
      { selector: 'meta[http-equiv="content-language"]', attr: 'content', value: fullLocale },
      { selector: 'meta[name="language"]', attr: 'content', value: fullLocale },
    ];
    metaTags.forEach(({ selector, attr, value }) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (selector.includes('http-equiv')) {
          el.setAttribute('http-equiv', 'content-language');
        } else {
          el.setAttribute('name', 'language');
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    });
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
    if (translations[newLang] && newLang !== lang) {
      // 先写入 localStorage，再刷新页面。
      // 刷新让 index.html 中的早期内联脚本读取新语言并设置 <html lang>，
      // 这样浏览器翻译功能才能在页面初始加载时就正确识别语言，
      // 而非依赖 React 挂载后的动态修改（可能错过浏览器的初始语言检测）。
      localStorage.setItem('lang', newLang);
      window.location.reload();
    }
  }, [lang]);

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

// 注：不使用 default export，以兼容 Vite React Fast Refresh（HMR）。
// I18nContext 通过具名导出 import { I18nContext } 使用。
