import React from 'react';

const EpisodeList = ({ episodes, onEdit, onDelete }) => {
  if (episodes.length === 0) {
    return (
      <div className="empty-state">
        <p>暂无剧集，点击上方按钮添加新剧集</p>
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
            <h3>{episode.title}</h3>
            <p className="episode-description" style={{ maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {episode.description}
            </p>
            <div className="episode-meta" style={{ display: 'flex', gap: '15px', margin: '10px 0' }}>
              <span>总集数: {episode.totalEpisodes}</span>
              <span>当前: {episode.currentEpisodes}</span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: '10px', 
                fontSize: '12px',
                backgroundColor: episode.status === 'ongoing' ? 'rgba(16, 185, 129, 0.15)' : 
                                episode.status === 'completed' ? 'rgba(59, 130, 246, 0.15)' : 
                                'rgba(245, 158, 11, 0.15)',
                color: episode.status === 'ongoing' ? 'rgb(16, 185, 129)' : 
                       episode.status === 'completed' ? 'rgb(59, 130, 246)' : 
                       'rgb(245, 158, 11)'
              }}>
                {episode.status === 'ongoing' ? '连载中' : 
                 episode.status === 'completed' ? '已完结' : '即将上映'}
              </span>
            </div>
            {episode.category && episode.category.length > 0 && (
              <div className="episode-categories" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {episode.category.map(cat => (
                  <span key={cat} style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: 'rgb(99, 102, 241)'
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
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => onEdit(episode)}
            >
              编辑
            </button>
            <button 
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: 'rgb(239, 68, 68)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={() => onDelete(episode._id)}
            >
              删除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EpisodeList;
