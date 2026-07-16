import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

/**
 * 浏览器兼容性检测组件
 * 自动识别不兼容的浏览器（如 IE、过低版本的 Chrome/Firefox/Safari/Edge）
 * 显示原因和解决办法
 */
const BrowserCompat = ({ children }) => {
  const { t, lang } = useI18n();
  const [compatInfo, setCompatInfo] = useState(null);

  useEffect(() => {
    const info = checkCompatibility();
    setCompatInfo(info);
  }, []);

  // 不兼容时显示全屏提示
  if (compatInfo && !compatInfo.compatible) {
    return <IncompatibleOverlay reason={compatInfo.reason} browser={compatInfo.browser} t={t} lang={lang} />;
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
 * 不兼容浏览器全屏提示
 */
const IncompatibleOverlay = ({ reason, browser, t, lang }) => {
  const overlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    color: '#e2e8f0',
    fontFamily: "'Noto Sans SC', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    zIndex: 2147483647,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflow: 'auto',
  };

  const cardStyle = {
    maxWidth: '560px',
    width: '100%',
    background: 'rgba(30, 41, 59, 0.9)',
    borderRadius: '16px',
    padding: '40px 32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    textAlign: 'center',
  };

  const iconStyle = {
    fontSize: '64px',
    marginBottom: '16px',
    lineHeight: 1,
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '12px',
    color: '#f8fafc',
  };

  const browserStyle = {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    marginBottom: '20px',
  };

  const reasonStyle = {
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#94a3b8',
    marginBottom: '24px',
    textAlign: 'left',
    padding: '16px',
    background: 'rgba(15, 23, 42, 0.6)',
    borderRadius: '10px',
    border: '1px solid rgba(99, 102, 241, 0.15)',
  };

  const solutionTitleStyle = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#c7d2fe',
    marginBottom: '12px',
  };

  const linkListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '8px',
  };

  const linkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    color: '#a5b4fc',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  };

  const browsers = [
    { name: 'Google Chrome', url: 'https://www.google.cn/chrome/', emoji: '🌐' },
    { name: 'Microsoft Edge（新版，基于 Chromium）', url: 'https://www.microsoft.com/zh-cn/edge', emoji: '🔵' },
    { name: 'Mozilla Firefox', url: 'https://www.mozilla.org/zh-CN/firefox/', emoji: '🦊' },
  ];

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={iconStyle}>😅</div>
        <h1 style={titleStyle}>{t('browserCompat.title')}</h1>
        {browser && browser !== 'Unknown' && (
          <div style={browserStyle}>{browser}</div>
        )}
        <div style={reasonStyle}>
          <strong style={{ color: '#a5b4fc' }}>{t('browserCompat.reasonLabel')}</strong>
          <br />
          {getReasonText(reason, t)}
        </div>
        <div style={solutionTitleStyle}>{t('browserCompat.solutionTitle')}</div>
        <div style={linkListStyle}>
          {browsers.map(b => (
            <a key={b.name} href={b.url} style={linkStyle}>
              <span style={{ fontSize: '20px' }}>{b.emoji}</span>
              <span>{b.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>→</span>
            </a>
          ))}
        </div>
        <p style={{
          marginTop: '24px',
          fontSize: '12px',
          color: '#475569',
          lineHeight: 1.5,
        }}>
          {t('browserCompat.hint')}
        </p>
      </div>
    </div>
  );
};

export default BrowserCompat;
