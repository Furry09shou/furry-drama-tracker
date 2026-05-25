import React from 'react';
import useTranslation from '../hooks/useTranslation';
import { useI18n } from '../contexts/I18nContext';

const EpisodeList = ({ episodes, onEdit, onDelete }) => {
  const { getLocalizedTitle, getLocalizedDescription } = useTranslation();
  const { t } = useI18n();
  if (episodes.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('episodeList.noEpisodes')}</p>
      </div>
    );
  }

  return (
    <div className="episode-list">
      {episodes.map(episode => (
        <div key={episode._id} className="episode-card">
          <div className="episode-cover">
            {episode.coverImage && (
              <img 
                src={episode.coverImage} 
                alt={episode.title} 
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
            )}
          </div>
          <div className="episode-info">
            <h3>{getLocalizedTitle(episode)}</h3>
            <p className="episode-description" style={{ maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getLocalizedDescription(episode)}
            </p>
            <div className="episode-meta" style={{ display: 'flex', gap: '15px', margin: '10px 0' }}>
              <span>{t('episodeList.totalEpisodes')}: {episode.totalEpisodes}</span>
              <span>{t('episodeList.currentEpisodes')}: {episode.currentEpisodes}</span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: '10px', 
                fontSize: '12px',
                backgroundColor: episode.status === 'ongoing' ? 'var(--success-bg)' : 
                                episode.status === 'completed' ? 'var(--info-bg)' : 
                                'var(--warning-bg)',
                color: episode.status === 'ongoing' ? 'var(--secondary)' : 
                       episode.status === 'completed' ? 'var(--info)' : 
                       'var(--warning-text)'
              }}>
                {episode.status === 'ongoing' ? t('home.statusOngoing') : 
                 episode.status === 'completed' ? t('home.statusCompleted') : t('home.statusUpcoming')}
              </span>
            </div>
            {episode.category && episode.category.length > 0 && (
              <div className="episode-categories" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {episode.category.map(cat => (
                  <span key={cat} style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: 'var(--primary-bg)',
                    color: 'var(--primary)'
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="episode-actions" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button 
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-light)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => onEdit(episode)}
            >
              {t('common.edit')}
            </button>
            <button 
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid var(--destructive-border)',
                backgroundColor: 'var(--destructive-bg)',
                color: 'var(--destructive-text)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => onDelete(episode._id)}
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EpisodeList;
