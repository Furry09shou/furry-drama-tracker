import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

const DISMISSED_KEY = 'pwa-install-dismissed';
const SESSION_CLOSED_KEY = 'pwa-install-session-closed';

export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [neverRemind, setNeverRemind] = useState(false);

  useEffect(() => {
    // "不再提醒" 永久关闭
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setShow(false);
    }
  };

  // 关闭：如果勾选了不再提醒则永久关闭，否则仅本次隐藏（刷新页面会重新弹出）
  const handleClose = () => {
    if (neverRemind) {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        animation: 'slideUp 0.3s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: '16px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          maxWidth: 'min(440px, calc(100vw - 32px))',
        }}
      >
        <span style={{ fontSize: '28px', flexShrink: 0 }}>📲</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--foreground)' }}>
            {t('pwa.install')}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
            {t('pwa.installDesc')}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleInstall}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {t('pwa.installBtn')}
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {t('pwa.close')}
            </button>
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '11px', color: 'var(--text-tertiary)',
            cursor: 'pointer', userSelect: 'none',
          }}>
            <input
              type="checkbox"
              checked={neverRemind}
              onChange={(e) => setNeverRemind(e.target.checked)}
              style={{ margin: 0, cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            {t('pwa.neverRemind')}
          </label>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
