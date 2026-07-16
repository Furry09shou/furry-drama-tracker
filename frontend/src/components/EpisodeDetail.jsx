import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import ReportModal from './ReportModal';
import ShareModal from './ShareModal';
import { useI18n } from '../contexts/I18nContext';
import useTranslation from '../hooks/useTranslation';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import API from '../utils/apiEndpoints';
import useScrollReveal from '../hooks/useScrollReveal';

const EpisodeDetail = ({ user }) => {
  const { t, lang } = useI18n();
  const { getLocalizedTitle, getLocalizedDescription } = useTranslation();
  const { settings: siteSettingsData } = useSiteSettings();
  const { getAuthHeaders } = useAuth();
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState([]);
  const [watchModal, setWatchModal] = useState(null);
  const [iframeReady, setIframeReady] = useState(false);
  const iframeTimerRef = useRef(null);
  const [followedAtEpisodes, setFollowedAtEpisodes] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [episodesExpanded, setEpisodesExpanded] = useState(false);
  const [episodeSortOrder, setEpisodeSortOrder] = useState('desc');
  const [favoriteFolders, setFavoriteFolders] = useState([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const favoriteBtnRef = useRef(null);

  const navigate = useNavigate();
  const { id: episodeId } = useParams();

  const [infoRef, infoVisible] = useScrollReveal();
  const [episodesRef, episodesVisible] = useScrollReveal();

  useEffect(() => {
    const controller = new AbortController();
    const fetchEpisode = async () => {
      try {
        const response = await axios.get(`${API.EPISODES}/${episodeId}`, { signal: controller.signal });
        setEpisode(response.data);
        setLoading(false);
        try {
          await axios.put(`/api/episodes/${episodeId}/view`, undefined, { signal: controller.signal });
        } catch (viewErr) {
          if (axios.isCancel?.(viewErr) || viewErr?.name === 'CanceledError') return;
        }
      } catch (error) {
        if (axios.isCancel?.(error) || error?.name === 'CanceledError') return;
        console.error('Error fetching episode:', error);
        setLoading(false);
      }
    };
    fetchEpisode();
    return () => controller.abort();
  }, [episodeId]);

  useEffect(() => {
    const controller = new AbortController();
    axios.get(API.STATS.RECOMMENDATIONS(episodeId), { signal: controller.signal })
      .then(res => setRecommendations(res.data))
      .catch((err) => {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {}
      });
    return () => controller.abort();
  }, [episodeId]);

  useEffect(() => {
    if (!user) return;
    const userData = localStorage.getItem('user');
    if (!userData) return;
    const controller = new AbortController();
    const config = { headers: getAuthHeaders(), signal: controller.signal };
    axios.get(`${API.EPISODES}/${episodeId}/user-status`, config)
      .then(res => {
        setIsFollowing(res.data.isFollowing);
        if (res.data.isFollowing && res.data.followedAtEpisodes !== undefined) {
          setFollowedAtEpisodes(res.data.followedAtEpisodes);
        }
        setWatchedEpisodes(res.data.watchedEpisodes || []);
        setUserRating(res.data.score);
        setIsFavorite(res.data.isFavorite);
      })
      .catch((err) => {
        if (axios.isCancel?.(err) || err?.name === 'CanceledError') return;
      });
    return () => controller.abort();
  }, [user, episodeId]);

  // 剧集详情页标题：剧集名称 - 网站名称
  useEffect(() => {
    if (!episode) return;
    const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
    const siteName = siteSettingsData?.[`browserTitle${suffix}`] || siteSettingsData?.browserTitle || t('site.defaultName');
    const episodeTitle = getLocalizedTitle(episode);
    if (episodeTitle) {
      document.title = `${episodeTitle} - ${siteName}`;
    }
    return () => {
      // 组件卸载时恢复标题由 App.jsx 的 useEffect 处理
    };
  }, [episode, lang, siteSettingsData, t, getLocalizedTitle]);

  const handleWatch = async (singleEpisode) => {
    try {
      await axios.put(`/api/episodes/single/${singleEpisode._id}/view`);
    } catch (error) {}
    recordWatchProgress(singleEpisode.episodeNumber);
    setIframeReady(false);
    setWatchModal(singleEpisode);
    if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current);
    iframeTimerRef.current = setTimeout(() => setIframeReady(true), 300);
  };

  const closeWatchModal = useCallback(() => {
    setIframeReady(false);
    if (iframeTimerRef.current) clearTimeout(iframeTimerRef.current);
    setWatchModal(null);
  }, []);

  const getPlatformIcon = (platform) => {
    const icons = {
      'bilibili': '📺', 'B站': '📺',
      'youtube': '▶️', 'YouTube': '▶️',
      'nicovideo': '🎬', 'N站': '🎬',
      'twitter': '🐦', 'Twitter': '🐦', 'X': '🐦',
      '网盘': '💾', '百度网盘': '💾', '蓝奏云': '💾',
    };
    return icons[platform] || '🔗';
  };

  const extractUrl = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    try {
      new URL(trimmed);
      return trimmed;
    } catch (e) {}
    const urlMatch = trimmed.match(/(https?:\/\/[^\s\u3000\u00A0]+)/);
    if (urlMatch) return urlMatch[1];
    return null;
  };

  const getEmbedUrl = (raw) => {
    const url = extractUrl(raw);
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      const h = urlObj.hostname;
      const isBilibili = h === 'bilibili.com' || h.endsWith('.bilibili.com') || h === 'b23.tv';
      const isYoutube = h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be';
      const isNico = h === 'nicovideo.jp' || h.endsWith('.nicovideo.jp');
      if (isBilibili) {
        const bvMatch = url.match(/\/(BV[\w]+)/);
        const aidMatch = url.match(/\/av(\d+)/);
        const page = urlObj.searchParams.get('p');
        const pageParam = page ? `&page=${page}` : '';
        if (bvMatch) return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0&high_quality=1${pageParam}`;
        if (aidMatch) return `https://player.bilibili.com/player.html?aid=${aidMatch[1]}&autoplay=0&high_quality=1${pageParam}`;
      }
      if (isYoutube) {
        const videoId = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
        if (videoId) return `https://www.youtube.com/embed/${videoId[1]}?autoplay=0`;
      }
      if (isNico) {
        const smMatch = url.match(/(sm\d+)/);
        if (smMatch) return `https://embed.nicovideo.jp/watch/${smMatch[1]}`;
      }
    } catch (e) {}
    return null;
  };

  const toPlainLinks = (platformLinks) => {
    if (!platformLinks) return {};
    let obj;
    if (typeof platformLinks === 'object' && !(platformLinks instanceof Map)) {
      obj = platformLinks;
    } else {
      try { obj = Object.fromEntries(platformLinks); } catch (e) { return {}; }
    }
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!value) continue;
      const extracted = extractUrl(value);
      cleaned[key] = extracted || value;
    }
    return cleaned;
  };

  const handleFollow = async () => {
    try {
      const config = { headers: getAuthHeaders() };
      if (isFollowing) {
        await axios.post('/api/follows/remove', { episodeId }, config);
        setFollowedAtEpisodes(null);
      } else {
        const res = await axios.post('/api/follows/add', { episodeId }, config);
        setFollowedAtEpisodes(res.data.followedAtEpisodes);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleFavorite = async (folderId) => {
    try {
      const config = { headers: getAuthHeaders() };
      if (isFavorite) {
        await axios.post('/api/favorites/remove', { episodeId }, config);
        setIsFavorite(false);
      } else {
        const data = { episodeId };
        if (folderId) data.folderId = folderId;
        await axios.post('/api/favorites/add', data, config);
        setIsFavorite(true);
      }
      setShowFolderPicker(false);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleOpenFolderPicker = async () => {
    if (isFavorite) {
      await handleFavorite();
      return;
    }
    try {
      const res = await axios.get('/api/folders?type=favorite', { headers: getAuthHeaders() });
      setFavoriteFolders(res.data || []);
      setShowFolderPicker(true);
    } catch (e) {
      handleFavorite();
    }
  };

  const handleRate = async (score) => {
    if (!user) return;
    try {
      const res = await axios.post(API.RATINGS, { episodeId, score }, {
        headers: getAuthHeaders()
      });
      setUserRating(score);
      if (episode) {
        setEpisode({
          ...episode,
          averageRating: res.data.averageRating,
          ratingCount: res.data.ratingCount
        });
      }
    } catch (error) {
      console.error('Error rating:', error);
      if (!navigator.onLine) {
        import('../utils/offlineQueue').then(({ addToOfflineQueue }) => {
          addToOfflineQueue({ method: 'post', url: '/api/ratings', data: { episodeId, score } });
        });
      }
    }
  };

  const handleDeleteRating = async () => {
    if (!user) return;
    try {
      const res = await axios.delete(`${API.RATINGS}/${episodeId}`, {
        headers: getAuthHeaders()
      });
      setUserRating(0);
      if (episode) {
        setEpisode({
          ...episode,
          averageRating: res.data.averageRating || 0,
          ratingCount: res.data.ratingCount || 0
        });
      }
    } catch (error) {
      console.error('Error deleting rating:', error);
    }
  };

  const recordWatchProgress = async (episodeNumber) => {
    if (!user) return;
    try {
      const config = { headers: getAuthHeaders() };
      await axios.post('/api/histories/record', {
        episodeId, episodeNumber
      }, config);
      if (!watchedEpisodes.includes(episodeNumber)) {
        setWatchedEpisodes([...watchedEpisodes, episodeNumber]);
      }
      axios.put('/api/notifications/read-episode/' + episodeId, {}, config).catch(() => {});
    } catch (error) {
      console.error('Error recording progress:', error);
    }
  };

  // 剧集列表折叠逻辑
  const sortedEpisodes = useMemo(() => episode?.episodes
    ? [...episode.episodes].sort((a, b) =>
        episodeSortOrder === 'asc' ? a.episodeNumber - b.episodeNumber : b.episodeNumber - a.episodeNumber
      )
    : [], [episode?.episodes, episodeSortOrder]);
  const DEFAULT_SHOW_COUNT = 5;
  const displayedEpisodes = episodesExpanded
    ? sortedEpisodes
    : sortedEpisodes.slice(0, DEFAULT_SHOW_COUNT);
  const hasMoreEpisodes = sortedEpisodes.length > DEFAULT_SHOW_COUNT;

  if (loading) {
    return <div className="container"><h2>{t('common.loading')}</h2></div>;
  }

  if (!episode) {
    return <div className="container"><h2>{t('episode.notFound')}</h2></div>;
  }

  return (
    <div className="episode-detail">
      <div style={{marginBottom: '20px'}}>
        <button className="btn btn-secondary" onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/', { replace: true });
          }
        }}>
          {t('common.goBack')}
        </button>
      </div>
      <div ref={infoRef} className={`reveal ${infoVisible ? 'visible' : ''}`}>
      <div className="episode-info">
        <img src={episode.coverImage} alt={episode.title} decoding="async" />
        <div className="episode-details">
          <h2>{getLocalizedTitle(episode)}</h2>
          <p>{getLocalizedDescription(episode)}</p>
          <div className="meta-info">
            <p><strong>{t('episode.status')}</strong>{episode.status === 'ongoing' ? t('home.statusOngoing') : episode.status === 'completed' ? t('home.statusCompleted') : t('home.statusUpcoming')}</p>
            {episode.status === 'upcoming' && episode.premiereDate && (
              <p><strong>{t('episode.premiereDate')}</strong><span style={{ color: 'var(--text-secondary)' }}>{new Date(episode.premiereDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
            )}
            {(episode.status === 'ongoing' || episode.status === 'completed') && episode.episodes && episode.episodes.length > 0 && (() => {
              const firstEp = [...episode.episodes].sort((a, b) => a.episodeNumber - b.episodeNumber)[0];
              const premiereDate = firstEp.releaseDate || firstEp.createdAt;
              if (!premiereDate) return null;
              return (
                <p><strong>{t('episode.firstAirDate')}</strong><span style={{ color: 'var(--text-secondary)' }}>{new Date(premiereDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
              );
            })()}
            <p><strong>{t('episode.episodeCount')}</strong>{t('episode.updatedTo')}{episode.currentEpisodes}{t('episode.epTotal')}{episode.totalEpisodes}{t('episode.epSuffix')}</p>
            <p><strong>{t('episode.category')}</strong>{episode.category?.join(', ') || t('common.none')}</p>
            {episode.tags && episode.tags.length > 0 && (
              <p><strong>{t('episode.tags')}</strong>{episode.tags.map((tag, i) => (
                <Link key={i} to={`/?tag=${encodeURIComponent(tag)}`} style={{
                  display: 'inline-block', padding: '2px 10px', marginRight: '6px',
                  background: 'var(--primary-bg)', color: 'var(--primary-light)',
                  borderRadius: '12px', fontSize: '13px', textDecoration: 'none',
                  border: '1px solid var(--primary-border)'
                }}>{tag}</Link>
              ))}</p>
            )}
            <p><strong>{t('episode.views')}</strong>{episode.views} {t('episode.viewCount')}</p>
            {episode.averageRating > 0 && (
              <p><strong>{t('episode.ratingLabel')}</strong>
                <span style={{color: 'var(--warning-text)'}}>⭐ {episode.averageRating}</span>
                <span style={{color: 'var(--text-tertiary)', fontSize: '13px', marginLeft: '6px'}}>
                  ({episode.ratingCount}{t('episode.ratingCountLabel')})
                </span>
              </p>
            )}
            {(() => {
              const showCreatedBy = !episode.hideCreator && episode.createdBy;
              const editors = (episode.allowedEditors && episode.allowedEditors.length > 0) ? episode.allowedEditors : [];
              const customAuthors = (episode.customAuthors && episode.customAuthors.length > 0) ? episode.customAuthors : [];
              const hasAnyAuthor = showCreatedBy || editors.length > 0 || customAuthors.length > 0;
              if (!hasAnyAuthor) return null;
              let authorIdx = 0;
              return (
                <p><strong>{t('episode.author')}</strong>
                  {showCreatedBy && (
                    <Link
                      to={`/creator/${episode.createdBy._id}`}
                      style={{color: 'var(--primary)', textDecoration: 'none', marginRight: '8px'}}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >{episode.createdBy.username}</Link>
                  )}
                  {editors.map((editor) => {
                    const sep = authorIdx++ > 0 ? '、' : '';
                    return (
                      <span key={`editor-${editor._id}`}>
                        {sep}
                        <Link
                          to={`/creator/${editor._id}`}
                          style={{color: 'var(--primary)', textDecoration: 'none'}}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >{editor.username}</Link>
                      </span>
                    );
                  })}
                  {customAuthors.map((author) => {
                    const sep = authorIdx++ > 0 ? '、' : '';
                    return (
                      <span key={`author-${author._id}`}>
                        {sep}
                        <Link
                          to={`/creator/${author._id}`}
                          style={{color: 'var(--primary)', textDecoration: 'none'}}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >{author.username}</Link>
                      </span>
                    );
                  })}
                </p>
              );
            })()}
            {user && isFollowing && (
              <p><strong>{t('episode.watchProgress')}</strong>{t('episode.watchedLabel')} {watchedEpisodes.length}/{episode.totalEpisodes} {t('episode.epSuffix')}</p>
            )}
          </div>
          <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'}}>
            {user && (
              <button
                className={`btn ${isFollowing ? 'btn-secondary' : ''}`}
                onClick={handleFollow}
              >
                {isFollowing ? t('episode.unfollow') : t('episode.follow')}
              </button>
            )}
            {user && (
              <div style={{position: 'relative', display: 'inline-block'}}>
                <button
                  ref={favoriteBtnRef}
                  className={`btn ${isFavorite ? 'btn-secondary' : ''}`}
                  onClick={handleOpenFolderPicker}
                  style={isFavorite ? {borderColor: 'var(--warning-text)', color: 'var(--warning-text)'} : {}}
                >
                  {isFavorite ? t('episode.favorited') : t('episode.favoriteLabel')}
                </button>
                {showFolderPicker && !isFavorite && favoriteBtnRef.current && createPortal(
                  <div style={{
                    position: 'fixed',
                    top: favoriteBtnRef.current.getBoundingClientRect().bottom + 4,
                    left: favoriteBtnRef.current.getBoundingClientRect().left,
                    zIndex: 9999,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '6px', minWidth: '180px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleFavorite(null)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--foreground)', borderRadius: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >📁 {t('profile.defaultFolder')}</button>
                    {favoriteFolders.map(folder => (
                      <button
                        key={folder._id}
                        onClick={() => handleFavorite(folder._id)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
                          color: 'var(--foreground)', borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >📂 {folder.name}</button>
                    ))}
                    <div style={{borderTop: '1px solid var(--border)', margin: '4px 0'}} />
                    <button
                      onClick={() => { setShowFolderPicker(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
                        color: 'var(--text-tertiary)', borderRadius: '4px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >{t('common.cancel')}</button>
                  </div>,
                  document.body
                )}
              </div>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => setShowShare(true)}
              style={{fontSize: '13px', padding: '8px 14px'}}
            >
              {t('episode.shareLabel')}
            </button>
            {user && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowReport(true)}
                style={{fontSize: '13px', padding: '8px 14px'}}
              >
                {t('episode.reportLabel')}
              </button>
            )}
            {user && (
              <div style={{display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px'}}>
                <span style={{fontSize: '14px', color: 'var(--text-secondary)', marginRight: '4px'}}>
                  {userRating > 0 ? t('episode.myRating') : t('episode.ratingLabel')}
                </span>
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => handleRate(star)}
                    aria-label={t('episode.starRating', { star })}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '22px', padding: '0 1px', lineHeight: 1,
                      filter: star <= (hoverRating || userRating) ? 'none' : 'grayscale(1) opacity(0.4)',
                      transition: 'filter 0.15s'
                    }}>⭐</button>
                ))}
                {userRating > 0 && (
                  <span style={{fontSize: '13px', color: 'var(--warning-text)', marginLeft: '4px'}}>{userRating}{t('episode.scoreUnit')}</span>
                )}
                {userRating > 0 && (
                  <button onClick={handleDeleteRating} style={{
                    marginLeft: '8px', padding: '2px 8px', borderRadius: '6px',
                    background: 'var(--destructive-bg)', color: 'var(--destructive-text)',
                    border: '1px solid var(--destructive-border)', cursor: 'pointer',
                    fontSize: '12px', transition: 'all 0.2s'
                  }}>{t('episode.withdrawRating')}</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <div ref={episodesRef} className={`reveal ${episodesVisible ? 'visible' : ''}`}>
      <div className="episodes-list">
        <h3>{t('episode.episodeList')}
          <button onClick={() => setEpisodeSortOrder(episodeSortOrder === 'asc' ? 'desc' : 'asc')} style={{
            marginLeft: '8px', padding: '4px 12px', borderRadius: '6px',
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            color: 'var(--foreground)', cursor: 'pointer', fontSize: '13px',
            transition: 'all 0.2s'
          }}>
            {episodeSortOrder === 'asc' ? t('episode.sortAsc') : t('episode.sortDesc')}
          </button>
        </h3>
        {displayedEpisodes.map(singleEpisode => (
          <div key={singleEpisode._id} className="episode-item" style={{
            opacity: watchedEpisodes.includes(singleEpisode.episodeNumber) ? 0.7 : 1
          }}>
            <div>
              <span className="episode-number">{t('episode.epPrefix')}{singleEpisode.episodeNumber}{t('episode.epSuffix')}</span>
              <span>{getLocalizedTitle(singleEpisode)}</span>
              {singleEpisode.duration && <span> ({singleEpisode.duration})</span>}
              {singleEpisode.isScheduled && singleEpisode.scheduledDate && (
                <span style={{
                  fontSize: '12px', color: 'var(--warning-text)', marginLeft: '8px',
                  background: 'var(--warning-bg)', padding: '2px 8px',
                  borderRadius: '4px', border: '1px solid var(--warning-border)'
                }}>{t('episode.preview')} {new Date(singleEpisode.scheduledDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'long', day: 'numeric' })}</span>
              )}
              {!singleEpisode.isScheduled && user && watchedEpisodes.includes(singleEpisode.episodeNumber) ? (
                <span style={{
                  fontSize: '12px', color: 'var(--success-text)', marginLeft: '8px',
                  background: 'var(--success-bg)', padding: '2px 8px',
                  borderRadius: '4px', border: '1px solid var(--success-border)'
                }}>{t('episode.watchedLabel')}</span>
              ) : !singleEpisode.isScheduled && user && isFollowing && followedAtEpisodes !== null && singleEpisode.episodeNumber > followedAtEpisodes ? (
                <span style={{
                  fontSize: '12px', color: 'var(--destructive-text)', marginLeft: '8px',
                  background: 'var(--destructive-bg)', padding: '2px 8px',
                  borderRadius: '4px', border: '1px solid var(--destructive-border)'
                }}>{t('episode.newUpdate')}</span>
              ) : !singleEpisode.isScheduled && user && !watchedEpisodes.includes(singleEpisode.episodeNumber) && (
                <span style={{
                  fontSize: '12px', color: 'var(--warning-text)', marginLeft: '8px',
                  background: 'var(--warning-bg)', padding: '2px 8px',
                  borderRadius: '4px', border: '1px solid var(--warning-border)'
                }}>{t('episode.unwatchedLabel')}</span>
              )}
            </div>
            <button
              className="btn"
              onClick={() => handleWatch(singleEpisode)}
            >
              {t('episode.watch')}
            </button>
          </div>
        ))}
        {hasMoreEpisodes && (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button onClick={() => setEpisodesExpanded(!episodesExpanded)} style={{
              padding: '8px 24px', borderRadius: '8px',
              background: 'var(--hover-bg)', border: '1px solid var(--border)',
              color: 'var(--foreground)', cursor: 'pointer', fontSize: '14px',
              transition: 'all 0.2s'
            }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
               onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--foreground)'; }}
            >
              {episodesExpanded ? t('episode.collapse') : `${t('episode.expandAll')} (${sortedEpisodes.length}${t('episode.epSuffix')})`}
            </button>
          </div>
        )}
      </div>
      </div>

      {recommendations.length > 0 && (
        <div style={{marginTop: '32px'}}>
          <h3 style={{marginBottom: '16px'}}>{t('episode.recommendations')}</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '16px'
          }}>
            {recommendations.map(rec => (
              <Link key={rec._id} to={`/episode/${rec._id}`} style={{
                textDecoration: 'none', color: 'var(--foreground)',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '12px', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-modal)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <img src={rec.coverImage} alt="" loading="lazy" decoding="async" style={{width: '100%', aspectRatio: '3/4', objectFit: 'cover'}} />
                <div style={{padding: '10px 12px'}}>
                  <div style={{fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{getLocalizedTitle(rec)}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px'}}>
                    {t('episode.epPrefix')}{rec.currentEpisodes}/{rec.totalEpisodes}{t('episode.epSuffix')}
                    {rec.averageRating > 0 && <span style={{color: 'var(--warning-text)', marginLeft: '6px'}}>⭐{rec.averageRating}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ReportModal
        show={showReport}
        onClose={() => setShowReport(false)}
        targetType="episode"
        targetId={episodeId}
        targetName={getLocalizedTitle(episode)}
      />

      <ShareModal
        show={showShare}
        onClose={() => setShowShare(false)}
        title={getLocalizedTitle(episode)}
        episodeId={episodeId}
      />

      {watchModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--overlay-bg)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0'
        }} onClick={() => closeWatchModal()}>
          <div style={{
            background: 'var(--card)', borderRadius: '16px',
            maxWidth: '800px', width: 'min(100%, calc(100vw - 32px))', maxHeight: '90vh',
            overflow: 'auto', border: '1px solid var(--border)',
            boxShadow: '0 25px 50px var(--shadow-strong)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px', borderBottom: '1px solid var(--border)'
            }}>
              <h3 style={{margin: 0, color: 'var(--foreground)'}}>
                {t('episode.epPrefix')}{watchModal.episodeNumber}{t('episode.epSuffix')} - {getLocalizedTitle(watchModal)}
              </h3>
              <button onClick={() => closeWatchModal()} aria-label={t('common.close')} style={{
                background: 'none', border: 'none', color: 'var(--foreground)',
                fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: 1
              }}>✕</button>
            </div>
            <div style={{padding: '16px'}}>
              {(() => {
                const links = (() => {
                  const obj = toPlainLinks(watchModal.platformLinks);
                  return Object.fromEntries(
                    Object.entries(obj).filter(([_, url]) => url)
                  );
                })();
                const firstLink = Object.values(links)[0];
                const embedUrl = firstLink ? getEmbedUrl(firstLink) : null;
                return (
                  <>
                    <div style={{
                      width: '100%', aspectRatio: '16/9', borderRadius: '12px',
                      overflow: 'hidden', background: 'var(--video-bg)', marginBottom: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {embedUrl ? (
                        iframeReady ? (
                          <iframe
                            src={embedUrl}
                            style={{width: '100%', height: '100%', border: 'none'}}
                            allowFullScreen
                            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        ) : (
                          <div style={{textAlign: 'center', color: 'var(--text-secondary)'}}>
                            <div style={{fontSize: '32px', marginBottom: '8px'}}>⏳</div>
                            <p style={{fontSize: '14px'}}>{t('common.loading')}</p>
                          </div>
                        )
                      ) : (
                        <div style={{textAlign: 'center', color: 'var(--text-secondary)'}}>
                          <div style={{fontSize: '48px', marginBottom: '12px'}}>🎬</div>
                          <p>{t('episode.noEmbedVideo')}</p>
                          <p style={{fontSize: '13px'}}>{t('episode.watchViaPlatform')}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 style={{color: 'var(--foreground)', marginBottom: '12px', fontSize: '15px'}}>
                        {t('episode.selectPlatform')}
                      </h4>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                        {Object.keys(links).length > 0 ? Object.entries(links).map(([platform, url]) => {
                          const isAbsoluteUrl = /^https?:\/\//i.test(url);
                          return (
                            <a
                              key={platform}
                              href={isAbsoluteUrl ? url : undefined}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                if (!isAbsoluteUrl) e.preventDefault();
                                recordWatchProgress(watchModal.episodeNumber);
                              }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '8px',
                              padding: '10px 20px', borderRadius: '10px',
                              background: 'var(--glass-bg)', border: '1px solid var(--border)',
                              color: 'var(--foreground)', textDecoration: 'none',
                              fontSize: '14px', fontWeight: '500',
                              transition: 'all 0.2s ease', cursor: 'pointer',
                              backdropFilter: 'blur(10px)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = 'var(--primary)';
                              e.currentTarget.style.color = 'var(--primary)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px var(--primary-border)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border)';
                              e.currentTarget.style.color = 'var(--foreground)';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <span>{getPlatformIcon(platform)}</span>
                            <span>{platform}</span>
                          </a>
                          );
                        }) : (
                          <div style={{color: 'var(--text-secondary)', padding: '20px', textAlign: 'center', width: '100%'}}>
                            {t('episode.noPlatform')}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EpisodeDetail;
