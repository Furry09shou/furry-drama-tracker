﻿﻿﻿﻿import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UpdateCalendar = () => {
  const [calendar, setCalendar] = useState({});
  const [loading, setLoading] = useState(true);
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const dayColors = ['var(--primary)', 'var(--purple)', 'var(--purple)', 'var(--destructive-text)', 'var(--destructive-text)', 'var(--destructive-text)', 'var(--destructive-text)'];

  useEffect(() => {
    axios.get('/api/stats/calendar')
      .then(res => {
        setCalendar(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  if (loading) {
    return <div style={{textAlign: 'center', padding: '60px', color: 'var(--text-secondary)'}}>加载中...</div>;
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '32px'
      }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
          📅 更新日历
        </h2>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          今天是{days[todayIdx]}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {days.map((day, idx) => {
          const episodes = calendar[day] || [];
          const isToday = idx === todayIdx;
          return (
            <div key={day} style={{
              background: isToday
                ? 'linear-gradient(135deg, var(--primary-bg), var(--success-bg-subtle))'
                : 'var(--card)',
              border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: '12px', padding: '20px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '16px'
              }}>
                <span style={{
                  fontSize: '18px', fontWeight: 700,
                  color: dayColors[idx]
                }}>{day}</span>
                {isToday && (
                  <span style={{
                    fontSize: '12px', padding: '2px 8px',
                    background: 'var(--primary)', color: 'var(--btn-text)',
                    borderRadius: '6px', fontWeight: 600
                  }}>今天</span>
                )}
              </div>
              {episodes.length === 0 ? (
                <div style={{ color: 'var(--text-tertiary)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                  暂无更新
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {episodes.map(ep => (
                    <Link key={ep._id} to={`/episode/${ep._id}`} style={{
                      display: 'flex', gap: '10px', alignItems: 'center',
                      textDecoration: 'none', color: 'var(--foreground)',
                      padding: '8px', borderRadius: '8px',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg-strong)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <img src={ep.coverImage} alt="" style={{
                        width: '40px', height: '56px', borderRadius: '6px',
                        objectFit: 'cover', flexShrink: 0
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px', fontWeight: 600,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>{ep.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          更新至第{ep.currentEpisodes}集，共{ep.totalEpisodes}集
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpdateCalendar;
