import React, { useState, useEffect, useRef, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './components/Home';
import EpisodeDetail from './components/EpisodeDetail';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Admin from './components/Admin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './components/AdminDashboard';
import AdminEpisodes from './components/AdminEpisodes';
import AdminUsers from './components/AdminUsers';
import AdminCategories from './components/AdminCategories';
import AdminBanners from './components/AdminBanners';
import AdminReview from './components/AdminReview';
import AdminCreatorProfile from './components/AdminCreatorProfile';
import AdminSiteContent from './components/AdminSiteContent';
import AdminReports from './components/AdminReports';
import AdminStats from './components/AdminStats';
import CreatorPage from './components/CreatorPage';
import UpdateCalendar from './components/UpdateCalendar';
import NotFound from './components/NotFound';
import { PrivacyPage, TermsPage, AboutPage, LicensePage } from './components/SitePage';
import ChangePassword from './components/ChangePassword';
import ResetPassword from './components/ResetPassword';
import VerifyEmail from './components/VerifyEmail';
import AdminEmailSettings from './components/AdminEmailSettings';
import AdminAuditLogs from './components/AdminAuditLogs';
import AdminBackup from './components/AdminBackup';
import AdminFeedback from './components/AdminFeedback';
import AdminApiUsage from './components/AdminApiUsage';
import AdminFriendLinks from './components/AdminFriendLinks';
import AdminSessions from './components/AdminSessions';
import UserDevices from './components/UserDevices';
import FriendLinks from './components/FriendLinks';
import FeedbackModal from './components/FeedbackModal';
import AdminAnalytics from './components/AdminAnalytics';

const NavBar = ({ onFeedback }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ siteName: '兽剧聚合平台', navLogo: '' });
  const notifRef = useRef(null);
  const notifPanelRef = useRef(null);
  const moreRef = useRef(null);
  const sseRef = useRef(null);
  const { theme, toggleTheme, themeIcon, themeTitle } = useTheme();

  useEffect(() => {
    axios.get('/api/site-content/settings')
      .then(res => {
        try {
          const data = JSON.parse(res.data.content);
          setSiteSettings({ siteName: data.siteName || '兽剧聚合平台', navLogo: data.navLogo || '' });
        } catch (e) {}
      })
      .catch(() => {});
  }, []);

  // SSE通知推送
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    // SSE连接
    const connectSSE = () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
      try {
        const eventSource = new EventSource(`/api/notifications/stream?token=${token}`);
        sseRef.current = eventSource;

        eventSource.addEventListener('notification', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.unreadCount !== undefined) {
              setUnreadCount(data.unreadCount);
            }
            if (data.type === 'new') {
              setUnreadCount(prev => prev + 1);
            }
          } catch (e) {}
        });

        eventSource.onerror = () => {
          eventSource.close();
          // 降级为轮询
        };
      } catch (e) {
        // SSE不可用，使用轮询降级
      }
    };

    connectSSE();

    // 轮询降级方案
    const fetchUnread = () => {
      axios.get('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);

    return () => {
      clearInterval(interval);
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [user]);

  useEffect(() => {
    if (!showNotifPanel || !user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    axios.get('/api/notifications/list', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setNotifications(res.data))
      .catch(() => {});
  }, [showNotifPanel, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedNotifBtn = notifRef.current && notifRef.current.contains(e.target);
      const clickedPanel = notifPanelRef.current && notifPanelRef.current.contains(e.target);
      if (!clickedNotifBtn && !clickedPanel) {
        setShowNotifPanel(false);
      }
      const clickedMoreBtn = moreRef.current && moreRef.current.contains(e.target);
      if (!clickedMoreBtn) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const clearReadNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/notifications/clear-read', { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/notifications/read-all', {}, { headers: { Authorization: `Bearer ${token}` } });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  const clearSiteCache = () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.localStorage.removeItem('theme');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(reg => reg.unregister());
      });
    }
    setShowMoreMenu(false);
    window.location.reload();
  };

  const moreMenuItems = [
    ...(user ? [{ to: user.adminAccess ? '/admin/dashboard' : '/admin/stats', label: user.adminAccess ? '管理后台' : '数据统计' }] : []),
    { to: '/friend-links', label: '友情链接' },
    { to: '/privacy', label: '隐私政策' },
    { to: '/terms', label: '用户协议' },
    { to: '/license', label: '许可协议' },
    { to: '/about', label: '关于我们' },
  ];

  const [showMobileMore, setShowMobileMore] = useState(false);

  const renderMobileMoreItems = () => (
    <>
      {moreMenuItems.map((item) => (
        <li key={item.to}>
          <Link to={item.to} onClick={() => { setShowMobileMenu(false); setShowMobileMore(false); }} style={{
            display: 'block', padding: '10px 12px', color: 'var(--foreground)',
            textDecoration: 'none', fontSize: '14px', fontWeight: 500,
            borderRadius: '8px', transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >{item.label}</Link>
        </li>
      ))}
      <li>
        <button onClick={() => { setShowMobileMenu(false); setShowMobileMore(false); onFeedback(); }} style={{
          display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
          color: 'var(--foreground)', background: 'none', border: 'none',
          fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
          transition: 'background 0.2s'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
           onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >用户反馈</button>
      </li>
      <li>
        <button onClick={() => { clearSiteCache(); setShowMobileMore(false); }} style={{
          display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
          color: 'var(--foreground)', background: 'none', border: 'none',
          fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
          transition: 'background 0.2s'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
           onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >清理缓存</button>
      </li>
      {user && (
        <li>
          <button onClick={() => { setShowMobileMenu(false); setShowMobileMore(false); logout(); }} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
            color: 'var(--destructive-text)', background: 'none', border: 'none',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--destructive-bg-subtle)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >退出登录</button>
        </li>
      )}
    </>
  );

  return (
    <header>
      <nav>
        <div className="logo">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {siteSettings.navLogo && (
              <img src={siteSettings.navLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
            )}
            <h1>{siteSettings.siteName}</h1>
          </a>
        </div>
        <div className="mobile-actions" style={{ display: 'none', alignItems: 'center', gap: '4px' }}>
          {user && (
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--foreground)', fontSize: '20px', position: 'relative',
                padding: '6px', lineHeight: 1
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '0', right: '-2px',
                  background: 'var(--badge-bg)', color: 'var(--badge-text)', fontSize: '10px',
                  borderRadius: '10px', padding: '1px 4px', minWidth: '14px',
                  textAlign: 'center', lineHeight: '12px'
                }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>
          )}
          <button onClick={toggleTheme} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '18px', padding: '6px'
          }} title={themeTitle}>
            {themeIcon}
          </button>
          <button className="mobile-menu-btn" onClick={() => { setShowMobileMenu(!showMobileMenu); setShowMobileMore(false); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '22px', padding: '6px'
          }}>☰</button>
        </div>
        <ul className={showMobileMenu ? 'mobile-open' : ''}>
          <li><a href="/" onClick={(e) => { e.preventDefault(); setShowMobileMenu(false); navigate('/'); }}>首页</a></li>
          <li><Link to="/calendar" onClick={() => setShowMobileMenu(false)}>日历</Link></li>
          {user ? (
            <>
              <li><Link to="/profile" onClick={() => setShowMobileMenu(false)}>个人中心</Link></li>
              <li style={{position: 'relative'}} ref={notifRef}>
                <button
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
                  className="desktop-only-notif"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--foreground)', fontSize: '20px', position: 'relative',
                    padding: '4px 8px', lineHeight: 1
                  }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-2px', right: '0',
                      background: 'var(--badge-bg)', color: 'var(--badge-text)', fontSize: '11px',
                      borderRadius: '10px', padding: '1px 5px', minWidth: '16px',
                      textAlign: 'center', lineHeight: '14px'
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
                {showNotifPanel && createPortal(
                  <div ref={notifPanelRef} style={{
                    position: 'fixed', top: '60px', right: '20px',
                    width: 'min(360px, calc(100vw - 40px))', maxHeight: '480px', overflow: 'auto',
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '12px', boxShadow: '0 8px 32px var(--shadow-modal)',
                    zIndex: 10000, backdropFilter: 'blur(20px)'
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px', borderBottom: '1px solid var(--border)'
                    }}>
                      <h3 style={{margin: 0, fontSize: '16px', color: 'var(--foreground)'}}>通知</h3>
                      <div style={{display: 'flex', gap: '12px'}}>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} style={{
                            background: 'none', border: 'none', color: 'var(--primary)',
                            cursor: 'pointer', fontSize: '13px'
                          }}>全部已读</button>
                        )}
                        {notifications.some(n => n.isRead) && (
                          <button onClick={clearReadNotifications} style={{
                            background: 'none', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '13px'
                          }}>清除已读</button>
                        )}
                      </div>
                    </div>
                    <div>
                      {notifications.length === 0 ? (
                        <div style={{padding: '30px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                          暂无通知
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n._id}
                            onClick={() => {
                              if (!n.episodeId) return;
                              setShowNotifPanel(false);
                              setShowMobileMenu(false);
                              navigate(`/episode/${n.episodeId}`);
                            }}
                            style={{
                              display: 'block', padding: '14px 16px',
                              borderBottom: '1px solid var(--border)',
                              background: n.isRead ? 'transparent' : 'var(--primary-bg-subtle)',
                              color: 'var(--foreground)',
                              transition: 'background 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--primary-bg-subtle)'}
                          >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <span style={{fontSize: '14px', fontWeight: n.isRead ? 400 : 600}}>
                                {n.message}
                              </span>
                              {!n.isRead && (
                                <span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginLeft: '8px'}}></span>
                              )}
                            </div>
                            <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>
                              {formatTime(n.createdAt)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </li>
              <li className="desktop-only-theme">
                <button onClick={toggleTheme} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--foreground)', fontSize: '18px', padding: '4px 8px'
                }} title={themeTitle}>
                  {themeIcon}
                </button>
              </li>
              <li style={{position: 'relative'}} ref={moreRef}>
                <button
                  className="desktop-more-btn"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--foreground)', fontSize: '14px',
                    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  更多 ▾
                </button>
                {showMoreMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '10px', boxShadow: '0 8px 32px var(--shadow-modal)',
                    minWidth: '160px', zIndex: 10000, overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                  }}>
                    {moreMenuItems.map((item, i) => (
                      <Link key={item.to} to={item.to} onClick={() => { setShowMoreMenu(false); setShowMobileMenu(false); }} style={{
                        display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                        textDecoration: 'none', fontSize: '14px',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >{item.label}</Link>
                    ))}
                    <div style={{borderTop: '1px solid var(--border)'}}>
                      <button onClick={() => { setShowMoreMenu(false); onFeedback(); }} style={{
                        display: 'block', width: '100%', padding: '12px 16px',
                        color: 'var(--foreground)', background: 'none', border: 'none',
                        fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.2s',
                        borderBottom: '1px solid var(--border)'
                      }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >用户反馈</button>
                    </div>
                    <div style={{borderTop: '1px solid var(--border)'}}>
                      <button onClick={clearSiteCache} style={{
                        display: 'block', width: '100%', padding: '12px 16px',
                        color: 'var(--foreground)', background: 'none', border: 'none',
                        fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.2s',
                        borderBottom: '1px solid var(--border)'
                      }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >清理缓存</button>
                    </div>
                    <div>
                      <button onClick={() => { setShowMoreMenu(false); logout(); }} style={{
                        display: 'block', width: '100%', padding: '12px 16px',
                        color: 'var(--destructive-text)', background: 'none', border: 'none',
                        fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--destructive-bg-subtle)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >退出登录</button>
                    </div>
                  </div>
                )}
              </li>
              <li className="mobile-more-toggle">
                <button onClick={() => setShowMobileMore(!showMobileMore)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  color: 'var(--foreground)', background: 'none', border: 'none',
                  fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
                  transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                   onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>更多</span>
                  <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: showMobileMore ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                </button>
              </li>
              {showMobileMore && renderMobileMoreItems()}
            </>
          ) : (
            <>
              <li><Link to="/login">登录</Link></li>
              <li><Link to="/register">注册</Link></li>
              <li className="desktop-only-theme">
                <button onClick={toggleTheme} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--foreground)', fontSize: '18px', padding: '4px 8px'
                }} title={themeTitle}>
                  {themeIcon}
                </button>
              </li>
              <li style={{position: 'relative'}} ref={moreRef}>
                <button
                  className="desktop-more-btn"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--foreground)', fontSize: '14px',
                    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  更多 ▾
                </button>
                {showMoreMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '10px', boxShadow: '0 8px 32px var(--shadow-modal)',
                    minWidth: '160px', zIndex: 10000, overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                  }}>
                    {moreMenuItems.map((item, i) => (
                      <Link key={item.to} to={item.to} onClick={() => { setShowMoreMenu(false); setShowMobileMenu(false); }} style={{
                        display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                        textDecoration: 'none', fontSize: '14px',
                        borderBottom: i < moreMenuItems.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >{item.label}</Link>
                    ))}
                    <div style={{borderTop: '1px solid var(--border)'}}>
                      <button onClick={clearSiteCache} style={{
                        display: 'block', width: '100%', padding: '12px 16px',
                        color: 'var(--foreground)', background: 'none', border: 'none',
                        fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.2s'
                      }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >清理缓存</button>
                    </div>
                  </div>
                )}
              </li>
              <li className="mobile-more-toggle">
                <button onClick={() => setShowMobileMore(!showMobileMore)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px',
                  color: 'var(--foreground)', background: 'none', border: 'none',
                  fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
                  transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                   onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>更多</span>
                  <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: showMobileMore ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                </button>
              </li>
              {showMobileMore && renderMobileMoreItems()}
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

const FooterBeian = () => {
  const [beianInfo, setBeianInfo] = useState({ icp: '', policeRecord: '', copyright: '', aiDisclaimer: '', version: '' });
  const [showGithubModal, setShowGithubModal] = useState(false);

  useEffect(() => {
    axios.get('/api/site-content/about')
      .then(res => {
        try {
          const data = JSON.parse(res.data.content);
          setBeianInfo({
            icp: data.icp || '', policeRecord: data.policeRecord || '',
            copyright: data.copyright || '', aiDisclaimer: data.aiDisclaimer || '',
            version: data.version || ''
          });
        } catch (e) {}
      })
      .catch(() => {});
  }, []);

  if (!beianInfo.icp && !beianInfo.policeRecord && !beianInfo.copyright && !beianInfo.aiDisclaimer) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '12px', right: '16px', zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px',
      opacity: 0.5, transition: 'opacity 0.3s',
      fontSize: '12px', lineHeight: 1.6
    }}
    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
    >
      <button
        onClick={() => window.location.reload()}
        title="刷新页面"
        style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '4px 8px', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: '12px',
          display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'all 0.2s', marginBottom: '4px'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
        刷新
      </button>
      {beianInfo.copyright && (
        <span style={{ color: 'var(--text-secondary)' }}>{beianInfo.copyright}</span>
      )}
      {beianInfo.aiDisclaimer && (
        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{beianInfo.aiDisclaimer}</span>
      )}
      {beianInfo.icp && (
        <a
          href={`https://beian.miit.gov.cn/#/Integrated/index`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >{beianInfo.icp}</a>
      )}
      {beianInfo.policeRecord && (
        <a
          href={`https://beian.mps.gov.cn/#/query/webSearch`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          <img src="https://www.beian.gov.cn/img/ghs.png"
            alt="" style={{ width: '14px', height: '14px' }} />
          {beianInfo.policeRecord}
        </a>
      )}
      <Link to="/license" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
      >GPL v3.0 / AGPL v3.0 许可协议</Link>
      <span
        onClick={() => setShowGithubModal(true)}
        style={{ color: 'var(--text-tertiary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style={{ flexShrink: 0 }}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub 开源项目
      </span>
      {showGithubModal && (
        <div onClick={() => setShowGithubModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px', width: 'min(300px, calc(100vw - 40px))',
            maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--foreground)' }}>GitHub 开源项目</h3>
              <button onClick={() => setShowGithubModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1
              }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <span style={{ fontSize: '24px' }}>🎨</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>前端项目</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>furry-drama-fe</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>GPL v3.0</span>
                    <Link to="/license" onClick={() => setShowGithubModal(false)} style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >查看许可协议</Link>
                  </div>
                </div>
                <a href="https://github.com/Furry09shou/furry-drama-fe" target="_blank" rel="noopener noreferrer" onClick={() => setShowGithubModal(false)} style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--primary)',
                  color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                  flexShrink: 0, whiteSpace: 'nowrap'
                }}>GitHub</a>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <span style={{ fontSize: '24px' }}>⚙️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>后端项目</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>furry-drama-be</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>AGPL v3.0</span>
                    <Link to="/license" onClick={() => setShowGithubModal(false)} style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >查看许可协议</Link>
                  </div>
                </div>
                <a href="https://github.com/Furry09shou/furry-drama-be" target="_blank" rel="noopener noreferrer" onClick={() => setShowGithubModal(false)} style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'var(--primary)',
                  color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                  flexShrink: 0, whiteSpace: 'nowrap'
                }}>GitHub</a>
              </div>
            </div>
          </div>
        </div>
      )}
      {beianInfo.version && (
        <span style={{ color: 'var(--text-tertiary)' }}>v{beianInfo.version}</span>
      )}
    </div>
  );
};

