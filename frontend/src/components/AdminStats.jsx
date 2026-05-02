import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const adminData = localStorage.getItem('adminData');
    if (!adminData) { navigate('/admin'); return; }
    try { JSON.parse(adminData); } catch (e) { navigate('/admin'); return; }
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await axios.get('/api/stats/overview', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error('Fetch stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>加载中...</div>;
  }

  if (!stats) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>无法加载统计数据</div>;
  }

  const statCards = [
    { label: '剧集总数', value: stats.totalEpisodes, icon: '🎬', color: 'var(--primary)' },
    { label: '待审核', value: stats.pendingEpisodes, icon: '⏳', color: 'var(--warning-text)' },
    { label: '用户总数', value: stats.totalUsers, icon: '👥', color: 'var(--secondary)' },
    { label: '追番总数', value: stats.totalFollows, icon: '❤️', color: 'var(--destructive-text)' },
    { label: '评分总数', value: stats.totalRatings, icon: '⭐', color: 'var(--purple)' },
    { label: '待处理举报', value: stats.pendingReports, icon: '🚨', color: 'var(--destructive-text)' },
    { label: '近30天新用户', value: stats.newUsers, icon: '📈', color: 'var(--info)' },
    { label: '近30天新剧集', value: stats.newEpisodes, icon: '🆕', color: 'var(--purple)' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← 返回上一步</button>
        <h2 style={{ margin: 0 }}>📊 数据统计</h2>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '16px', marginBottom: '32px'
      }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '20px', textAlign: 'center',
            transition: 'transform 0.2s'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{card.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>⭐ 评分最高</h3>
          {stats.topRated.length === 0 ? (
            <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>暂无评分</div>
          ) : stats.topRated.map((ep, i) => (
            <div key={ep._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: i < stats.topRated.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ fontSize: '14px' }}>{ep.title}</span>
              <span style={{ color: 'var(--warning-text)', fontWeight: 600, fontSize: '14px' }}>
                ⭐ {ep.averageRating} ({ep.ratingCount})
              </span>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>🔥 热门剧集</h3>
          {stats.mostViewed.map((ep, i) => (
            <div key={ep._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: i < stats.mostViewed.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ fontSize: '14px' }}>{ep.title}</span>
              <span style={{ color: 'var(--destructive-text)', fontWeight: 600, fontSize: '14px' }}>
                👁 {ep.views}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>❤️ 最多追番</h3>
          {stats.mostFollowed.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: i < stats.mostFollowed.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ fontSize: '14px' }}>{item.title}</span>
              <span style={{ color: 'var(--secondary)', fontWeight: 600, fontSize: '14px' }}>
                ❤️ {item.count}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '20px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>📈 近7天新用户</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
            {stats.userTrend.map((d, i) => {
              const maxCount = Math.max(...stats.userTrend.map(t => t.count), 1);
              const height = Math.max((d.count / maxCount) * 100, 4);
              return (
                <div key={i} style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '4px'
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{d.count}</span>
                  <div style={{
                    width: '100%', height: `${height}px`,
                    background: 'var(--btn-gradient)',
                    borderRadius: '4px 4px 0 0', minHeight: '4px'
                  }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminStats;
