import React from 'react';
import { Link } from 'react-router-dom';

const EpisodeCard = React.memo(({ episode, t, getLocalizedTitle, getLocalizedDescription, onTagClick }) => {
  const STATUS_MAP = {
    ongoing: { text: t('home.statusOngoing'), cls: 'ongoing' },
    completed: { text: t('home.statusCompleted'), cls: 'completed' },
    upcoming: { text: t('home.statusUpcoming'), cls: 'upcoming' },
  };

  const formatViews = (views) => {
    if (!views && views !== 0) return '0';
    if (views >= 10000) return (views / 10000).toFixed(1) + t('common.tenThousand');
    return String(views);
  };

  const truncateDesc = (desc, maxLen = 50) => {
    if (!desc) return t('episode.noDescription');
    return desc.length > maxLen ? desc.slice(0, maxLen) + '...' : desc;
  };

  const statusInfo = STATUS_MAP[episode.status] || STATUS_MAP.ongoing;
  const authorName = episode.createdBy?.username || '';
  const avgRating = episode.averageRating != null ? episode.averageRating.toFixed(1) : '-';
  const ratingCount = episode.ratingCount || 0;

  return (
    <Link to={`/episode/${episode._id}`} className="episode-card">
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img src={episode.coverImage} alt={episode.title} />
        <span className={`status ${statusInfo.cls}`} style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
        }}>
          {statusInfo.text}
        </span>
        {(episode.currentEpisodes != null && episode.totalEpisodes != null) && (
          <span style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 500,
          }}>
            {t('home.episodeProgress', { current: episode.currentEpisodes, total: episode.totalEpisodes })}
          </span>
        )}
      </div>
      <div className="card-content">
        <h3>{getLocalizedTitle(episode)}</h3>
        <p>{truncateDesc(getLocalizedDescription(episode))}</p>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          marginTop: '4px',
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            🔥 {formatViews(episode.views)}
          </span>
          <span style={{ color: 'var(--warning-text, #f59e0b)' }}>
            ⭐ {avgRating}{ratingCount > 0 ? ` (${ratingCount}${t('common.people')})` : ''}
          </span>
        </div>

        {episode.category && episode.category.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginTop: '6px',
          }}>
            {episode.category.slice(0, 2).map((cat, i) => (
              <span
                key={i}
                style={{
                  padding: '1px 8px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--primary)',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {episode.tags && episode.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginTop: '4px',
          }}>
            {episode.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                style={{
                  padding: '1px 8px',
                  borderRadius: '10px',
                  background: 'var(--hover-bg-stronger, var(--hover-bg))',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {authorName && (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginTop: '4px',
          }}>
            {t('home.author')}: {authorName}
          </div>
        )}
      </div>
    </Link>
  );
});

export default EpisodeCard;
