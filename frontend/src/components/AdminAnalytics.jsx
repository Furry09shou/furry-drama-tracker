import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin'); return; }
    axios.get(`/api/stats/overview?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [period, navigate]);

  const SimpleBarChart = ({ items, maxValue, label }) => {
    if (!items || items.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>暂无数据</div>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, i) => {
          const pct = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '120px', fontSize: '13px', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.label}</span>
              <div style={{ flex: 1, height: '24px', background: 'var(--hover-bg)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: '6px', transition: 'width 0.5s ease', minWidth: pct > 0 ? '4px' : '0' }} />
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '50px', textAlign: 'right' }}>{item.value}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const SimpleLineChart = ({ points, label }) => {
    if (!points || points.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>暂无数据</div>;
    const maxVal = Math.max(...points.map(p => p.value), 1);
    const chartH = 120;
    const chartW = 300;
    const stepX = points.length > 1 ? chartW / (points.length - 1) : chartW;
    const pathD = points.map((p, i) => {
      const x = i * stepX;
      const y = chartH - (p.value / maxVal) * (chartH - 10) - 5;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <div>
        <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 20}`} style={{ maxHeight: '160px' }}>
          {points.map((p, i) => {
            const x = i * stepX;
            const y = chartH - (p.value / maxVal) * (chartH - 10) - 5;
            return <circle key={i} cx={x} cy={y} r="3" fill="var(--primary)" />;
          })}
          <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2" />
          {points.map((p, i) => {
            const x = i * stepX;
            return <text key={`l${i}`} x={x} y={chartH + 16} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{p.label}</text>;
          })}
        </svg>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>加载中...</div>;

  if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>暂无数据</div>;

  const topByViews = (data.topEpisodesByViews || []).map(e => ({ label: e.title, value: e.views }));
  const topByFollows = (data.topEpisodesByFollows || []).map(e => ({ label: e.title, value: e.followCount }));
  const topByRating = (data.topEpisodesByRating || []).map(e => ({ label: e.title, value: Math.round(e.avgRating * 10) / 10 }));
  const activityTrend = (data.activityTrend || []).map(d => ({ label: d.date?.slice(5) || d.day || '', value: d.count || d.activeUsers || 0 }));
  const retention = data.retention || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>📈 数据分析</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setPeriod('7d')} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
            background: period === '7d' ? 'var(--primary)' : 'var(--hover-bg)',
            color: period === '7d' ? '#fff' : 'var(--foreground)',
            border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s'
          }}>7天</button>
          <button onClick={() => setPeriod('30d')} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
            background: period === '30d' ? 'var(--primary)' : 'var(--hover-bg)',
            color: period === '30d' ? '#fff' : 'var(--foreground)',
            border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s'
          }}>30天</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: '总用户', value: data.totalUsers || 0, icon: '👥' },
          { label: '活跃用户', value: data.activeUsers || 0, icon: '🟢' },
          { label: '总剧集', value: data.totalEpisodes || 0, icon: '🎬' },
          { label: '总浏览量', value: data.totalViews || 0, icon: '👁' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card)', borderRadius: '12px', padding: '20px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--foreground)' }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'var(--card)', borderRadius: '12px', padding: '20px',
        border: '1px solid var(--border)', marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>用户活跃度趋势</h3>
        <SimpleLineChart points={activityTrend} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>🔥 热门剧集（浏览量）</h3>
          <SimpleBarChart items={topByViews} maxValue={Math.max(...topByViews.map(i => i.value), 1)} />
        </div>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>❤️ 热门剧集（追番数）</h3>
          <SimpleBarChart items={topByFollows} maxValue={Math.max(...topByFollows.map(i => i.value), 1)} />
        </div>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>⭐ 热门剧集（评分）</h3>
          <SimpleBarChart items={topByRating} maxValue={5} />
        </div>
      </div>

      {retention.length > 0 && (
        <div style={{
          background: 'var(--card)', borderRadius: '12px', padding: '20px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>📊 用户留存率</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {retention.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '80px', fontSize: '13px', color: 'var(--text-secondary)' }}>{r.day}</span>
                <div style={{ flex: 1, height: '20px', background: 'var(--hover-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${r.rate}%`, height: '100%', background: 'var(--success)', borderRadius: '4px', transition: 'width 0.5s' }} />
                </div>
                <span style={{ fontSize: '13px', color: 'var(--foreground)', minWidth: '50px', textAlign: 'right' }}>{r.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
