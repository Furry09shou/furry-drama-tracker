import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import API from '../utils/apiEndpoints';
import axios from 'axios';

const WallpaperPicker = ({ bgPrefs, updateBg, compact = false }) => {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const [systemWallpapers, setSystemWallpapers] = useState([]);
  const [personalWallpapers, setPersonalWallpapers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 加载系统壁纸和个人壁纸列表
  useEffect(() => {
    axios.get(API.WALLPAPERS.SYSTEM).then(res => setSystemWallpapers(res.data || [])).catch(() => {});
    if (user?.personalWallpapers) {
      setPersonalWallpapers(user.personalWallpapers);
    }
  }, [user]);

  // 选择壁纸
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
        const formData = new FormData();
        formData.append('image', file);
        formData.append('name', file.name.replace(/\.[^.]+$/, ''));
        const res = await axios.post(API.WALLPAPERS.PERSONAL, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const newWp = { url: res.data.url, name: res.data.name, addedAt: res.data.addedAt };
        setPersonalWallpapers(prev => [...prev, newWp]);
        updateUser(prev => ({ ...prev, personalWallpapers: [...(prev.personalWallpapers || []), newWp] }));
        await updateBg({ image: res.data.url, enabled: true });
      } else {
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
      if (bgPrefs.image === url) {
        updateBg({ image: '', enabled: false });
      }
    } catch {}
  };

  // 压缩图片
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

  // 缩略图样式
  const thumbStyle = (url) => ({
    position: 'relative', paddingTop: '56.25%', padding: 0, cursor: 'pointer',
    borderRadius: compact ? '4px' : '6px', overflow: 'hidden', border: 'none',
    outline: bgPrefs.image === url ? `2px solid var(--primary)` : '2px solid transparent',
    outlineOffset: '-2px',
  });

  const checkBadge = (
    <div style={{
      position: 'absolute', top: '2px', right: '2px',
      width: compact ? '14px' : '16px', height: compact ? '14px' : '16px', borderRadius: '50%',
      background: 'var(--primary)', color: '#fff', fontSize: compact ? '8px' : '10px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>✓</div>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* 壁纸库区域 */}
      <div style={{ maxHeight: compact ? '280px' : '400px', overflowY: 'auto' }}>
        {/* 系统壁纸 */}
        {systemWallpapers.length > 0 && (
          <div style={{ marginBottom: compact ? '8px' : '12px' }}>
            <label style={{
              fontSize: compact ? '11px' : '13px', color: 'var(--text-secondary)',
              display: 'block', marginBottom: compact ? '4px' : '6px',
            }}>
              🖼️ {t('settings.wallpaperSystem')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compact ? 3 : 4}, 1fr)`, gap: compact ? '4px' : '6px' }}>
              {systemWallpapers.map(wp => (
                <button
                  key={wp._id || wp.url}
                  onClick={() => selectWallpaper(wp.url)}
                  style={thumbStyle(wp.url)}
                >
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${wp.url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
                  {bgPrefs.image === wp.url && checkBadge}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 我的壁纸 */}
        <div style={{ marginBottom: compact ? '8px' : '12px' }}>
          <label style={{
            fontSize: compact ? '11px' : '13px', color: 'var(--text-secondary)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: compact ? '4px' : '6px',
          }}>
            <span>👤 {t('settings.wallpaperPersonal')}</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: compact ? '2px 6px' : '4px 10px',
                fontSize: compact ? '11px' : '12px', fontWeight: 500,
                cursor: uploading ? 'wait' : 'pointer',
                borderRadius: '4px', border: '1px solid var(--primary-border)',
                background: 'var(--primary-bg)', color: 'var(--primary)',
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? '⏳' : `+ ${t('settings.wallpaperUpload')}`}
            </button>
          </label>
          {personalWallpapers.length === 0 ? (
            <p style={{
              fontSize: compact ? '11px' : '12px', color: 'var(--text-tertiary)',
              textAlign: 'center', padding: compact ? '8px 0' : '12px 0',
            }}>
              {user ? t('settings.wallpaperPersonalEmpty') : t('settings.backgroundGuestHint')}
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compact ? 3 : 4}, 1fr)`, gap: compact ? '4px' : '6px' }}>
              {personalWallpapers.map((wp, i) => (
                <button
                  key={wp.url || i}
                  onClick={() => selectWallpaper(wp.url)}
                  style={thumbStyle(wp.url)}
                >
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${wp.url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  }} />
                  {bgPrefs.image === wp.url && checkBadge}
                  {user && (
                    <div
                      onClick={(e) => deletePersonalWallpaper(wp.url, e)}
                      style={{
                        position: 'absolute', top: '2px', left: '2px',
                        width: compact ? '14px' : '16px', height: compact ? '14px' : '16px', borderRadius: '50%',
                        background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: compact ? '8px' : '9px',
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

        {/* 自定义 URL */}
        <div>
          <label style={{
            fontSize: compact ? '11px' : '13px', color: 'var(--text-secondary)',
            display: 'block', marginBottom: compact ? '4px' : '6px',
          }}>
            🔗 {t('settings.wallpaperCustomUrl')}
          </label>
          <input
            type="text"
            value={bgPrefs.image.startsWith('data:') ? '' : (bgPrefs.image.startsWith('/uploads/') || bgPrefs.image.startsWith('http') ? bgPrefs.image : '')}
            onChange={(e) => updateBg({ image: e.target.value })}
            placeholder={bgPrefs.image.startsWith('data:') ? t('settings.backgroundLocalImage') : 'https://...'}
            style={{
              width: '100%', padding: compact ? '4px 6px' : '8px 12px',
              fontSize: compact ? '11px' : '13px',
              borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--input)', color: 'var(--foreground)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* 透明度/模糊滑块 */}
      {bgPrefs.image && (
        <>
          <div style={{ marginTop: compact ? '8px' : '12px' }}>
            <label style={{
              fontSize: compact ? '11px' : '13px', color: 'var(--text-secondary)',
              display: 'flex', justifyContent: 'space-between', marginBottom: compact ? '2px' : '4px',
            }}>
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
          <div style={{ marginTop: compact ? '4px' : '8px' }}>
            <label style={{
              fontSize: compact ? '11px' : '13px', color: 'var(--text-secondary)',
              display: 'flex', justifyContent: 'space-between', marginBottom: compact ? '2px' : '4px',
            }}>
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
  );
};

export default WallpaperPicker;
