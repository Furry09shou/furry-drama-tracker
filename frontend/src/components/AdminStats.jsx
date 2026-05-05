import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminStats = () => {
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!admin) return;
    const token = localStorage.getItem('adminToken');
    axios.get('/api/stats/overview', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setStats(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [admin]);

  if (!admin) return null;
  if (loading) return <div className="admin-panel"><h2>加载中...</h2></div>;
  if (!stats) return <div className="admin-panel"><h2>加载失败</h2></div>;

  const statCards = [
    { label: '剧集总数', value: stats.totalEpisodes, icon: '🎬' },
    { label: '待审核', value: stats.pendingEpisodes, icon: '⏳' },
    { label: '用户总数', value: stats.totalUsers, icon: '👥' },
    { label: '追番总数', value: stats.totalFollows, icon: '❤️' },
    { label: '评分总数', value: stats.totalRatings, icon: '⭐' },
    { label: '待处理举报', value: stats.pendingReports, icon: '🚨' },
    { label: '近30天新用户', value: stats.newUsers, icon: '📈' },
    { label: '近30天新剧集', value: stats.newEpisodes, icon: '🆕' },
    { label: '7日活跃用户', value: stats.activeUsers7d, icon: '🔥' },
    { label: '30日活跃用户', value: stats.activeUsers30d, icon: '📊' },
  ];

  const maxUserTrend = Math.max(...(stats.userTrend || []).map(d => d.count), 1);
  const maxDailyActive = Math.max(...(stats.dailyActiveUsers || []).map(d => d.count), 1);
  const maxRatingDist = Math.max(...(stats.ratingDistribution || []).map(d => d.count), 1);

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link to="/admin/dashboard" className="btn btn-secondary">返回上一步</Link>
        <h2>📊 数据统计</h2>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>📈 近7天新用户</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {(stats.userTrend || []).map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', background: 'var(--btn-gradient)', borderRadius: '4px 4px 0 0', height: `${(d.count / maxUserTrend) * 80}px`, minHeight: '2px' }} title={`${d.count} 人`} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>🔥 近7天日活用户</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {(stats.dailyActiveUsers || []).map(d => (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', background: 'var(--btn-gradient-success)', borderRadius: '4px 4px 0 0', height: `${(d.count / maxDailyActive) * 80}px`, minHeight: '2px' }} title={`${d.count} 人`} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>⭐ 评分分布</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
            {(stats.ratingDistribution || []).map(d => (
              <div key={d._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', background: 'var(--warning-bg-strong)', borderRadius: '4px 4px 0 0', height: `${(d.count / maxRatingDist) * 80}px`, minHeight: '2px' }} title={`${d._id}分: ${d.count}人`} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{d._id}分</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>📊 剧集状态分布</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {(stats.episodeStatusDist || []).map(d => (
              <div key={d._id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: d._id === 'ongoing' ? 'var(--success-text)' : d._id === 'completed' ? 'var(--info-text)' : 'var(--warning-text)' }}>{d.count}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d._id === 'ongoing' ? '连载中' : d._id === 'completed' ? '已完结' : d._id === 'upcoming' ? '即将上映' : d._id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>⭐ 评分最高</h3>
          {(stats.topRated || []).map((ep, i) => (
            <div key={ep._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.topRated.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--foreground)', fontSize: '13px' }}>{ep.title}</span>
              <span style={{ color: 'var(--warning-text)', fontSize: '13px', fontWeight: 600 }}>⭐ {ep.averageRating?.toFixed(1)} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '11px' }}>({ep.ratingCount}人)</span></span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>🔥 热门剧集</h3>
          {(stats.mostViewed || []).map((ep, i) => (
            <div key={ep._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.mostViewed.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--foreground)', fontSize: '13px' }}>{ep.title}</span>
              <span style={{ color: 'var(--primary-light)', fontSize: '13px', fontWeight: 600 }}>🔥 {ep.views}</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--foreground)' }}>❤️ 最多追番</h3>
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
