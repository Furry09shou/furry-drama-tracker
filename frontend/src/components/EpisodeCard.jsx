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
    <TransitionLink to={`/episode/${episode._id}`} className="episode-card card-hover ec" tabIndex={0} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 200px', containerType: 'inline-size', containerName: 'episode-card' }}>
      <div ref={imgRef} className="ec-media">
        <img src={imgVisible ? episode.coverImage : ''} alt={episode.title} loading="lazy" decoding="async" className="ec-img" style={{
          opacity: imgVisible ? 1 : 0,
          transition: 'opacity 0.5s var(--ease-out), transform 0.6s var(--ease-out)',
        }} />
        <span className="ec-media-shade" aria-hidden="true" />
        <span className={`status ec-status ${statusInfo.cls}`}>{statusInfo.text}</span>
        {episode.currentEpisodes != null && (
          <span className="ec-eps">
            {episode.totalEpisodes === null
              ? t('home.episodeProgressUnknown', { current: episode.currentEpisodes })
              : t('home.episodeProgress', { current: episode.currentEpisodes, total: episode.totalEpisodes })}
          </span>
        )}
      </div>
      <div className="card-content ec-body episode-card-inner">
        <h3 className="ec-title">{highlightText(getLocalizedTitle(episode), highlightQuery)}</h3>
        <p className="ec-desc">{truncateDesc(getLocalizedDescription(episode))}</p>

        <div className="ec-meta">
          <span className="ec-meta-item ec-views">
            <Flame size={13} strokeWidth={2} aria-hidden="true" /> {formatViews(episode.views)}
          </span>
          <span className="ec-meta-item ec-rating">
            <Star size={13} strokeWidth={2} aria-hidden="true" fill="currentColor" /> {avgRating}{ratingCount > 0 ? ` (${ratingCount}${t('common.people')})` : ''}
          </span>
        </div>

        {episode.category && episode.category.length > 0 && (
          <div className="ec-cats">
            {episode.category.slice(0, 2).map((cat, i) => (
              <span key={i} className="ec-cat">{cat}</span>
            ))}
          </div>
        )}

        {episode.tags && episode.tags.length > 0 && (
          <div className="ec-tags">
            {episode.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="ec-tag"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(tag);
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {authorName && (
          <div className="ec-author">{t('home.author')}: {authorName}</div>
        )}
      </div>
    </TransitionLink>
  );
});

export default EpisodeCard;
