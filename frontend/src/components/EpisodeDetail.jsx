import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';

const EpisodeDetail = ({ user }) => {
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState([]);
  const [watchModal, setWatchModal] = useState(null);
  const [followedAtEpisodes, setFollowedAtEpisodes] = useState(null);
  const navigate = useNavigate();
  
  const episodeId = window.location.pathname.split('/').pop();
  
  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        const response = await axios.get(`/api/episodes/${episodeId}`);
        setEpisode(response.data);
        await axios.put(`/api/episodes/${episodeId}/view`);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching episode:', error);
        setLoading(false);
      }
    };
    fetchEpisode();
  }, [episodeId]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };
    axios.get(`/api/follows/check/${episodeId}`, config)
      .then(res => {
        setIsFollowing(res.data.isFollowing);
        if (res.data.isFollowing && res.data.followedAtEpisodes !== undefined) {
          setFollowedAtEpisodes(res.data.followedAtEpisodes);
        }
      })
      .catch(() => {});
    axios.get(`/api/histories/check/${episodeId}`, config)
      .then(res => setWatchedEpisodes(res.data.watchedEpisodes || []))
      .catch(() => {});
  }, [user, episodeId]);
  
  const handleWatch = async (singleEpisode) => {
    try {
      await axios.put(`/api/episodes/single/${singleEpisode._id}/view`);
    } catch (error) {
      console.error('Error updating view count:', error);
    }
    setWatchModal(singleEpisode);
  };

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

  const getEmbedUrl = (url) => {
    if (!url) return null;
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('bilibili.com') || urlObj.hostname.includes('b23.tv')) {
        const bvMatch = url.match(/\/(BV[\w]+)/);
        const aidMatch = url.match(/\/av(\d+)/);
        if (bvMatch) return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0`;
        if (aidMatch) return `https://player.bilibili.com/player.html?aid=${aidMatch[1]}&autoplay=0`;
      }
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        const videoId = url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
        if (videoId) return `https://www.youtube.com/embed/${videoId[1]}?autoplay=0`;
      }
      if (urlObj.hostname.includes('nicovideo.jp')) {
        const smMatch = url.match(/(sm\d+)/);
        if (smMatch) return `https://embed.nicovideo.jp/watch/${smMatch[1]}`;
      }
    } catch (e) {}
    return null;
  };

  const toPlainLinks = (platformLinks) => {
    if (!platformLinks) return {};
    if (typeof platformLinks === 'object' && !(platformLinks instanceof Map)) return platformLinks;
    try { return Object.fromEntries(platformLinks); } catch (e) { return {}; }
  };
  
  const handleFollow = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isFollowing) {
        await axios.post('/api/follows/remove', { episodeId }, config);
      } else {
        await axios.post('/api/follows/add', { episodeId }, config);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const recordWatchProgress = async (episodeNumber) => {
    if (!user || watchedEpisodes.includes(episodeNumber)) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('/api/histories/record', {
        episodeId, episodeNumber
      }, config);
      setWatchedEpisodes([...watchedEpisodes, episodeNumber]);
      axios.put('/api/notifications/read-episode/' + episodeId, {}, config).catch(() => {});
    } catch (error) {
      console.error('Error recording progress:', error);
    }
  };
  
  if (loading) {
    return <div className="container"><h2>加载中...</h2></div>;
  }
  
  if (!episode) {
    return <div className="container"><h2>剧集不存在</h2></div>;
  }
  
  return (
    <div className="episode-detail">
      <div style={{marginBottom: '20px'}}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          返回上一步
        </button>
      </div>
      <div className="episode-info">
        <img src={episode.coverImage} alt={episode.title} />
        <div className="episode-details">
          <h2>{episode.title}</h2>
          <p>{episode.description}</p>
          <div className="meta-info">
            <p><strong>状态：</strong>{episode.status === 'ongoing' ? '连载中' : episode.status === 'completed' ? '已完结' : '即将上映'}</p>
            <p><strong>集数：</strong>更新至第{episode.currentEpisodes}集，共{episode.totalEpisodes}集</p>
            <p><strong>分类：</strong>{episode.category.join(', ')}</p>
            <p><strong>热度：</strong>{episode.views} 次浏览</p>
            {(episode.createdBy || (episode.allowedEditors && episode.allowedEditors.length > 0)) && (
              <p><strong>作者：</strong>
                {episode.createdBy && (
                  <Link
                    to={`/creator/${episode.createdBy._id}`}
                    style={{color: 'var(--primary)', textDecoration: 'none', marginRight: '8px'}}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >{episode.createdBy.username}</Link>
                )}
                {episode.allowedEditors && episode.allowedEditors.map((editor, idx) => (
                  <span key={editor._id}>
                    {idx > 0 || episode.createdBy ? '、' : ''}
                    <Link
                      to={`/creator/${editor._id}`}
                      style={{color: 'var(--primary)', textDecoration: 'none'}}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >{editor.username}</Link>
                  </span>
                ))}
              </p>
            )}
            {user && watchedEpisodes.length > 0 && (
              <p><strong>观看进度：</strong>已看 {watchedEpisodes.length}/{episode.totalEpisodes} 集</p>
            )}
          </div>
          {user && (
            <button 
              className={`btn ${isFollowing ? 'btn-secondary' : ''}`}
              onClick={handleFollow}
            >
              {isFollowing ? '取消追番' : '追番'}
            </button>
          )}
        </div>
      </div>
      
      <div className="episodes-list">
        <h3>剧集列表</h3>
        {episode.episodes && episode.episodes.map(singleEpisode => (
          <div key={singleEpisode._id} className="episode-item" style={{
            opacity: watchedEpisodes.includes(singleEpisode.episodeNumber) ? 0.7 : 1
          }}>
            <div>
              <span className="episode-number">第{singleEpisode.episodeNumber}集</span>
              <span>{singleEpisode.title}</span>
              {singleEpisode.duration && <span> ({singleEpisode.duration})</span>}
              {watchedEpisodes.includes(singleEpisode.episodeNumber) ? (
                <span style={{
                  fontSize: '12px', color: '#22c55e', marginLeft: '8px',
                  background: 'rgba(34,197,94,0.15)', padding: '2px 8px',
                  borderRadius: '4px', border: '1px solid rgba(34,197,94,0.3)'
                }}>已看</span>
              ) : isFollowing && followedAtEpisodes !== null && singleEpisode.episodeNumber > followedAtEpisodes ? (
                <span style={{
                  fontSize: '12px', color: '#ef4444', marginLeft: '8px',
                  background: 'rgba(239,68,68,0.15)', padding: '2px 8px',
                  borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)'
                }}>新更新</span>
              ) : user && watchedEpisodes.length > 0 && (
                <span style={{
                  fontSize: '12px', color: '#f59e0b', marginLeft: '8px',
                  background: 'rgba(245,158,11,0.15)', padding: '2px 8px',
                  borderRadius: '4px', border: '1px solid rgba(245,158,11,0.3)'
                }}>未看</span>
              )}
            </div>
            <button 
              className="btn"
              onClick={() => handleWatch(singleEpisode)}
            >
              观看
            </button>
          </div>
        ))}
      </div>

      {watchModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setWatchModal(null)}>
          <div style={{
            background: 'var(--card)', borderRadius: '16px',
            maxWidth: '800px', width: '100%', maxHeight: '90vh',
            overflow: 'auto', border: '1px solid var(--border)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--border)'
            }}>
              <h3 style={{margin: 0, color: 'var(--foreground)'}}>
                第{watchModal.episodeNumber}集 - {watchModal.title}
              </h3>
              <button onClick={() => setWatchModal(null)} style={{
                background: 'none', border: 'none', color: 'var(--foreground)',
                fontSize: '24px', cursor: 'pointer', padding: '0 4px', lineHeight: 1
              }}>✕</button>
            </div>

            <div style={{padding: '20px 24px'}}>
              {(() => {
                const links = (() => {
                  const obj = toPlainLinks(watchModal.platformLinks);
                  return Object.fromEntries(
                    Object.entries(obj).filter(([_, url]) => url)
                  );
                })();
                const firstLink = Object.values(links)[0];
                const firstPlatform = Object.keys(links)[0];
                const embedUrl = firstLink ? getEmbedUrl(firstLink, firstPlatform) : null;

                return (
                  <>
                    <div style={{
                      width: '100%', aspectRatio: '16/9', borderRadius: '12px',
                      overflow: 'hidden', background: '#000', marginBottom: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          style={{width: '100%', height: '100%', border: 'none'}}
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <div style={{textAlign: 'center', color: '#94a3b8'}}>
                          <div style={{fontSize: '48px', marginBottom: '12px'}}>🎬</div>
                          <p>该集暂无可嵌入的预览视频</p>
                          <p style={{fontSize: '13px'}}>请通过下方平台链接观看</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 style={{color: 'var(--foreground)', marginBottom: '12px', fontSize: '15px'}}>
                        选择播放平台
                      </h4>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                        {Object.keys(links).length > 0 ? Object.entries(links).map(([platform, url]) => (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => recordWatchProgress(watchModal.episodeNumber)}
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
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)';
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
                        )) : (
                          <div style={{color: '#94a3b8', padding: '20px', textAlign: 'center', width: '100%'}}>
                            暂无可用播放平台
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
