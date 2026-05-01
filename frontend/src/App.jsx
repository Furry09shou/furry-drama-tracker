import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Home from './components/Home';
import EpisodeDetail from './components/EpisodeDetail';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Admin from './components/Admin';
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
import { PrivacyPage, TermsPage, AboutPage } from './components/SitePage';
import ChangePassword from './components/ChangePassword';
import ResetPassword from './components/ResetPassword';

const NavBar = ({ user, logout }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [siteSettings, setSiteSettings] = useState({ siteName: '兽剧聚合平台', navLogo: '' });
  const notifRef = useRef(null);
  const notifPanelRef = useRef(null);
  const moreRef = useRef(null);
  const { theme, toggleTheme } = useTheme();

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

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const fetchUnread = () => {
      axios.get('/api/notifications/unread-count', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setUnreadCount(res.data.count))
        .catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
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
    ...(user ? [{ to: '/admin/dashboard', label: '管理后台' }] : []),
    { to: '/privacy', label: '隐私政策' },
    { to: '/terms', label: '用户协议' },
    { to: '/about', label: '关于我们' },
  ];

  return (
    <header>
      <nav>
        <div className="logo">
          <a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {siteSettings.navLogo && (
              <img src={siteSettings.navLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
            )}
            <h1>{siteSettings.siteName}</h1>
          </a>
        </div>
        <ul>
          <li><a href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/'; }}>首页</a></li>
          <li><Link to="/calendar">日历</Link></li>
          {user ? (
            <>
              <li><Link to="/profile">个人中心</Link></li>
              <li style={{position: 'relative'}} ref={notifRef}>
                <button
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
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
              <li>
                <button onClick={toggleTheme} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--foreground)', fontSize: '18px', padding: '4px 8px'
                }} title={theme === 'dark' ? '切换亮色' : '切换暗色'}>
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
              </li>
              <li style={{position: 'relative'}} ref={moreRef}>
                <button
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
                      <Link key={item.to} to={item.to} onClick={() => setShowMoreMenu(false)} style={{
                        display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                        textDecoration: 'none', fontSize: '14px',
                        borderBottom: '1px solid var(--border)',
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
            </>
          ) : (
            <>
              <li><Link to="/login">登录</Link></li>
              <li><Link to="/register">注册</Link></li>
              <li>
                <button onClick={toggleTheme} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--foreground)', fontSize: '18px', padding: '4px 8px'
                }} title={theme === 'dark' ? '切换亮色' : '切换暗色'}>
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>
              </li>
              <li style={{position: 'relative'}} ref={moreRef}>
                <button
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
                      <Link key={item.to} to={item.to} onClick={() => setShowMoreMenu(false)} style={{
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
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

const FooterBeian = () => {
  const [beianInfo, setBeianInfo] = useState({ icp: '', policeRecord: '', copyright: '', aiDisclaimer: '' });

  useEffect(() => {
    axios.get('/api/site-content/about')
      .then(res => {
        try {
          const data = JSON.parse(res.data.content);
          setBeianInfo({
            icp: data.icp || '', policeRecord: data.policeRecord || '',
            copyright: data.copyright || '', aiDisclaimer: data.aiDisclaimer || ''
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
    </div>
  );
};

function AppContent() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setInitializing(false);
  }, []);
  
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };
  
  if (initializing) {
    return (
      <div className="container" style={{textAlign: 'center', paddingTop: '100px'}}>
        <h2>加载中...</h2>
      </div>
    );
  }
  
  return (
    <>
      <NavBar user={user} logout={logout} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/episode/:id" element={<EpisodeDetail user={user} />} />
          <Route path="/login" element={<Login login={login} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} logout={logout} /> : <Navigate to="/login" />} />
          <Route path="/change-password" element={user ? <ChangePassword user={user} /> : <Navigate to="/login" />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/calendar" element={<UpdateCalendar />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/episodes" element={<AdminEpisodes />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
          <Route path="/admin/review" element={<AdminReview />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/stats" element={<AdminStats />} />
          <Route path="/admin/creator-profile" element={<AdminCreatorProfile />} />
          <Route path="/admin/site-content" element={<AdminSiteContent />} />
          <Route path="/admin/change-password" element={<ChangePassword />} />
          <Route path="/creator/:id" element={<CreatorPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <FooterBeian />
    </>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}

export default App;
