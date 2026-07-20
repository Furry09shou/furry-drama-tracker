import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import axios from 'axios';

/**
 * 浏览器兼容性检测组件
 * 自动识别不兼容的浏览器（如 IE、过低版本的 Chrome/Firefox/Safari/Edge）
 * 显示原因和解决办法
 */
const BrowserCompat = ({ children }) => {
  const { t, lang, switchLang } = useI18n();
  const [compatInfo, setCompatInfo] = useState(null);

  useEffect(() => {
    const info = checkCompatibility();
    setCompatInfo(info);
  }, []);

  // 不兼容时显示全屏提示
  if (compatInfo && !compatInfo.compatible) {
    return <IncompatibleOverlay reason={compatInfo.reason} browser={compatInfo.browser} t={t} lang={lang} switchLang={switchLang} />;
  }

  return children;
};

/**
 * 检测浏览器兼容性
 * 返回 { compatible: boolean, reason?: string, browser?: string }
 */
function checkCompatibility() {
  const ua = navigator.userAgent;
  let browserName = '';
  let browserVersion = '';

  // 解析浏览器名称和版本
  if (/MSIE|Trident/i.test(ua)) {
    browserName = 'Internet Explorer';
    const match = ua.match(/(?:MSIE|rv:)\s?([\d.]+)/);
    browserVersion = match ? match[1] : '';
    return {
      compatible: false,
      reason: 'ie',
      browser: `${browserName} ${browserVersion}`,
    };
  }

  // 检测 Edge Legacy (EdgeHTML)
  if (/Edge\/\d+/i.test(ua) && !/Edg\/\d+/i.test(ua)) {
    browserName = 'Microsoft Edge (Legacy)';
    const match = ua.match(/Edge\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
    return {
      compatible: false,
      reason: 'edgeLegacy',
      browser: `${browserName} ${browserVersion}`,
    };
  }

  // 检测 Chrome 版本
  if (/Chrome\/(\d+)/i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
    browserName = 'Chrome';
    const major = parseInt(browserVersion, 10);
    if (major < 60) {
      return { compatible: false, reason: 'oldChrome', browser: `${browserName} ${browserVersion}` };
    }
  }

  // 检测 Firefox 版本
  if (/Firefox\/(\d+)/i.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
    browserName = 'Firefox';
    const major = parseInt(browserVersion, 10);
    if (major < 55) {
      return { compatible: false, reason: 'oldFirefox', browser: `${browserName} ${browserVersion}` };
    }
  }

  // 检测 Safari 版本
  if (/Version\/(\d+)[.\d]* Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/);
    browserVersion = match ? match[1] : '';
    browserName = 'Safari';
    const major = parseInt(browserVersion, 10);
    if (major < 12) {
      return { compatible: false, reason: 'oldSafari', browser: `${browserName} ${browserVersion}` };
    }
  }

  // 功能检测：缺少关键 API
  if (typeof window.Promise === 'undefined') {
    return { compatible: false, reason: 'noPromise', browser: browserName || 'Unknown' };
  }
  if (typeof window.fetch === 'undefined') {
    return { compatible: false, reason: 'noFetch', browser: browserName || 'Unknown' };
  }
  if (typeof window.IntersectionObserver === 'undefined') {
    return { compatible: false, reason: 'noIntersectionObserver', browser: browserName || 'Unknown' };
  }
  if (typeof window.ResizeObserver === 'undefined') {
    return { compatible: false, reason: 'noResizeObserver', browser: browserName || 'Unknown' };
  }
  if (typeof Object.assign !== 'function') {
    return { compatible: false, reason: 'noObjectAssign', browser: browserName || 'Unknown' };
  }
  if (typeof Array.from !== 'function') {
    return { compatible: false, reason: 'noArrayFrom', browser: browserName || 'Unknown' };
  }

  // CSS 变量支持检测
  if (window.CSS && CSS.supports) {
    if (!CSS.supports('--a', '0')) {
      return { compatible: false, reason: 'noCssVars', browser: browserName || 'Unknown' };
    }
  }

  return { compatible: true };
}

/**
 * 获取不兼容原因的描述
 */
function getReasonText(reason, t) {
  const reasons = {
    ie: t('browserCompat.reasonIE'),
    edgeLegacy: t('browserCompat.reasonEdgeLegacy'),
    oldChrome: t('browserCompat.reasonOldChrome'),
    oldFirefox: t('browserCompat.reasonOldFirefox'),
    oldSafari: t('browserCompat.reasonOldSafari'),
    noPromise: t('browserCompat.reasonNoPromise'),
    noFetch: t('browserCompat.reasonNoFetch'),
    noIntersectionObserver: t('browserCompat.reasonNoIntersectionObserver'),
    noResizeObserver: t('browserCompat.reasonNoResizeObserver'),
    noObjectAssign: t('browserCompat.reasonNoObjectAssign'),
    noArrayFrom: t('browserCompat.reasonNoArrayFrom'),
    noCssVars: t('browserCompat.reasonNoCssVars'),
  };
  return reasons[reason] || t('browserCompat.reasonUnknown');
}

/**
 * 不兼容浏览器全屏提示（亮色主题，支持中英双语切换）
 */
