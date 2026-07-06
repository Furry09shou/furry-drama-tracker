import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const AdminStats = () => {
  const { admin } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    adminApi.get('/api/stats/overview')
      .then(res => { setStats(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  if (!admin) return null;
  if (loading) return <div className="admin-panel"><h2>{t('common.loading')}</h2></div>;
  if (!stats) return <div className="admin-panel"><h2>{t('adminStats.loadFailed')}</h2></div>;

  const statCards = [
    { label: t('adminStats.totalEpisodes'), value: stats.totalEpisodes, icon: '🎬' },
    { label: t('adminStats.pendingReview'), value: stats.pendingEpisodes, icon: '⏳' },
    { label: t('adminStats.totalUsers'), value: stats.totalUsers, icon: '👥' },
    { label: t('adminStats.totalFollows'), value: stats.totalFollows, icon: '❤️' },
    { label: t('adminStats.totalRatings'), value: stats.totalRatings, icon: '⭐' },
    { label: t('adminStats.pendingReports'), value: stats.pendingReports, icon: '🚨' },
    { label: t('adminStats.newUsers30d'), value: stats.newUsers, icon: '📈' },
    { label: t('adminStats.newEpisodes30d'), value: stats.newEpisodes, icon: '🆕' },
    { label: t('adminStats.activeUsers7d'), value: stats.activeUsers7d, icon: '🔥' },
    { label: t('adminStats.activeUsers30d'), value: stats.activeUsers30d, icon: '📊' },
  ];

  const maxUserTrend = Math.max(...(stats.userTrend || []).map(d => d.count), 1);
  const maxDailyActive = Math.max(...(stats.dailyActiveUsers || []).map(d => d.count), 1);
  const maxRatingDist = Math.max(...(stats.ratingDistribution || []).map(d => d.count), 1);

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2>📊 {t('adminStats.chartTitle')}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {statCards.map(card => (
          <div key={card.label} style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--foreground)' }}>{card.value}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(400px, 100%), 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>📈 {t('adminStats.newUsers7d')}</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {(stats.userTrend || []).map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', background: 'var(--btn-gradient)', borderRadius: '4px 4px 0 0', height: `${(d.count / maxUserTrend) * 80}px`, minHeight: '2px' }} title={`${d.count} ${t('common.people')}`} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>🔥 {t('adminStats.dailyActive7d')}</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {(stats.dailyActiveUsers || []).map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', background: 'var(--btn-gradient-success)', borderRadius: '4px 4px 0 0', height: `${(d.count / maxDailyActive) * 80}px`, minHeight: '2px' }} title={`${d.count} ${t('common.people')}`} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>⭐ {t('adminStats.ratingDistribution')}</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {(stats.ratingDistribution || []).map(d => (
              <div key={d._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', background: 'var(--warning-bg-strong)', borderRadius: '4px 4px 0 0', height: `${(d.count / maxRatingDist) * 80}px`, minHeight: '2px' }} title={`${d._id}${t('episode.scoreUnit')}: ${d.count}${t('common.people')}`} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{d._id}{t('episode.scoreUnit')}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>📊 {t('adminStats.episodeStatus')}</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {(stats.episodeStatusDist || []).map(d => (
              <div key={d._id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: d._id === 'ongoing' ? 'var(--success-text)' : d._id === 'completed' ? 'var(--info-text)' : 'var(--warning-text)' }}>{d.count}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d._id === 'ongoing' ? t('home.statusOngoing') : d._id === 'completed' ? t('home.statusCompleted') : d._id === 'upcoming' ? t('home.statusUpcoming') : d._id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(400px, 100%), 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>⭐ {t('adminStats.topRated')}</h3>
          {(stats.topRated || []).map((ep, i) => (
            <div key={ep._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.topRated.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--foreground)', fontSize: '13px' }}>{ep.title}</span>
              <span style={{ color: 'var(--warning-text)', fontSize: '13px', fontWeight: 600 }}>⭐ {ep.averageRating?.toFixed(1)} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '11px' }}>({ep.ratingCount}{t('common.people')})</span></span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>🔥 {t('adminStats.popularEpisodes')}</h3>
          {(stats.mostViewed || []).map((ep, i) => (
            <div key={ep._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.mostViewed.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--foreground)', fontSize: '13px' }}>{ep.title}</span>
              <span style={{ color: 'var(--primary-light)', fontSize: '13px', fontWeight: 600 }}>🔥 {ep.views}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>❤️ {t('adminStats.mostFollowed')}</h3>
          {(stats.mostFollowed || []).map((ep, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.mostFollowed.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--foreground)', fontSize: '13px' }}>{ep.title}</span>
              <span style={{ color: 'var(--destructive-text)', fontSize: '13px', fontWeight: 600 }}>❤️ {ep.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