function AppContent() {
  const { user, login, logout, initializing } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin/') && location.pathname !== '/admin';

  useEffect(() => {
    axios.get('/api/site-content/settings')
      .then(res => {
        try {
          const data = JSON.parse(res.data.content);
          if (data.browserTitle) {
            document.title = data.browserTitle;
          }
          if (data.favicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.head.appendChild(link);
            }
            link.href = data.favicon;
          }
        } catch (e) {}
      })
      .catch(() => {});
  }, []);

  if (initializing) {
    return (
      <div className="container" style={{textAlign: 'center', paddingTop: '100px'}}>
        <h2>加载中...</h2>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="episodes" element={<AdminEpisodes />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="review" element={<AdminReview />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="stats" element={<AdminStats />} />
          <Route path="creator-profile" element={<AdminCreatorProfile />} />
          <Route path="site-content" element={<AdminSiteContent />} />
          <Route path="email-settings" element={<AdminEmailSettings />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="backup" element={<AdminBackup />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="api-usage" element={<AdminApiUsage />} />
          <Route path="friend-links" element={<AdminFriendLinks />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="change-password" element={<ChangePassword />} />
        </Route>
      </Routes>
    );
  }

  return (
    <>
      <NavBar onFeedback={() => setShowFeedback(true)} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/episode/:id" element={<EpisodeDetail user={user} />} />
          <Route path="/login" element={<Login login={login} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={user ? <Profile user={user} setUser={(u) => { if (typeof u === 'function') { /* AuthContext不支持函数更新，忽略 */ } }} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/devices" element={user ? <UserDevices user={user} /> : <Navigate to="/login" />} />
          <Route path="/change-password" element={user ? <ChangePassword user={user} /> : <Navigate to="/login" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/calendar" element={<UpdateCalendar />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/creator/:id" element={<CreatorPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/friend-links" element={<FriendLinks />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <FooterBeian />
      <FeedbackModal show={showFeedback} onClose={() => setShowFeedback(false)} user={user} />
    </>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--foreground)' }}>
          <h2>页面加载出错</h2>
          <p style={{ color: 'var(--destructive-text)', margin: '16px 0' }}>{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' }}>刷新页面</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default App;
