import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import useTranslation from '../hooks/useTranslation';

const SharedFolder = () => {
  const { shareToken } = useParams();
  const { t } = useI18n();
  const { getLocalizedTitle } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        </p>
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
                    {t('episode.updatedTo')}{ep.currentEpisodes}{t('episode.epTotal')}{ep.totalEpisodes}{t('episode.epSuffix')}
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
