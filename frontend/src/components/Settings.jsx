import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import usePushNotifications from '../hooks/usePushNotifications';
import { useAuth } from '../contexts/AuthContext';
import API from '../utils/apiEndpoints';
import ImageUploader from './ImageUploader';

const DISMISSED_KEY = 'pwa-install-dismissed';

const Settings = ({ user }) => {
  const { t, lang, switchLang, supportedLanguages } = useI18n();
  const { themeMode, setThemeModeTo } = useTheme();
  const navigate = useNavigate();
  const { getAuthHeaders, updateUser } = useAuth();
  const push = usePushNotifications();

  const [pwaInstallRemind, setPwaInstallRemind] = useState(
    localStorage.getItem(DISMISSED_KEY) !== 'true'
  );
  const [notificationEnabled, setNotificationEnabled] = useState(
    Notification.permission === 'granted'
  );
  const [saved, setSaved] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({
    episodeUpdate: true,
    newDeviceLogin: true,
    feedbackReply: true,
    friendLinkStatus: true,
    friendLinkApply: true,
  });
  const [bgPrefs, setBgPrefs] = useState({
    image: '', enabled: false, opacity: 30, blur: 0,
  });

  useEffect(() => {
    if (user?.emailNotificationPrefs) {
      setEmailPrefs(prev => ({ ...prev, ...user.emailNotificationPrefs }));
    }
    if (user?.backgroundPrefs) {
      setBgPrefs({
        image: user.backgroundPrefs.image || '',
        enabled: !!user.backgroundPrefs.enabled,
        opacity: user.backgroundPrefs.opacity !== undefined ? user.backgroundPrefs.opacity : 30,
        blur: user.backgroundPrefs.blur !== undefined ? user.backgroundPrefs.blur : 0,
      });
    }
  }, [user]);

  const handleToggleEmailPref = async (key) => {
    const newVal = !emailPrefs[key];
    setEmailPrefs(prev => ({ ...prev, [key]: newVal }));
    showSaved();
    try {
      await axios.put(API.AUTH.EMAIL_NOTIFICATION_PREFS, { [key]: newVal });
    } catch (e) {
      // 回滚
      setEmailPrefs(prev => ({ ...prev, [key]: !newVal }));
    }
  };

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

  const updateBgPrefs = async (updates) => {
    const newPrefs = { ...bgPrefs, ...updates };
    setBgPrefs(newPrefs);
    updateUser(prev => ({ ...prev, backgroundPrefs: newPrefs }));
    try {
      await axios.put(API.USERS.BACKGROUND_PREFS, updates);
      showSaved();
    } catch (e) {
      // 回滚
      setBgPrefs(bgPrefs);
      updateUser(prev => ({ ...prev, backgroundPrefs: bgPrefs }));
    }
  };

  const handleBgImageChange = async (url) => {
    const newPrefs = { ...bgPrefs, image: url };
    setBgPrefs(newPrefs);
    updateUser(prev => ({ ...prev, backgroundPrefs: newPrefs }));
    try {
      await axios.put(API.USERS.BACKGROUND_PREFS, { image: url });
      showSaved();
    } catch (e) {
      setBgPrefs(bgPrefs);
      updateUser(prev => ({ ...prev, backgroundPrefs: bgPrefs }));
    }
  };

  const themeOptions = [
    { mode: 'system', label: t('settings.themeSystem'), icon: '💻' },
    { mode: 'light', label: t('settings.themeLight'), icon: '☀️' },
    { mode: 'dark', label: t('settings.themeDark'), icon: '🌙' },
  ];

  const settingsGroups = [
    {
      title: t('settings.display'),
      items: [
        {
          key: 'language',
          label: t('settings.language'),
          desc: t('settings.languageDesc'),
          type: 'select',
          options: supportedLanguages.map(l => ({ value: l.code, label: `${l.flag} ${l.label}` })),
          value: lang,
          onChange: (val) => { switchLang(val); showSaved(); },
        },
        {
          key: 'theme',
          label: t('settings.theme'),
          desc: t('settings.themeDesc'),
          type: 'theme',
          value: themeMode,
        },
      ],
    },
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
      title: t('settings.emailNotifications'),
      groupDesc: t('settings.emailNotificationsDesc'),
      items: [
        {
          key: 'emailEpisodeUpdate',
          label: t('settings.emailEpisodeUpdate'),
          desc: t('settings.emailEpisodeUpdateDesc'),
          type: 'toggle',
          value: emailPrefs.episodeUpdate,
          onChange: () => handleToggleEmailPref('episodeUpdate'),
        },
        {
          key: 'emailNewDeviceLogin',
          label: t('settings.emailNewDeviceLogin'),
          desc: t('settings.emailNewDeviceLoginDesc'),
          type: 'toggle',
          value: emailPrefs.newDeviceLogin,
          onChange: () => handleToggleEmailPref('newDeviceLogin'),
        },
        {
          key: 'emailFeedbackReply',
          label: t('settings.emailFeedbackReply'),
          desc: t('settings.emailFeedbackReplyDesc'),
          type: 'toggle',
          value: emailPrefs.feedbackReply,
          onChange: () => handleToggleEmailPref('feedbackReply'),
        },
        {
          key: 'emailFriendLinkStatus',
          label: t('settings.emailFriendLinkStatus'),
          desc: t('settings.emailFriendLinkStatusDesc'),
          type: 'toggle',
          value: emailPrefs.friendLinkStatus,
          onChange: () => handleToggleEmailPref('friendLinkStatus'),
        },
        {
          key: 'emailFriendLinkApply',
          label: t('settings.emailFriendLinkApply'),
          desc: t('settings.emailFriendLinkApplyDesc'),
          type: 'toggle',
          value: emailPrefs.friendLinkApply,
          onChange: () => handleToggleEmailPref('friendLinkApply'),
        },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/profile')}
          aria-label={t('common.goBack')}
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
          {group.groupDesc && (
            <p style={{
              fontSize: '12px', color: 'var(--text-secondary)',
              margin: '0 0 8px 0', lineHeight: 1.5,
            }}>{group.groupDesc}</p>
          )}
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
                ) : item.type === 'select' ? (
                  <select
                    value={item.value}
                    onChange={(e) => item.onChange(e.target.value)}
                    style={{
                      padding: '6px 10px', borderRadius: '8px', fontSize: '13px',
                      background: 'var(--input)', border: '1px solid var(--border)',
                      color: 'var(--foreground)', cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {item.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : item.type === 'theme' ? (
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {themeOptions.map(opt => (
                      <button
                        key={opt.mode}
                        onClick={() => {
                          setThemeModeTo(opt.mode);
                          showSaved();
                        }}
                        style={{
                          padding: '6px 10px', borderRadius: '8px', fontSize: '13px',
                          background: themeMode === opt.mode ? 'var(--primary-bg)' : 'var(--hover-bg)',
                          color: themeMode === opt.mode ? 'var(--primary)' : 'var(--foreground)',
                          border: themeMode === opt.mode ? '1px solid var(--primary-border)' : '1px solid var(--border)',
                          cursor: 'pointer', fontWeight: themeMode === opt.mode ? 600 : 400,
                          transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
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

      {/* ===== 个人背景图片设置 ===== */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px',
        }}>{t('settings.backgroundImage')}</h3>
        <p style={{
          fontSize: '12px', color: 'var(--text-secondary)',
          margin: '0 0 8px 0', lineHeight: 1.5,
        }}>{t('settings.backgroundImageDesc')}</p>
        <div style={{
          background: 'var(--card)', borderRadius: '12px',
          border: '1px solid var(--border)', padding: '16px',
        }}>
          {/* 启用开关 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0', borderBottom: bgPrefs.enabled ? '1px solid var(--border)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--foreground)' }}>
                {t('settings.backgroundEnable')}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {t('settings.backgroundEnableDesc')}
              </div>
            </div>
            <button
              onClick={() => updateBgPrefs({ enabled: !bgPrefs.enabled })}
              style={{
                width: '44px', height: '24px', borderRadius: '12px',
                border: 'none', cursor: 'pointer',
                background: bgPrefs.enabled ? 'var(--primary)' : 'var(--hover-bg)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#fff', position: 'absolute', top: '3px',
                left: bgPrefs.enabled ? '23px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </button>
          </div>

          {bgPrefs.enabled && (
            <div style={{ paddingTop: '12px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                  🖼️ {t('settings.backgroundImageLabel')}
                </label>
                <ImageUploader
                  label={t('settings.backgroundImageLabel')}
                  value={bgPrefs.image}
                  onChange={handleBgImageChange}
                  aspectRatio={16/9}
                  outputWidth={1920}
                  outputHeight={1080}
                  uploadEndpoint={API.USERS.BACKGROUND_UPLOAD}
                />
              </div>

              {bgPrefs.image && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      🔆 {t('settings.backgroundOpacityLabel')} ({bgPrefs.opacity}%)
                    </label>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={bgPrefs.opacity}
                      onChange={(e) => updateBgPrefs({ opacity: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {t('settings.backgroundOpacityHint')}
                    </p>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      🌫️ {t('settings.backgroundBlurLabel')} ({bgPrefs.blur}px)
                    </label>
                    <input
                      type="range" min="0" max="20" step="1"
                      value={bgPrefs.blur}
                      onChange={(e) => updateBgPrefs({ blur: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      {t('settings.backgroundBlurHint')}
                    </p>
                  </div>

                  <div style={{
                    marginTop: '8px', padding: '12px', borderRadius: '8px',
                    background: 'var(--background)', border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      position: 'relative', width: '100%', height: '80px',
                      borderRadius: '6px', overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${bgPrefs.image})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        opacity: bgPrefs.opacity / 100,
                        filter: bgPrefs.blur ? `blur(${bgPrefs.blur}px)` : 'none',
                      }} />
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ fontSize: '12px', color: 'var(--foreground)' }}>{t('settings.backgroundPreviewText')}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

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
