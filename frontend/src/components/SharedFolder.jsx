import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import useTranslation from '../hooks/useTranslation';

const SharedFolder = () => {
  const { shareToken } = useParams();
  const { t } = useI18n();
  const { getLocalizedTitle } = useTranslation();
  const { user, getAuthHeaders } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchFolder = async () => {
      try {
        const res = await axios.get(`/api/folders/shared/${shareToken}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.status === 404 ? t('share.folderNotFound') : t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    if (shareToken) fetchFolder();
  }, [shareToken]);

  // 检查是否已收藏该收藏夹
  useEffect(() => {
    if (!user || !data) return;
    const checkSaved = async () => {
      try {
        const res = await axios.get('/api/saved-folders', { headers: getAuthHeaders() });
        const isSaved = res.data.some(sf => sf.shareToken === shareToken);
        setSaved(isSaved);
      } catch (err) {
        // ignore
      }
    };
    checkSaved();
  }, [user, data, shareToken]);

  const handleSaveFolder = async () => {
    if (!user || !data) return;
    setSaving(true);
    try {
      await axios.post('/api/saved-folders', {
        shareToken,
        creatorName: data.creatorName
      }, { headers: getAuthHeaders() });
      setSaved(true);
    } catch (err) {
      if (err.response?.data?.message) {
        alert(err.response.data.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUnsaveFolder = async () => {
    if (!user || !data) return;
    setSaving(true);
    try {
      const res = await axios.get('/api/saved-folders', { headers: getAuthHeaders() });
      const savedFolder = res.data.find(sf => sf.shareToken === shareToken);
      if (savedFolder) {
        await axios.delete(`/api/saved-folders/${savedFolder._id}`, { headers: getAuthHeaders() });
        setSaved(false);
      }
    } catch (err) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const isOwnFolder = user && data && user._id === data.creatorId;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
        <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
        <h2 style={{ marginBottom: '8px' }}>{error}</h2>
        <Link to="/" className="btn" style={{ marginTop: '16px', display: 'inline-block' }}>{t('nav.home')}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div style={{
        background: 'var(--card)', borderRadius: '16px',
        border: '1px solid var(--border)', padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>📂</span>
          <h1 style={{ margin: 0, fontSize: '24px' }}>{data.name}</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          {t('share.folderCount', { count: data.count })}
          {data.creatorName && ` · ${t('profile.createdBy', { name: data.creatorName })}`}
          {data.createdAt && ` · ${t('profile.createdAt', { date: new Date(data.createdAt).toLocaleDateString() })}`}
        </p>
        {data.description && (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', margin: '6px 0 0', fontStyle: 'italic' }}>
            {data.description}
          </p>
        )}
        {user && !isOwnFolder && (
          <div style={{ marginTop: '12px' }}>
            {saved ? (
              <button
                onClick={handleUnsaveFolder}
                disabled={saving}
                className="btn btn-secondary"
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ⭐ {t('share.folderSaved')}
              </button>
            ) : (
              <button
                onClick={handleSaveFolder}
                disabled={saving}
                className="btn"
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ☆ {t('share.saveFolder')}
              </button>
            )}
          </div>
        )}
      </div>

      {data.episodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          {t('share.folderEmpty')}
        </div>
      ) : (
        <div className="episode-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {data.episodes.map(ep => (
            <Link key={ep._id} to={`/episode/${ep._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="episode-card" style={{
                background: 'var(--card)', borderRadius: '12px',
                border: '1px solid var(--border)', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-modal)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <img src={ep.coverImage} alt={ep.title} style={{
                  width: '100%', aspectRatio: '3/4', objectFit: 'cover',
                  borderBottom: '1px solid var(--border)'
                }} />
                <div style={{ padding: '12px' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getLocalizedTitle(ep)}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {t('episode.updatedTo')}{ep.currentEpisodes}{ep.totalEpisodes === null ? t('episode.unknownTotal') : `${t('episode.epTotal')}${ep.totalEpisodes}`}{t('episode.epSuffix')}
                  </p>
                  {ep.averageRating > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--warning-text)' }}>
                      ⭐ {ep.averageRating}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedFolder;
