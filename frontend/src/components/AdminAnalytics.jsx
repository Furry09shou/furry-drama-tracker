import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [heatmapData, setHeatmapData] = useState([]);
  const [lifecycleData, setLifecycleData] = useState([]);
  const [selectedEpisodes, setSelectedEpisodes] = useState([]);
  const [realtimeData, setRealtimeData] = useState({ onlineUsers: 0, todayVisits: 0, todayNewUsers: 0, todayNewEpisodes: 0 });
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const navigate = useNavigate();
  const { t } = useI18n();
  const realtimeIntervalRef = useRef(null);

  const fetchRealtime = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios.get('/api/stats/realtime', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setRealtimeData(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/admin'); return; }
    axios.get(`/api/stats/overview?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [period, navigate]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios.get('/api/stats/activity-heatmap', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setHeatmapData(res.data))
      .catch(() => {});
    axios.get('/api/stats/episode-lifecycle', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setLifecycleData(res.data);
        if (res.data.length > 0) {
          setSelectedEpisodes([res.data[0].episodeId]);
        }
      })
      .catch(() => {});
    fetchRealtime();
    realtimeIntervalRef.current = setInterval(fetchRealtime, 30000);
    return () => {
      if (realtimeIntervalRef.current) clearInterval(realtimeIntervalRef.current);
    };
  }, [fetchRealtime]);

  const SimpleBarChart = ({ items, maxValue, label }) => {
    if (!items || items.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>{t('adminAnalytics.noData')}</div>;
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
    if (!points || points.length === 0) return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>{t('adminAnalytics.noData')}</div>;
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

  const ActivityHeatmap = () => {
    if (!heatmapData || heatmapData.length === 0) return null;
    const cellSize = 12;
    const cellGap = 3;
    const totalCell = cellSize + cellGap;
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    const maxCount = Math.max(...heatmapData.map(d => d.count), 1);

    const startDate = new Date(heatmapData[0].date);
    const startDayOfWeek = startDate.getDay();
    const weeks = Math.ceil((heatmapData.length + startDayOfWeek) / 7);

    const monthLabels = [];
    let lastMonth = -1;
    for (let i = 0; i < heatmapData.length; i++) {
      const d = new Date(heatmapData[i].date);
      const m = d.getMonth();
      if (m !== lastMonth) {
        const col = Math.floor((i + startDayOfWeek) / 7);
        monthLabels.push({ month: d.toLocaleString('default', { month: 'short' }), col });
        lastMonth = m;
      }
    }

    const getOpacity = (count) => {
      if (count === 0) return 0.08;
      return 0.2 + 0.8 * (count / maxCount);
    };

    const svgW = weeks * totalCell + 40;
    const svgH = 7 * totalCell + 30;

    return (
      <div style={{
        background: 'var(--card)', borderRadius: '12px', padding: '20px',
        border: '1px solid var(--border)', marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t('analytics.activityHeatmap')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
            {monthLabels.map((ml, i) => (
              <text key={i} x={ml.col * totalCell + 38} y={12} fontSize="11" fill="var(--text-secondary)">{ml.month}</text>
            ))}
            {dayLabels.map((dl, i) => (
              dl ? <text key={i} x={0} y={i * totalCell + 24} fontSize="10" fill="var(--text-secondary)">{dl}</text> : null
            ))}
            {heatmapData.map((d, i) => {
              const dayOfWeek = (startDayOfWeek + i) % 7;
              const week = Math.floor((i + startDayOfWeek) / 7);
              const x = week * totalCell + 38;
              const y = dayOfWeek * totalCell + 18;
              return (
                <rect
                  key={d.date}
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill="var(--primary)"
                  opacity={getOpacity(d.count)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    const rect = e.target.getBoundingClientRect();
                    setTooltipInfo({ date: d.date, count: d.count, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltipInfo(null)}
                />
              );
            })}
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <span>{t('analytics.less')}</span>
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((op, i) => (
            <div key={i} style={{ width: cellSize, height: cellSize, borderRadius: '2px', background: 'var(--primary)', opacity: op === 0 ? 0.08 : op }} />
          ))}
          <span>{t('analytics.more')}</span>
        </div>
        {tooltipInfo && (
          <div style={{
            position: 'fixed', left: tooltipInfo.x, top: tooltipInfo.y - 40,
            transform: 'translateX(-50%)', background: 'var(--foreground)', color: 'var(--card)',
            padding: '4px 8px', borderRadius: '6px', fontSize: '12px', pointerEvents: 'none',
            zIndex: 1000, whiteSpace: 'nowrap'
          }}>
            {tooltipInfo.date}: {tooltipInfo.count}
          </div>
        )}
      </div>
    );
  };

  const EpisodeLifecycleChart = () => {
    if (!lifecycleData || lifecycleData.length === 0) return null;
    const selectedData = lifecycleData.filter(ep => selectedEpisodes.includes(ep.episodeId));
    if (selectedData.length === 0) return null;

    const colors = ['#4f46e5', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];
    const maxWeeks = Math.max(...selectedData.map(ep => ep.weeks.length), 1);
    const maxViews = Math.max(...selectedData.flatMap(ep => ep.weeks.map(w => w.views)), 1);

    const chartW = 500;
    const chartH = 200;
    const padL = 50;
    const padR = 20;
    const padT = 10;
    const padB = 30;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;

    const yTicks = 5;
    const yStep = maxViews / yTicks;

    return (
      <div style={{
        background: 'var(--card)', borderRadius: '12px', padding: '20px',
        border: '1px solid var(--border)', marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{t('analytics.episodeLifecycle')}</h3>
          <select
            multiple
            value={selectedEpisodes}
            onChange={(e) => {
              const opts = Array.from(e.target.selectedOptions, o => o.value);
              if (opts.length <= 5) setSelectedEpisodes(opts);
            }}
            style={{
              fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border)',
              background: 'var(--card)', color: 'var(--foreground)', padding: '4px',
              maxHeight: '80px', minWidth: '160px'
            }}
          >
            {lifecycleData.map(ep => (
              <option key={ep.episodeId} value={ep.episodeId}>{ep.title}</option>
            ))}
          </select>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t('analytics.selectEpisodes')}</p>
        <div style={{ overflowX: 'auto' }}>
          <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ minWidth: chartW }}>
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const val = Math.round(yStep * i);
              const y = chartH - padB - (val / maxViews) * plotH;
              return (
                <g key={`ytick-${i}`}>
                  <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="var(--border)" strokeWidth="0.5" />
                  <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)">{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}</text>
                </g>
              );
            })}
            {Array.from({ length: Math.min(maxWeeks, 10) }, (_, i) => {
              const weekNum = Math.round((i / 9) * maxWeeks);
              const x = padL + (i / 9) * plotW;
              return (
                <text key={`xtick-${i}`} x={x} y={chartH - padB + 18} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{weekNum}</text>
              );
            })}
            <text x={padL + plotW / 2} y={chartH - 2} textAnchor="middle" fontSize="10" fill="var(--text-secondary)">{t('analytics.weeksSinceCreation')}</text>
            <text x={8} y={padT + plotH / 2} textAnchor="middle" fontSize="10" fill="var(--text-secondary)" transform={`rotate(-90, 8, ${padT + plotH / 2})`}>{t('analytics.cumulativeViews')}</text>
            {selectedData.map((ep, epIdx) => {
              const stepX = ep.weeks.length > 1 ? plotW / (maxWeeks - 1 || 1) : plotW;
              const pathD = ep.weeks.map((w, i) => {
                const x = padL + ((w.week - 1) / Math.max(maxWeeks - 1, 1)) * plotW;
                const y = chartH - padB - (w.views / maxViews) * plotH;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ');
              return (
                <g key={ep.episodeId}>
                  <path d={pathD} fill="none" stroke={colors[epIdx % colors.length]} strokeWidth="2" />
                  {ep.weeks.filter((_, i) => i % Math.max(1, Math.floor(ep.weeks.length / 10)) === 0 || i === ep.weeks.length - 1).map((w, i) => {
                    const x = padL + ((w.week - 1) / Math.max(maxWeeks - 1, 1)) * plotW;
                    const y = chartH - padB - (w.views / maxViews) * plotH;
                    return <circle key={i} cx={x} cy={y} r="3" fill={colors[epIdx % colors.length]} />;
                  })}
                </g>
              );
            })}
          </svg>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
          {selectedData.map((ep, i) => (
            <div key={ep.episodeId} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
              <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: colors[i % colors.length] }} />
              <span style={{ color: 'var(--foreground)' }}>{ep.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const RealtimeStatsCard = () => {
    const cards = [
      { label: t('analytics.onlineUsers'), value: realtimeData.onlineUsers, pulse: true, icon: '🟢' },
      { label: t('analytics.todayVisits'), value: realtimeData.todayVisits, pulse: false, icon: '👁' },
      { label: t('analytics.todayNewUsers'), value: realtimeData.todayNewUsers, pulse: false, icon: '👤' },
      { label: t('analytics.todayNewEpisodes'), value: realtimeData.todayNewEpisodes, pulse: false, icon: '🎬' },
    ];

    return (
      <div style={{
        background: 'var(--card)', borderRadius: '12px', padding: '20px',
        border: '1px solid var(--border)', marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t('analytics.realtimeStats')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {cards.map(c => (
            <div key={c.label} style={{
              background: 'var(--hover-bg)', borderRadius: '10px', padding: '16px',
              textAlign: 'center', border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{c.icon}</div>
              <div style={{
                fontSize: '28px', fontWeight: 700, color: 'var(--primary)',
                animation: c.pulse && c.value > 0 ? 'pulse 2s ease-in-out infinite' : 'none'
              }}>{c.value.toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{c.label}</div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>{t('adminAnalytics.loading')}</div>;

  if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t('adminAnalytics.noData')}</div>;

  const topByViews = (data.topEpisodesByViews || []).map(e => ({ label: e.title, value: e.views }));
  const topByFollows = (data.topEpisodesByFollows || []).map(e => ({ label: e.title, value: e.followCount }));
  const topByRating = (data.topEpisodesByRating || []).map(e => ({ label: e.title, value: Math.round(e.avgRating * 10) / 10 }));
  const activityTrend = (data.activityTrend || []).map(d => ({ label: d.date?.slice(5) || d.day || '', value: d.count || d.activeUsers || 0 }));
  const retention = data.retention || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>{t('adminAnalytics.title')}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setPeriod('7d')} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
            background: period === '7d' ? 'var(--primary)' : 'var(--hover-bg)',
            color: period === '7d' ? '#fff' : 'var(--foreground)',
            border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s'
          }}>{t('adminAnalytics.7days')}</button>
          <button onClick={() => setPeriod('30d')} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
            background: period === '30d' ? 'var(--primary)' : 'var(--hover-bg)',
            color: period === '30d' ? '#fff' : 'var(--foreground)',
            border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s'
          }}>{t('adminAnalytics.30days')}</button>
        </div>
      </div>

      <RealtimeStatsCard />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: t('adminAnalytics.totalUsers'), value: data.totalUsers || 0, icon: '👥' },
          { label: t('adminAnalytics.activeUsers'), value: data.activeUsers || 0, icon: '🟢' },
          { label: t('adminAnalytics.totalEpisodes'), value: data.totalEpisodes || 0, icon: '🎬' },
          { label: t('adminAnalytics.totalViews'), value: data.totalViews || 0, icon: '👁' },
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

      <ActivityHeatmap />

      <div style={{
        background: 'var(--card)', borderRadius: '12px', padding: '20px',
        border: '1px solid var(--border)', marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t('adminAnalytics.activityTrend')}</h3>
        <SimpleLineChart points={activityTrend} />
      </div>

      <EpisodeLifecycleChart />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t('adminAnalytics.topByViews')}</h3>
          <SimpleBarChart items={topByViews} maxValue={Math.max(...topByViews.map(i => i.value), 1)} />
        </div>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t('adminAnalytics.topByFollows')}</h3>
          <SimpleBarChart items={topByFollows} maxValue={Math.max(...topByFollows.map(i => i.value), 1)} />
        </div>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t('adminAnalytics.topByRating')}</h3>
          <SimpleBarChart items={topByRating} maxValue={5} />
        </div>
      </div>

      {retention.length > 0 && (
        <div style={{
          background: 'var(--card)', borderRadius: '12px', padding: '20px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>{t('adminAnalytics.userRetention')}</h3>
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