const IncompatibleOverlay = ({ reason, browser, t, lang, switchLang }) => {
  const [icp, setIcp] = useState('');

  useEffect(() => {
    // 从 API 获取 ICP 备案号
    axios.get('/api/site-content/about')
      .then(res => {
        try {
          const data = JSON.parse(res.data.content);
          if (data.icp) {
            setIcp(data.icp);
            // 缓存到 localStorage，供 index.html 原生 JS 层使用
            try { localStorage.setItem('_icp', data.icp); } catch (e) {}
          }
        } catch (e) {}
      })
      .catch(() => {
        // API 不可用时尝试从 localStorage 缓存读取
        try {
          const cached = localStorage.getItem('_icp');
          if (cached) setIcp(cached);
        } catch (e) {}
      });
  }, []);

  const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: '#eef2ff',
    color: '#1e293b',
    fontFamily: "'Noto Sans SC', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    zIndex: 2147483647,
    display: 'table',
    width: '100%',
    height: '100%',
  };

  const cellStyle = {
    display: 'table-cell',
    verticalAlign: 'middle',
    textAlign: 'center',
    padding: '12px',
  };

  const cardStyle = {
    maxWidth: '440px',
    width: '100%',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px 20px',
    boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.18)',
    border: '1px solid #e2e8f0',
    textAlign: 'left',
    display: 'inline-block',
    position: 'relative',
    maxHeight: 'calc(100vh - 80px)',
    overflowY: 'auto',
  };

  const iconStyle = {
    fontSize: '40px',
    marginBottom: '8px',
    lineHeight: 1,
  };

  const titleStyle = {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '10px',
    color: '#1e293b',
  };

  const browserStyle = {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
    background: '#eef2ff',
    color: '#6366f1',
    border: '1px solid #c7d2fe',
    marginBottom: '12px',
  };

  const reasonStyle = {
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#64748b',
    marginBottom: '10px',
    textAlign: 'left',
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  };

  const supportedStyle = {
    fontSize: '11px',
    lineHeight: 1.5,
    color: '#94a3b8',
    marginBottom: '14px',
    textAlign: 'left',
    padding: '8px 10px',
    background: '#f8fafc',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  };

  const solutionTitleStyle = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '8px',
  };

  const langToggleStyle = {
    position: 'absolute',
    top: '14px',
    right: '14px',
    background: '#fff',
    border: '1px solid #c7d2fe',
    color: '#6366f1',
    padding: '5px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(99,102,241,0.12)',
  };

  const browsers = [
    { name: t('browserCompat.chrome'), cn: 'https://www.google.cn/chrome/', global: 'https://www.google.com/chrome/' },
    { name: t('browserCompat.edge'), cn: 'https://www.microsoft.com/zh-cn/edge', global: 'https://www.microsoft.com/en-us/edge' },
    { name: t('browserCompat.firefox'), cn: 'http://www.firefox.com.cn/', global: 'https://www.mozilla.org/en-US/firefox/' },
  ];

  return (
    <div style={overlayStyle}>
      <div style={cellStyle}>
        <div style={cardStyle}>
          <button
            style={langToggleStyle}
            onClick={() => switchLang(lang === 'zh' ? 'en' : 'zh')}
            aria-label={t('browserCompat.langToggle')}
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
          <div style={{ ...iconStyle, textAlign: 'center' }} aria-hidden="true">😅</div>
          <h1 style={{ ...titleStyle, textAlign: 'center' }}>{t('browserCompat.title')}</h1>
          {browser && browser !== 'Unknown' && (
            <div style={{ ...browserStyle, textAlign: 'center' }}>{browser}</div>
          )}
          <div style={reasonStyle}>
            <strong style={{ color: '#6366f1', display: 'block', marginBottom: '4px' }}>{t('browserCompat.reasonLabel')}</strong>
            {getReasonText(reason, t)}
          </div>
          <div style={supportedStyle}>{t('browserCompat.supportedVersions')}</div>
          <div style={{ ...solutionTitleStyle, textAlign: 'center' }}>{t('browserCompat.solutionTitle')}</div>
          <div>
            {browsers.map((b, idx) => (
              <div key={b.name} style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: idx < browsers.length - 1 ? '8px' : 0,
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>{b.name}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a href={b.cn} style={{
                    flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: '6px',
                    background: '#6366f1', color: '#fff', textDecoration: 'none',
                    fontSize: '12px', fontWeight: 600,
                  }}>{t('browserCompat.downloadCN')}</a>
                  <a href={b.global} style={{
                    flex: 1, textAlign: 'center', padding: '7px 10px', borderRadius: '6px',
                    background: '#fff', border: '1px solid #c7d2fe', color: '#6366f1',
                    textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                  }}>{t('browserCompat.downloadGlobal')}</a>
                </div>
              </div>
            ))}
          </div>
          <p style={{
            marginTop: '14px',
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: 1.5,
            textAlign: 'center',
          }}>
            {t('browserCompat.hint')}
          </p>
        </div>
      </div>
      {icp && (
        <a
          href="https://beian.miit.gov.cn/#/Integrated/index"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'absolute',
            bottom: '16px',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: '11px',
            color: '#94a3b8',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >{icp}</a>
      )}
    </div>
  );
};

export default BrowserCompat;
