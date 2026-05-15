import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UpdateCalendar = () => {
  const [calendarData, setCalendarData] = useState({ year: 0, month: 0, calendar: {} });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [viewMode, setViewMode] = useState('month');
  const [followingIds, setFollowingIds] = useState([]);
  const [subscribing, setSubscribing] = useState(null);
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/follows/my', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const ids = (res.data || []).map(f => f.episodeId?._id || f.episodeId);
          setFollowingIds(ids);
        })
        .catch(() => {});
    }
  }, []);

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  useEffect(() => {
    setLoading(true);
    axios.get(`/api/stats/calendar?year=${currentYear}&month=${currentMonth}`)
      .then(res => {
        setCalendarData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(prev => prev - 1); }
    else { setCurrentMonth(prev => prev - 1); }
  };
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(prev => prev + 1); }
    else { setCurrentMonth(prev => prev + 1); }
  };
  const prevWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); };
  const nextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); };
  const goToday = () => { setCurrentYear(now.getFullYear()); setCurrentMonth(now.getMonth() + 1); setCurrentWeekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())); };

  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month - 1, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;

  const formatDate = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const handleSubscribe = async (episodeId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setSubscribing(episodeId);
    try {
      await axios.post('/api/notifications/subscribe-reminder', { episodeId }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {}
    setSubscribing(null);
  };

  const renderDayContent = (dateKey) => {
    const dayData = calendarData.calendar[dateKey];
    if (!dayData) return [];
    const items = [];
    if (dayData.released) dayData.released.forEach(ep => items.push({ ...ep, type: 'released' }));
    if (dayData.scheduled) dayData.scheduled.forEach(ep => items.push({ ...ep, type: 'scheduled' }));
    if (dayData.premieres) dayData.premieres.forEach(ep => items.push({ ...ep, type: 'premiere' }));
    return items;
  };

  const renderWeekView = () => {
    const weekDaysFull = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const weekMonth = days[3].getMonth() + 1;
    const weekYear = days[3].getFullYear();

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>📅 更新日历</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={prevWeek} style={{ background: 'var(--hover-bg-strong)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px' }}>‹</button>
            <span style={{ fontSize: '16px', fontWeight: 600, minWidth: '160px', textAlign: 'center' }}>{weekYear}年{weekMonth}月</span>
            <button onClick={nextWeek} style={{ background: 'var(--hover-bg-strong)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px' }}>›</button>
            <button onClick={goToday} style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', color: 'var(--primary)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>今天</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {days.map((d, i) => {
            const dateKey = formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
            const isToday = d.toDateString() === today.toDateString();
            const items = renderDayContent(dateKey);
            return (
              <div key={i} style={{
                background: isToday ? 'var(--primary-bg-subtle)' : 'var(--card)',
                border: `1px solid ${isToday ? 'var(--primary-border)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '12px', minHeight: '200px'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: isToday ? 'var(--primary)' : 'var(--foreground)', marginBottom: '8px' }}>
                  {weekDaysFull[i]} {d.getDate()}
                </div>
                {items.slice(0, 5).map((item, idx) => {
                  const isFollowed = followingIds.includes(item._id);
                  const bgMap = { released: 'var(--success-bg-subtle)', scheduled: 'var(--warning-bg-subtle)', premiere: 'var(--primary-bg-subtle)' };
                  const colorMap = { released: 'var(--success-text)', scheduled: 'var(--warning-text)', premiere: 'var(--primary)' };
                  return (
                    <div key={idx} style={{ marginBottom: '4px' }}>
                      <Link to={`/episode/${item._id}`} style={{
                        display: 'block', textDecoration: 'none',
                        padding: '4px 6px', borderRadius: '4px',
                        fontSize: '11px', lineHeight: 1.3,
                        background: bgMap[item.type], color: colorMap[item.type],
                        border: isFollowed ? '2px solid var(--primary)' : '1px solid transparent',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {item.type === 'scheduled' && '🔔 '}{item.type === 'premiere' && '🎬 '}
                        {item.title}{item.episodeNumber ? ` 第${item.episodeNumber}集` : ''}
                      </Link>
                      {isFollowed && item.type === 'scheduled' && (
                        <button onClick={() => handleSubscribe(item._id)} disabled={subscribing === item._id} style={{
                          fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                          background: 'var(--primary-bg)', color: 'var(--primary)',
                          border: '1px solid var(--primary-border)', cursor: 'pointer',
                          marginTop: '2px', width: '100%'
                        }}>{subscribing === item._id ? '...' : '🔔 提醒'}</button>
                      )}
                    </div>
                  );
                })}
                {items.length > 5 && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>+{items.length - 5}更多</div>}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  if (loading) return <div style={{textAlign: 'center', padding: '60px', color: 'var(--text-secondary)'}}>加载中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>📅 更新日历</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={prevMonth} style={{ background: 'var(--hover-bg-strong)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px' }}>‹</button>
          <span style={{ fontSize: '16px', fontWeight: 600, minWidth: '120px', textAlign: 'center' }}>{currentYear}年{monthNames[currentMonth - 1]}</span>
          <button onClick={nextMonth} style={{ background: 'var(--hover-bg-strong)', border: '1px solid var(--border)', color: 'var(--foreground)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '14px' }}>›</button>
          {!isCurrentMonth && (
            <button onClick={goToday} style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', color: 'var(--primary)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>今天</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>已更新</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--warning)' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>预告</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></span>
          <span style={{ color: 'var(--text-secondary)' }}>首播</span>
        </span>
        {followingIds.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', border: '2px solid var(--primary)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>我的追番</span>
          </span>
        )}
      </div>

      <div style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {isMobile && (
          <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
            ← 左右滑动查看日历 →
          </div>
        )}
        <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', minWidth: isMobile ? '500px' : 'auto' }}>
          {weekDays.map((day, i) => (
            <div key={day} style={{ padding: '12px 8px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: (i === 0 || i === 6) ? 'var(--destructive-text)' : 'var(--text-secondary)', background: 'var(--hover-bg)' }}>{day}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minWidth: isMobile ? '500px' : 'auto' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ minHeight: '80px', padding: '4px', borderBottom: '1px solid var(--border)', borderRight: ((i + 1) % 7 !== 0) ? '1px solid var(--border)' : 'none', background: 'var(--hover-bg-subtle, var(--hover-bg))' }}></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = formatDate(currentYear, currentMonth, day);
            const dayOfWeek = (firstDay + i) % 7;
            const isToday = isCurrentMonth && today.getDate() === day;
            const items = renderDayContent(dateKey);
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return (
              <div key={day} style={{ minHeight: '80px', padding: '4px', borderBottom: '1px solid var(--border)', borderRight: ((firstDay + i + 1) % 7 !== 0) ? '1px solid var(--border)' : 'none', background: isToday ? 'var(--primary-bg-subtle)' : 'transparent', position: 'relative' }}>
                <div style={{ fontSize: '13px', fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : isWeekend ? 'var(--destructive-text)' : 'var(--foreground)', marginBottom: '2px', padding: '2px 4px', borderRadius: '4px', background: isToday ? 'var(--primary)' : 'transparent', display: 'inline-block', minWidth: '20px', textAlign: 'center' }}>{day}</div>
                {items && items.slice(0, 3).map((item, idx) => {
                  const isFollowed = followingIds.includes(item._id);
                  const bgMap = { released: 'var(--success-bg-subtle)', scheduled: 'var(--warning-bg-subtle)', premiere: 'var(--primary-bg-subtle)' };
                  const colorMap = { released: 'var(--success-text)', scheduled: 'var(--warning-text)', premiere: 'var(--primary)' };
                  return (
                  <Link key={idx} to={`/episode/${item._id}`} style={{
                    display: 'block', textDecoration: 'none', padding: '1px 4px', borderRadius: '3px',
                    fontSize: '11px', lineHeight: 1.4, marginBottom: '1px',
                    background: bgMap[item.type], color: colorMap[item.type],
                    border: isFollowed ? '2px solid var(--primary)' : '1px solid transparent',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {item.type === 'scheduled' && '🔔 '}{item.type === 'premiere' && '🎬 '}
                    {item.title}{item.episodeNumber ? ` 第${item.episodeNumber}集` : ''}
                  </Link>
                  );
                })}
                {items && items.length > 3 && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', paddingLeft: '4px' }}>+{items.length - 3}更多</div>}
              </div>
            );
          })}
          {Array.from({ length: (7 - (firstDay + daysInMonth) % 7) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} style={{ minHeight: '80px', padding: '4px', borderBottom: '1px solid var(--border)', borderRight: ((firstDay + daysInMonth + i + 1) % 7 !== 0) ? '1px solid var(--border)' : 'none', background: 'var(--hover-bg-subtle, var(--hover-bg))' }}></div>
          ))}
        </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--foreground)' }}>本月更新详情</h3>
        {Object.keys(calendarData.calendar).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', background: 'var(--hover-bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>本月暂无更新记录</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(calendarData.calendar).sort(([a], [b]) => a.localeCompare(b)).map(([dateKey, dayData]) => {
              const allItems = [
                ...(dayData.released || []).map(ep => ({ ...ep, type: 'released' })),
                ...(dayData.scheduled || []).map(ep => ({ ...ep, type: 'scheduled' })),
                ...(dayData.premieres || []).map(ep => ({ ...ep, type: 'premiere' }))
              ];
              if (allItems.length === 0) return null;
              const dateObj = new Date(dateKey + 'T00:00:00');
              const dayOfWeek = weekDays[dateObj.getDay()];
              return (
                <div key={dateKey} style={{ background: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'var(--hover-bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>{dateKey} 周{dayOfWeek}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {dayData.released?.length > 0 && <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>已更新 {dayData.released.length}</span>}
                      {dayData.scheduled?.length > 0 && <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }}>预告 {dayData.scheduled.length}</span>}
                      {dayData.premieres?.length > 0 && <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '10px', background: 'var(--primary-bg)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>首播 {dayData.premieres.length}</span>}
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allItems.map((item, idx) => {
                      const isFollowed = followingIds.includes(item._id);
                      return (
                        <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <Link to={`/episode/${item._id}`} style={{ display: 'flex', gap: '12px', alignItems: 'center', textDecoration: 'none', color: 'var(--foreground)', padding: '8px', flex: 1, transition: 'background 0.2s', border: isFollowed ? '2px solid var(--primary)' : '2px solid transparent', borderRadius: '8px' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg-strong)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <img src={item.coverImage} alt="" style={{ width: '40px', height: '56px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {item.type === 'scheduled' && '🔔 预告: '}{item.type === 'premiere' && '🎬 首播'}{item.type === 'released' && '✅ '}
                                {item.episodeNumber ? `第${item.episodeNumber}集` : ''}
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: item.type === 'released' ? 'var(--success-bg-subtle)' : item.type === 'premiere' ? 'var(--primary-bg-subtle)' : 'var(--warning-bg-subtle)', color: item.type === 'released' ? 'var(--success-text)' : item.type === 'premiere' ? 'var(--primary)' : 'var(--warning-text)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {item.type === 'released' ? '已更新' : item.type === 'premiere' ? '首播' : '预告'}
                            </span>
                          </Link>
                          {isFollowed && item.type === 'scheduled' && (
                            <button onClick={() => handleSubscribe(item._id)} disabled={subscribing === item._id} style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '12px',
                              background: 'var(--primary-bg)', color: 'var(--primary)',
                              border: '1px solid var(--primary-border)', cursor: 'pointer',
                              whiteSpace: 'nowrap', flexShrink: 0
                            }}>{subscribing === item._id ? '...' : '🔔 提醒'}</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateCalendar;
