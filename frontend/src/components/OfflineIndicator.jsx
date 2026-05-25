import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

export default function OfflineIndicator() {
  const { t } = useI18n();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const [visible, setVisible] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      setVisible(true);
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => setShowBackOnline(false), 300);
      }, 2000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
      setVisible(true);
    };

    const handleSessionExpired = () => {
      setSessionExpired(true);
      setVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('auth:session-expired', handleSessionExpired);

    if (!navigator.onLine) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, []);

  if (!visible && !isOffline && !sessionExpired) return null;

  const isBackOnline = showBackOnline && !isOffline && !sessionExpired;

  let bgColor, borderColor, textColor, icon, message;
  if (sessionExpired) {
    bgColor = 'var(--destructive-bg)';
    borderColor = 'var(--destructive-border)';
    textColor = 'var(--destructive-text)';
    icon = '🔒';
    message = t('auth.sessionExpired');
  } else if (isBackOnline) {
    bgColor = 'var(--success-bg)';
    borderColor = 'var(--success-border)';
    textColor = 'var(--success-text)';
    icon = '✓';
    message = t('pwa.backOnline');
  } else {
    bgColor = 'var(--warning-bg)';
    borderColor = 'var(--warning-border)';
    textColor = 'var(--warning-text)';
    icon = '⚠';
    message = t('pwa.offline');
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        padding: '8px 16px',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '0 0 12px 12px',
          background: bgColor,
          border: `1px solid ${borderColor}`,
          borderTop: 'none',
          color: textColor,
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        <span>{icon}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
