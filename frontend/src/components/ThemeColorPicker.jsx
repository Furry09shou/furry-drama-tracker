import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import WallpaperPicker from './WallpaperPicker';

const GUEST_BG_KEY = 'guest_background_prefs';

const loadGuestBgPrefs = () => {
  try {
    const raw = localStorage.getItem(GUEST_BG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const saveGuestBgPrefs = (prefs) => {
  try {
    localStorage.setItem(GUEST_BG_KEY, JSON.stringify(prefs));
  } catch {}
};

const ThemeColorPicker = () => {
  const { accentColor, setAccentColor, presetColors } = useTheme();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState('color');
  const [bgPrefs, setBgPrefs] = useState({
    image: '', enabled: false, opacity: 30, blur: 0,
  });
  const pickerRef = useRef(null);

  // 初始化背景偏好
  useEffect(() => {
    if (user?.backgroundPrefs) {
      setBgPrefs({
        image: user.backgroundPrefs.image || '',
        enabled: !!user.backgroundPrefs.enabled,
        opacity: user.backgroundPrefs.opacity !== undefined ? user.backgroundPrefs.opacity : 30,
        blur: user.backgroundPrefs.blur !== undefined ? user.backgroundPrefs.blur : 0,
      });
    } else {
      const guest = loadGuestBgPrefs();
      if (guest) {
        setBgPrefs({
          image: guest.image || '',
          enabled: !!guest.enabled,
          opacity: guest.opacity !== undefined ? guest.opacity : 30,
          blur: guest.blur !== undefined ? guest.blur : 0,
        });
      }
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateBg = async (updates) => {
    const newPrefs = { ...bgPrefs, ...updates };
    setBgPrefs(newPrefs);
    if (user) {
      updateUser(prev => ({ ...prev, backgroundPrefs: newPrefs }));
      try {
        const axios = (await import('axios')).default;
        const API = (await import('../utils/apiEndpoints')).default;
        await axios.put(API.USERS.BACKGROUND_PREFS, updates);
      } catch {}
    } else {
      saveGuestBgPrefs(newPrefs);
      window.dispatchEvent(new CustomEvent('guest-bg-updated'));
    }
  };

  return (
    <div ref={pickerRef} style={{
      position: 'fixed', bottom: '20px', left: '20px', zIndex: 50
    }}>
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '48px', left: 0,
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-backdrop)',
          border: '1px solid var(--glass-border)', borderRadius: '12px',
          padding: '16px', width: 'min(280px, calc(100vw - 40px))',
          boxShadow: '0 8px 32px var(--shadow-modal)',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          {/* 标签切换 */}
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <button
              onClick={() => setTab('color')}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: '6px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: tab === 'color' ? 'var(--primary-bg)' : 'transparent',
                color: tab === 'color' ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none', transition: 'all 0.15s',
              }}
            >🎨 {t('settings.theme') || 'Color'}</button>
            <button
              onClick={() => setTab('bg')}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: '6px',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: tab === 'bg' ? 'var(--primary-bg)' : 'transparent',
                color: tab === 'bg' ? 'var(--primary)' : 'var(--text-secondary)',
                border: 'none', transition: 'all 0.15s',
              }}
            >🖼️ {t('settings.backgroundImageLabel') || 'Background'}</button>
          </div>

          {/* 主题色面板 */}
          {tab === 'color' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {presetColors.map(color => (
                  <button
                    key={color}
                    onClick={() => { setAccentColor(color); }}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: color,
                      border: accentColor === color ? '2px solid var(--foreground)' : '2px solid transparent',
                      cursor: 'pointer', transition: 'all 0.2s',
                      outline: 'none', padding: 0, boxShadow: accentColor === color ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                borderTop: '1px solid var(--border)', paddingTop: '12px'
              }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  style={{
                    width: '28px', height: '28px', border: 'none',
                    borderRadius: '6px', cursor: 'pointer', padding: 0,
                    background: 'transparent'
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custom</span>
                <span style={{
                  fontSize: '11px', color: 'var(--text-tertiary)',
                  fontFamily: 'monospace', marginLeft: 'auto'
                }}>{accentColor}</span>
              </div>
            </>
          )}

          {/* 背景图片面板 - 使用共享 WallpaperPicker */}
          {tab === 'bg' && (
            <>
              {/* 启用开关 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 0',
              }}>
                <span style={{ fontSize: '12px', color: 'var(--foreground)', fontWeight: 500 }}>
                  {t('settings.backgroundEnable')}
                </span>
                <button
                  onClick={() => updateBg({ enabled: !bgPrefs.enabled })}
                  style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    border: 'none', cursor: 'pointer',
                    background: bgPrefs.enabled ? 'var(--primary)' : 'var(--hover-bg)',
                    position: 'relative', transition: 'background 0.2s', padding: 0, flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: '#fff', position: 'absolute', top: '3px',
                    left: bgPrefs.enabled ? '19px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
              <WallpaperPicker bgPrefs={bgPrefs} updateBg={updateBg} compact />
            </>
          )}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-backdrop)',
          border: '1px solid var(--glass-border)',
          cursor: 'pointer', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s', opacity: 0.6,
          color: 'var(--foreground)', padding: 0
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
      >
        🎨
      </button>
    </div>
  );
};

export default ThemeColorPicker;
