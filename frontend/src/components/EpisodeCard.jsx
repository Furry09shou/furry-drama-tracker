import React, { useRef, useState, useEffect } from 'react';
import { Flame, Star } from 'lucide-react';
import TransitionLink from './TransitionLink';

const EpisodeCard = React.memo(({ episode, highlightQuery, t, getLocalizedTitle, getLocalizedDescription, onTagClick }) => {
  const imgRef = useRef(null);
  const [imgVisible, setImgVisible] = useState(false);

  useEffect(() => {
    if (!imgRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setImgVisible(true); observer.disconnect(); } },
      { rootMargin: '100px' }
    );
    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  const STATUS_MAP = {
    ongoing: { text: t('home.statusOngoing'), cls: 'ongoing' },
    completed: { text: t('home.statusCompleted'), cls: 'completed' },
    upcoming: { text: t('home.statusUpcoming'), cls: 'upcoming' },
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} style={{background:'var(--primary)',color:'var(--btn-text)',padding:'0 2px',borderRadius:'2px'}}>{part}</mark>
        : part
    );
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
  // 作者显示逻辑：hideCreator 仅隐藏 createdBy，allowedEditors 和 customAuthors 始终显示
  const authorNames = [];
  if (!episode.hideCreator && episode.createdBy?.username) {
    authorNames.push(episode.createdBy.username);
  }
  if (episode.allowedEditors && episode.allowedEditors.length > 0) {
    episode.allowedEditors.forEach(e => { if (e?.username) authorNames.push(e.username); });
  }
  if (episode.customAuthors && episode.customAuthors.length > 0) {
    episode.customAuthors.forEach(a => { if (a?.username) authorNames.push(a.username); });
  }
  const authorName = authorNames.join('、');
  const avgRating = episode.averageRating != null ? episode.averageRating.toFixed(1) : '-';
  const ratingCount = episode.ratingCount || 0;

  return (
    <TransitionLink to={`/episode/${episode._id}`} className="episode-card card-hover" tabIndex={0} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 200px', containerType: 'inline-size', containerName: 'episode-card' }}>
      <div ref={imgRef} style={{ position: 'relative', overflow: 'hidden' }}>
        <img src={imgVisible ? episode.coverImage : ''} alt={episode.title} loading="lazy" decoding="async" style={{
          opacity: imgVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }} />
        <span className={`status ${statusInfo.cls}`} style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
        }}>
          {statusInfo.text}
        </span>
        {episode.currentEpisodes != null && (
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
            {episode.totalEpisodes === null
              ? t('home.episodeProgressUnknown', { current: episode.currentEpisodes })
              : t('home.episodeProgress', { current: episode.currentEpisodes, total: episode.totalEpisodes })}
          </span>
        )}
      </div>
      <div className="card-content episode-card-inner">
        <h3>{highlightText(getLocalizedTitle(episode), highlightQuery)}</h3>
        <p>{truncateDesc(getLocalizedDescription(episode))}</p>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          marginTop: '4px',
        }}>
          <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Flame size={13} strokeWidth={2} style={{ display: 'inline-block', verticalAlign: '-2px' }} aria-hidden="true" /> {formatViews(episode.views)}
          </span>
          <span style={{ color: 'var(--warning-text, #f59e0b)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Star size={13} strokeWidth={2} style={{ display: 'inline-block', verticalAlign: '-2px' }} aria-hidden="true" fill="currentColor" /> {avgRating}{ratingCount > 0 ? ` (${ratingCount}${t('common.people')})` : ''}
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
    </TransitionLink>
  );
});

export default EpisodeCard;
