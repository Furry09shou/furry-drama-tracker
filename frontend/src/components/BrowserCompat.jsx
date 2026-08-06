import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import axios from 'axios';

/**
 * 浏览器兼容性检测组件
 * 自动识别不兼容的浏览器（如 IE、过低版本的 Chrome/Firefox/Safari/Edge）
 * 显示原因和解决办法，同时提供"继续访问"入口（主题切换等非核心功能不影响正常浏览）
 */
const BrowserCompat = ({ children }) => {
  const { t, lang, switchLang } = useI18n();
  const [compatInfo, setCompatInfo] = useState(null);
  const [bypassed, setBypassed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    // 检查本地是否已标记"使用正常，不再提醒"
    try {
      if (localStorage.getItem(getBypassKey()) === 'ok') {
        setCompatInfo({ compatible: true });
        return;
      }
    } catch (e) {}
    const info = checkCompatibility();
    setCompatInfo(info);
  }, []);

  // 继续访问后 1 分钟弹窗询问使用是否正常
  useEffect(() => {
    if (bypassed) {
      const timer = setTimeout(() => setShowFeedback(true), 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [bypassed]);

  const handleContinue = () => setBypassed(true);

  const handleFeedback = (isNormal) => {
    if (isNormal) {
      // 用户确认正常 → 本地记录（按浏览器+设备维度），不再提示
      try { localStorage.setItem(getBypassKey(), 'ok'); } catch (e) {}
    }
    setShowFeedback(false);
  };

  // 不兼容时显示全屏提示（带"继续访问"按钮）
  if (compatInfo && !compatInfo.compatible && !bypassed) {
    return (
      <IncompatibleOverlay
        reason={compatInfo.reason}
        browser={compatInfo.browser}
        t={t}
        lang={lang}
        switchLang={switchLang}
        onContinue={handleContinue}
      />
    );
  }

  return (
    <>
      {children}
      {showFeedback && (
        <FeedbackDialog
          onNormal={() => handleFeedback(true)}
          onProblem={() => handleFeedback(false)}
          t={t}
        />
      )}
    </>
  );
};

/**
 * 基于浏览器 UA 生成本地存储 key（区分用户/设备/浏览器，同一组合只记一次）
 */
function getBypassKey() {
  const ua = navigator.userAgent;
  let hash = 0;
  for (let i = 0; i < ua.length; i++) {
    hash = ((hash << 5) - hash + ua.charCodeAt(i)) | 0;
  }
  return `browserCompat_bypass_${hash}`;
}

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
  // 注意：Safari 中 CSS.supports('--a', '0') 两参数形式对自定义属性有 bug 会返回 false，
  // 即使 Safari 9.1+ 已完整支持 CSS 变量。改用元素属性检测更可靠。
  const el = document.createElement('div');
  el.style.setProperty('--test-var', '0');
  if (el.style.getPropertyValue('--test-var') === '') {
    return { compatible: false, reason: 'noCssVars', browser: browserName || 'Unknown' };
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
const IncompatibleOverlay = ({ reason, browser, t, lang, switchLang, onContinue }) => {
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

  const continueBtnStyle = {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #c7d2fe',
    background: '#fff',
    color: '#6366f1',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '14px',
    transition: 'background 0.2s',
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
          {/* 继续访问：主题切换等非核心功能不影响正常浏览 */}
          <button
            style={continueBtnStyle}
            onClick={onContinue}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            {t('browserCompat.continueAnyway')}
          </button>
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

/**
 * 继续 1 分钟后弹出的反馈弹窗：询问使用是否正常
 * 用户确认正常 → localStorage 记录，不再提示该浏览器
 */
const FeedbackDialog = ({ onNormal, onProblem, t }) => {
  const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 2147483647,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.2s ease',
  };

  const cardStyle = {
    background: '#fff', borderRadius: '12px', padding: '24px 20px',
    maxWidth: '380px', width: 'calc(100% - 32px)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
    textAlign: 'center',
    animation: 'slideUp 0.3s ease',
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }} aria-hidden="true">🤔</div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>
          {t('browserCompat.feedbackTitle')}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px', lineHeight: 1.5 }}>
          {t('browserCompat.feedbackDesc')}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onNormal} style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
            background: '#6366f1', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>{t('browserCompat.feedbackNormal')}</button>
          <button onClick={onProblem} style={{
            flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #c7d2fe',
            background: '#fff', color: '#6366f1', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>{t('browserCompat.feedbackProblem')}</button>
        </div>
      </div>
    </div>
  );
};

export default BrowserCompat;
