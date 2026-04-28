import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createPortal } from 'react-dom';
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
import CreatorPage from './components/CreatorPage';
import { PrivacyPage, TermsPage, AboutPage } from './components/SitePage';
import ChangePassword from './components/ChangePassword';

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

  const handleHomeClick = (e) => {
    e.preventDefault();
    navigate('/');
    window.location.reload();
  };

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

  return (
    <header>
      <nav>
        <div className="logo">
          <a href="/" onClick={handleHomeClick} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {siteSettings.navLogo && (
              <img src={siteSettings.navLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
            )}
            <h1>{siteSettings.siteName}</h1>
          </a>
        </div>
        <ul>
          <li><a href="/" onClick={handleHomeClick}>首页</a></li>
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
                      background: '#ef4444', color: '#fff', fontSize: '11px',
                      borderRadius: '10px', padding: '1px 5px', minWidth: '16px',
                      textAlign: 'center', lineHeight: '14px'
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
                {showNotifPanel && createPortal(
                  <div ref={notifPanelRef} style={{
                    position: 'fixed', top: '60px', right: '20px',
                    width: '360px', maxHeight: '480px', overflow: 'auto',
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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
                            background: 'none', border: 'none', color: '#94a3b8',
                            cursor: 'pointer', fontSize: '13px'
                          }}>清除已读</button>
                        )}
                      </div>
                    </div>
                    <div>
                      {notifications.length === 0 ? (
                        <div style={{padding: '30px', textAlign: 'center', color: '#94a3b8'}}>
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
                              background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.08)',
                              color: 'var(--foreground)',
                              transition: 'background 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(99,102,241,0.08)'}
                          >
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                              <span style={{fontSize: '14px', fontWeight: n.isRead ? 400 : 600}}>
                                {n.message}
                              </span>
                              {!n.isRead && (
                                <span style={{width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginLeft: '8px'}}></span>
                              )}
                            </div>
                            <span style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block'}}>
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
              <li><button className="btn btn-secondary" onClick={logout}>退出</button></li>
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
                    borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    minWidth: '160px', zIndex: 10000, overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                  }}>
                    <Link to="/admin/dashboard" onClick={() => setShowMoreMenu(false)} style={{
                      display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                      textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >管理后台</Link>
                    <Link to="/privacy" onClick={() => setShowMoreMenu(false)} style={{
                      display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                      textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >隐私政策</Link>
                    <Link to="/terms" onClick={() => setShowMoreMenu(false)} style={{
                      display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                      textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >用户协议</Link>
                    <Link to="/about" onClick={() => setShowMoreMenu(false)} style={{
                      display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                      textDecoration: 'none', fontSize: '14px',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >关于我们</Link>
                  </div>
                )}
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login">登录</Link></li>
              <li><Link to="/register">注册</Link></li>
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
                    borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    minWidth: '160px', zIndex: 10000, overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                  }}>
                    <Link to="/privacy" onClick={() => setShowMoreMenu(false)} style={{
                      display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                      textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >隐私政策</Link>
                    <Link to="/terms" onClick={() => setShowMoreMenu(false)} style={{
                      display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                      textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >用户协议</Link>
                    <Link to="/about" onClick={() => setShowMoreMenu(false)} style={{
                      display: 'block', padding: '12px 16px', color: 'var(--foreground)',
                      textDecoration: 'none', fontSize: '14px',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >关于我们</Link>
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

function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
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
      <Router>
        <div className="container" style={{textAlign: 'center', paddingTop: '100px'}}>
          <h2>加载中...</h2>
        </div>
      </Router>
    );
  }
  
  return (
    <Router>
      <NavBar user={user} logout={logout} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/episode/:id" element={<EpisodeDetail user={user} />} />
          <Route path="/login" element={<Login login={login} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
          <Route path="/change-password" element={user ? <ChangePassword user={user} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/episodes" element={<AdminEpisodes />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/banners" element={<AdminBanners />} />
          <Route path="/admin/review" element={<AdminReview />} />
          <Route path="/admin/creator-profile" element={<AdminCreatorProfile />} />
          <Route path="/admin/site-content" element={<AdminSiteContent />} />
          <Route path="/admin/change-password" element={<ChangePassword />} />
          <Route path="/creator/:id" element={<CreatorPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
