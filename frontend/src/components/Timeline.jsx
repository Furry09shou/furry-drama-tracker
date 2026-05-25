import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import useTranslation from '../hooks/useTranslation';

const typeIcons = {
  new_episode: '🎬',
  status_change: '📊',
  new_rating: '⭐',
};

const Timeline = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { getLocalizedTitle } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(user ? 'my' : 'public');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!user && activeTab === 'my') {
      setActiveTab('public');
    }
  }, [user, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    const endpoint = activeTab === 'my'
      ? `/api/activity?page=${page}&limit=20`
      : `/api/activity/public`;

    const config = {};
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }
    }

    axios.get(endpoint, config)
      .then(res => {
        setActivities(res.data.activities || []);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch(() => {
        setActivities([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, page, user]);

  const formatRelativeTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return t('timeline.justNow');
    if (diff < 3600000) return t('timeline.minutesAgo').replace('{n}', Math.floor(diff / 60000));
    if (diff < 86400000) return t('timeline.hoursAgo').replace('{n}', Math.floor(diff / 3600000));
    return t('timeline.daysAgo').replace('{n}', Math.floor(diff / 86400000));
  };

  const getStatusLabel = (status) => {
    if (status === 'ongoing') return t('episode.statusOngoing');
    if (status === 'completed') return t('episode.statusCompleted');
    return t('episode.statusUpcoming');
  };

  const getDescription = (activity) => {
    const title = getLocalizedTitle({ title: activity.episodeTitle, titleEn: activity.episodeTitleEn });
    switch (activity.type) {
      case 'new_episode':
        return t('timeline.newEpisode', { title, ep: activity.metadata?.episodeNumber || '', epTitle: activity.metadata?.singleEpisodeTitleEn && lang === 'en' ? activity.metadata.singleEpisodeTitleEn : (activity.metadata?.singleEpisodeTitle || '') });
      case 'status_change':
        return t('timeline.statusChange', { title, status: getStatusLabel(activity.metadata?.status) });
      case 'new_rating':
        return t('timeline.newRating', { title, score: activity.metadata?.score || activity.metadata?.averageRating || 0, count: activity.metadata?.ratingCount || 0 });
      default:
        return activity.description;
    }
  };

  const tabs = [
    { key: 'my', label: t('timeline.myTimeline'), requiresAuth: true },
    { key: 'public', label: t('timeline.discover'), requiresAuth: false },
  ].filter(tab => !tab.requiresAuth || user);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px' }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'var(--foreground)',
        marginBottom: '20px',
      }}>{t('timeline.title')}</h2>

      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        background: 'var(--hover-bg)',
        borderRadius: '12px',
        padding: '4px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '10px',
              background: activeTab === tab.key ? 'var(--card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--foreground)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === tab.key ? '0 2px 8px var(--shadow-card)' : 'none',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '12px',
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, var(--hover-bg) 25%, var(--hover-bg-strong) 50%, var(--hover-bg) 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  height: '16px',
                  width: '70%',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, var(--hover-bg) 25%, var(--hover-bg-strong) 50%, var(--hover-bg) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
                }} />
                <div style={{
                  height: '12px',
                  width: '40%',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, var(--hover-bg) 25%, var(--hover-bg-strong) 50%, var(--hover-bg) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
                }} />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '16px', margin: '0 0 8px', fontWeight: 600 }}>{t('timeline.empty')}</p>
          <p style={{ fontSize: '14px', margin: 0, color: 'var(--text-tertiary)' }}>{t('timeline.emptyDesc')}</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activities.map((activity, index) => (
              <div
                key={`${activity.type}-${activity.episodeId}-${index}`}
                onClick={() => navigate(`/episode/${activity.episodeId}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px var(--shadow-card)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>
                  {typeIcons[activity.type] || '📌'}
                </span>

                {activity.coverImage && (
                  <img
                    src={activity.coverImage}
                    alt=""
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: '1px solid var(--border)',
                    }}
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    color: 'var(--foreground)',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {getDescription(activity)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    marginTop: '4px',
                  }}>
                    {formatRelativeTime(activity.date)}
                  </div>
                </div>

                <svg
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="var(--text-tertiary)" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            ))}
          </div>

          {activeTab === 'my' && totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '24px',
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: page === 1 ? 'var(--text-tertiary)' : 'var(--foreground)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >‹</button>
              <span style={{
                padding: '8px 16px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
              }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: page === totalPages ? 'var(--text-tertiary)' : 'var(--foreground)',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  opacity: page === totalPages ? 0.5 : 1,
                }}
              >›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Timeline;
