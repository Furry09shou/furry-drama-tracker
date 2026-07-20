import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import API from '../utils/apiEndpoints';

const SystemWallpaperManager = () => {
  const { t } = useI18n();
  const [wallpapers, setWallpapers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const loadWallpapers = async () => {
    try {
      const res = await axios.get('/api/wallpapers/system/all');
      setWallpapers(res.data || []);
    } catch {}
  };

  useEffect(() => { loadWallpapers(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('name', file.name.replace(/\.[^.]+$/, ''));
      await axios.post('/api/wallpapers/system', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await loadWallpapers();
    } catch {
      alert(t('adminContent.wallpaperUploadFail'));
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (id, enabled) => {
    try {
      await axios.put(`/api/wallpapers/system/${id}`, { enabled: !enabled });
      setWallpapers(prev => prev.map(w => w._id === id ? { ...w, enabled: !enabled } : w));
    } catch {}
  };

  const handleDelete = async (id, url) => {
    if (!confirm(t('adminContent.wallpaperDeleteConfirm'))) return;
    try {
      await axios.delete(`/api/wallpapers/system/${id}`);
      setWallpapers(prev => prev.filter(w => w._id !== id));
    } catch {}
  };

  return (
    <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
      <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>
        🖼️ {t('adminContent.wallpaperLibraryTitle')}
      </h4>
      <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {t('adminContent.wallpaperLibraryDesc')}
      </p>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{
          padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: uploading ? 'wait' : 'pointer',
          borderRadius: '8px', border: '1px solid var(--primary-border)',
          background: 'var(--primary)', color: '#fff', marginBottom: '12px',
          opacity: uploading ? 0.6 : 1, transition: 'all 0.15s',
        }}
      >
        {uploading ? `⏳ ${t('adminContent.wallpaperUploading')}` : `+ ${t('adminContent.wallpaperUpload')}`}
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />

      {wallpapers.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '12px', textAlign: 'center' }}>
          {t('adminContent.wallpaperEmpty')}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
          {wallpapers.map(wp => (
            <div key={wp._id} style={{
              position: 'relative', borderRadius: '8px', overflow: 'hidden',
              border: `2px solid ${wp.enabled ? 'var(--primary-border)' : 'var(--border)'}`,
              opacity: wp.enabled ? 1 : 0.5,
            }}>
              <div style={{
                width: '100%', paddingTop: '56.25%',
                backgroundImage: `url(${wp.url})`, backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
              <div style={{
                position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px',
              }}>
                <button
                  onClick={() => handleToggle(wp._id, wp.enabled)}
                  title={wp.enabled ? t('adminContent.wallpaperDisable') : t('adminContent.wallpaperEnable')}
                  style={{
                    width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: wp.enabled ? 'var(--primary)' : 'var(--hover-bg)',
                    color: wp.enabled ? '#fff' : 'var(--foreground)', fontSize: '11px', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >{wp.enabled ? '✓' : '✕'}</button>
                <button
                  onClick={() => handleDelete(wp._id, wp.url)}
                  title={t('adminContent.wallpaperDelete')}
                  style={{
                    width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: '11px', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >🗑</button>
              </div>
              {wp.name && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '4px 6px', fontSize: '10px', color: '#fff',
                  background: 'rgba(0,0,0,0.6)', textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{wp.name}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemWallpaperManager;
