import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import API from '../utils/apiEndpoints';
import axios from 'axios';

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
  const [systemWallpapers, setSystemWallpapers] = useState([]);
  const [personalWallpapers, setPersonalWallpapers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const pickerRef = useRef(null);
  const fileInputRef = useRef(null);

  // 初始化背景偏好：已登录用户从 user 对象读取，未登录用户从 localStorage 读取
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

  // 加载系统壁纸和个人壁纸列表
  useEffect(() => {
    axios.get(API.WALLPAPERS.SYSTEM).then(res => setSystemWallpapers(res.data || [])).catch(() => {});
    if (user?.personalWallpapers) {
      setPersonalWallpapers(user.personalWallpapers);
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
        await axios.put(API.USERS.BACKGROUND_PREFS, updates);
      } catch {}
    } else {
      saveGuestBgPrefs(newPrefs);
      window.dispatchEvent(new CustomEvent('guest-bg-updated'));
    }
  };

  // 选择壁纸（点击缩略图设为当前背景）
  const selectWallpaper = (url) => {
    updateBg({ image: url, enabled: true });
  };

  // 上传个人壁纸（已登录）或 base64 本地（未登录）
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      if (user) {
        // 已登录：上传到后端作为个人壁纸
        const formData = new FormData();
        formData.append('image', file);
        formData.append('name', file.name.replace(/\.[^.]+$/, ''));
        const res = await axios.post(API.WALLPAPERS.PERSONAL, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const newWp = { url: res.data.url, name: res.data.name, addedAt: res.data.addedAt };
        setPersonalWallpapers(prev => [...prev, newWp]);
        updateUser(prev => ({ ...prev, personalWallpapers: [...(prev.personalWallpapers || []), newWp] }));
        // 自动选中新上传的壁纸
        await updateBg({ image: res.data.url, enabled: true });
      } else {
        // 未登录：压缩后转 base64 存 localStorage 并直接设为背景
        const dataUrl = await compressImage(file, 1920, 0.85);
        await updateBg({ image: dataUrl, enabled: true });
      }
    } catch {
      alert(t('settings.backgroundUploadFail') || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 删除个人壁纸
  const deletePersonalWallpaper = async (url, e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await axios.delete(API.WALLPAPERS.PERSONAL, { data: { url } });
      setPersonalWallpapers(prev => prev.filter(w => w.url !== url));
      updateUser(prev => ({ ...prev, personalWallpapers: (prev.personalWallpapers || []).filter(w => w.url !== url) }));
      // 如果当前使用的背景被删除，则关闭背景
      if (bgPrefs.image === url) {
        updateBg({ image: '', enabled: false });
      }
    } catch {}
  };

  // 压缩图片：缩放到指定最大宽度并转为 base64
  const compressImage = (file, maxW, quality) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxW) {
            height = Math.round(height * (maxW / width));
            width = maxW;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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
          padding: '16px', width: 'min(260px, calc(100vw - 40px))',
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
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px'
              }}>
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

          {/* 背景图片面板 */}
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

              {/* 壁纸库区域，最大高度可滚动 */}
              <div style={{ maxHeight: '320px', overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
                {/* 系统壁纸 */}
                {systemWallpapers.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      🖼️ {t('settings.wallpaperSystem')}
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {systemWallpapers.map(wp => (
                        <button
                          key={wp._id || wp.url}
                          onClick={() => selectWallpaper(wp.url)}
                          style={{
                            position: 'relative', paddingTop: '56.25%', padding: 0, cursor: 'pointer',
                            borderRadius: '6px', overflow: 'hidden', border: 'none',
                            outline: bgPrefs.image === wp.url ? '2px solid var(--primary)' : '2px solid transparent',
                            outlineOffset: '-2px',
                          }}
                        >
                          <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url(${wp.url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                          }} />
                          {bgPrefs.image === wp.url && (
                            <div style={{
                              position: 'absolute', top: '2px', right: '2px',
                              width: '16px', height: '16px', borderRadius: '50%',
                              background: 'var(--primary)', color: '#fff', fontSize: '10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✓</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 个人壁纸 */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span>👤 {t('settings.wallpaperPersonal')}</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={{
                        padding: '2px 8px', fontSize: '11px', fontWeight: 500, cursor: uploading ? 'wait' : 'pointer',
                        borderRadius: '4px', border: '1px solid var(--primary-border)',
                        background: 'var(--primary-bg)', color: 'var(--primary)',
                        opacity: uploading ? 0.6 : 1,
                      }}
                    >
                      {uploading ? '⏳' : `+ ${t('settings.wallpaperUpload')}`}
                    </button>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  {personalWallpapers.length === 0 ? (
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                      {user ? t('settings.wallpaperPersonalEmpty') : t('settings.backgroundGuestHint')}
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {personalWallpapers.map((wp, i) => (
                        <button
                          key={wp.url || i}
                          onClick={() => selectWallpaper(wp.url)}
                          style={{
                            position: 'relative', paddingTop: '56.25%', padding: 0, cursor: 'pointer',
                            borderRadius: '6px', overflow: 'hidden', border: 'none',
                            outline: bgPrefs.image === wp.url ? '2px solid var(--primary)' : '2px solid transparent',
                            outlineOffset: '-2px',
                          }}
                        >
                          <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url(${wp.url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                          }} />
                          {bgPrefs.image === wp.url && (
                            <div style={{
                              position: 'absolute', top: '2px', right: '2px',
                              width: '16px', height: '16px', borderRadius: '50%',
                              background: 'var(--primary)', color: '#fff', fontSize: '10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✓</div>
                          )}
                          {user && (
                            <div
                              onClick={(e) => deletePersonalWallpaper(wp.url, e)}
                              style={{
                                position: 'absolute', top: '2px', left: '2px',
                                width: '16px', height: '16px', borderRadius: '50%',
                                background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: '9px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >✕</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 自定义 URL 输入 */}
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    🔗 {t('settings.wallpaperCustomUrl')}
                  </label>
                  <input
                    type="text"
                    value={bgPrefs.image.startsWith('data:') ? '' : (bgPrefs.image.startsWith('/uploads/') || bgPrefs.image.startsWith('http') ? bgPrefs.image : '')}
                    onChange={(e) => updateBg({ image: e.target.value })}
                    placeholder={bgPrefs.image.startsWith('data:') ? t('settings.backgroundLocalImage') : 'https://...'}
                    style={{
                      width: '100%', padding: '6px 8px', fontSize: '12px',
                      borderRadius: '6px', border: '1px solid var(--border)',
                      background: 'var(--input)', color: 'var(--foreground)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {bgPrefs.image && (
                <>
                  {/* 透明度滑块 */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>🔆 {t('settings.backgroundOpacityLabel')}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>{bgPrefs.opacity}%</span>
                    </label>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={bgPrefs.opacity}
                      onChange={(e) => updateBg({ opacity: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>

                  {/* 模糊度滑块 */}
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>🌫️ {t('settings.backgroundBlurLabel')}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>{bgPrefs.blur}px</span>
                    </label>
                    <input
                      type="range" min="0" max="20" step="1"
                      value={bgPrefs.blur}
                      onChange={(e) => updateBg({ blur: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>
                </>
              )}
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
