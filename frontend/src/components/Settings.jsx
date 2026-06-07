import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import usePushNotifications from '../hooks/usePushNotifications';
import { useAuth } from '../contexts/AuthContext';

const DISMISSED_KEY = 'pwa-install-dismissed';

const Settings = ({ user }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const push = usePushNotifications();

  const [pwaInstallRemind, setPwaInstallRemind] = useState(
    localStorage.getItem(DISMISSED_KEY) !== 'true'
  );
  const [notificationEnabled, setNotificationEnabled] = useState(
    Notification.permission === 'granted'
  );
  const [saved, setSaved] = useState(false);

  const handleTogglePwaRemind = () => {
    const newVal = !pwaInstallRemind;
    setPwaInstallRemind(newVal);
    if (newVal) {
      localStorage.removeItem(DISMISSED_KEY);
    } else {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    showSaved();
  };

  const handleToggleNotification = async () => {
    if (notificationEnabled) {
      // 关闭通知权限无法通过API撤销，只能提示用户去浏览器设置中关闭
      setNotificationEnabled(false);
      showSaved();
    } else {
      if (push.supported) {
        await push.toggle();
        setNotificationEnabled(push.subscribed);
      } else {
        const permission = await Notification.requestPermission();
        setNotificationEnabled(permission === 'granted');
      }
      showSaved();
    }
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const settingsGroups = [
    {
      title: t('settings.pwa'),
      items: [
        {
          key: 'pwaInstallRemind',
          label: t('settings.pwaInstallRemind'),
          desc: t('settings.pwaInstallRemindDesc'),
          type: 'toggle',
          value: pwaInstallRemind,
          onChange: handleTogglePwaRemind,
        },
        {
          key: 'notification',
          label: t('settings.notification'),
          desc: t('settings.notificationDesc'),
          type: 'toggle',
          value: notificationEnabled,
          onChange: handleToggleNotification,
          disabled: !('Notification' in window),
        },
      ],
    },
    {
      title: t('settings.display'),
      items: [
        {
          key: 'language',
          label: t('settings.language'),
          desc: t('settings.languageDesc'),
          type: 'info',
          value: navigator.language.startsWith('zh') ? '中文' : 'English',
        },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '18px', padding: '4px 8px',
          }}
        >←</button>
        <h2 style={{ margin: 0 }}>{t('settings.title')}</h2>
        {saved && (
          <span style={{
            marginLeft: 'auto', fontSize: '13px', color: 'var(--primary)',
            fontWeight: 600, animation: 'fadeIn 0.2s',
          }}>✓ {t('settings.saved')}</span>
        )}
      </div>

      {settingsGroups.map((group) => (
        <div key={group.title} style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
          }}>{group.title}</h3>
          <div style={{
            background: 'var(--card)', borderRadius: '12px',
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {group.items.map((item, i) => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>
                {item.type === 'toggle' ? (
                  <button
                    onClick={item.onChange}
                    disabled={item.disabled}
                    style={{
                      width: '44px', height: '24px', borderRadius: '12px',
                      border: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
                      background: item.value ? 'var(--primary)' : 'var(--hover-bg)',
                      position: 'relative', transition: 'background 0.2s',
                      opacity: item.disabled ? 0.5 : 1, flexShrink: 0,
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#fff', position: 'absolute', top: '3px',
                      left: item.value ? '23px' : '3px',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Settings;
