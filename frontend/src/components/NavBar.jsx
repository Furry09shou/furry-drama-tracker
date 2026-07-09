import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import useTranslation from '../hooks/useTranslation';
import useNotifications from '../hooks/useNotifications';
import usePushNotifications from '../hooks/usePushNotifications';
import LanguageSwitcher from './LanguageSwitcher';
import TranslatableText from './TranslatableText';
import TransitionLink from './TransitionLink';

// ===== 常用样式常量 =====
const btnNoneStyle = { background: 'none', border: 'none', cursor: 'pointer' };
const dropdownStyle = {
  position: 'absolute', top: '100%', right: 0,
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: '10px', boxShadow: '0 8px 32px var(--shadow-modal)',
  minWidth: '160px', zIndex: 10000, overflow: 'hidden',
  backdropFilter: 'blur(20px)'
};
const menuItemStyle = {
  display: 'block', padding: '12px 16px', color: 'var(--foreground)',
  textDecoration: 'none', fontSize: '14px',
  transition: 'background 0.2s'
};
const mobileMenuItemBtnStyle = {
  display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
  color: 'var(--foreground)', background: 'none', border: 'none',
  fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
  transition: 'background 0.2s'
};

const NavBar = ({ onFeedback }) => {
  const { user, logout } = useAuth();
  const { t, lang } = useI18n();
  const { getLocalizedContent, getLocalizedTitle } = useTranslation();
  const { settings: siteSettingsData, loading: siteSettingsLoading } = useSiteSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    clearRead,
    deleteAllRead,
    refreshNotifications,
  } = useNotifications();
  const push = usePushNotifications();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { theme, toggleTheme, themeIcon, themeTitle } = useTheme();

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  // 点击外部关闭下拉菜单
  const navRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setShowNotifPanel(false);
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    if (!showNotifPanel || !user) return;
    refreshNotifications();
  }, [showNotifPanel, user]);

  // ===== 通知面板 - 可提取为 NotificationPanel 组件 =====
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return t('common.justNow');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${t('common.minutesAgo')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${t('common.hoursAgo')}`;
    return `${Math.floor(diff / 86400000)}${t('common.daysAgo')}`;
  };

  const getNotificationMessage = (n) => {
    const title = getLocalizedTitle({ title: n.episodeTitle, titleEn: n.episodeTitleEn }) || n.episodeTitle || '';
    switch (n.type) {
      case 'new_episode': {
        let ep = n.metadata?.episodeNumber;
        if (ep === undefined || ep === null) {
          const match = n.message?.match(/第(\d+)集/);
          ep = match ? match[1] : '';
        }
        return t('notification.newEpisode', { title, ep: ep ?? '' });
      }
      case 'status_change': {
        const status = n.metadata?.status || '';
        if (status) {
          return t('notification.statusChange', { title, status });
        }
        return <TranslatableText text={n.message} />;
      }
      case 'feedback_reply':
        return t('notification.feedbackReply', { reply: n.metadata?.reply || n.message || '' });
      case 'friend_link_apply':
        return t('notification.friendLinkApply', { name: n.metadata?.name || '' });
      case 'friend_link_status':
        return t('notification.friendLinkStatus', { name: n.metadata?.name || '', status: n.metadata?.status || '' });
      case 'reminder':
        return t('notification.reminder');
      default:
        return null;
    }
  };

  const renderNotificationMessage = (n) => {
    const structured = getNotificationMessage(n);
    if (structured !== null) return structured;
    return <TranslatableText text={n.message} />;
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
    ...(user && ['admin', 'superadmin', 'creator'].includes(user.role) ? [{ to: '/admin/dashboard', label: t('nav.admin') }] : []),
    { to: '/friend-links', label: t('nav.friendLinks') },
    { to: '/privacy', label: t('nav.privacy') },
    { to: '/terms', label: t('nav.terms') },
    { to: '/license', label: t('nav.license') },
    { to: '/about', label: t('nav.about') },
  ];

  const [showMobileMore, setShowMobileMore] = useState(false);

  // ===== 移动端更多菜单 - 可提取为 MobileMenu 组件 =====
  const renderMobileMoreItems = () => (
    <>
      {installPrompt && !isInstalled && (
        <li>
          <button onClick={() => { handleInstallClick(); setShowMobileMore(false); }} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
            color: 'var(--foreground)', background: 'none', border: 'none',
            fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
            transition: 'background 0.2s'
          }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
             onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >{t('pwa.installBtn')}</button>
        </li>
      )}
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
        >{t('nav.userFeedback')}</button>
      </li>
      <li>
        <button onClick={() => { clearSiteCache(); setShowMobileMore(false); }} style={{
          display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
          color: 'var(--foreground)', background: 'none', border: 'none',
          fontSize: '14px', fontWeight: 500, cursor: 'pointer', borderRadius: '8px',
          transition: 'background 0.2s'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
           onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >{t('nav.clearCache')}</button>
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
          >{t('nav.logout')}</button>
        </li>
      )}
    </>
  );

  // ===== 主导航渲染 =====
  return (
    <header ref={navRef}>
      <nav>
        <div className="logo">
          <a href="/" onClick={(e) => { e.preventDefault(); if (document.startViewTransition) { document.startViewTransition(() => navigate('/')); } else { navigate('/'); } }} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {siteSettingsData?.navLogo && (
              <img src={siteSettingsData.navLogo} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
            )}
            <h1>{siteSettingsLoading ? '' : (getLocalizedContent(siteSettingsData || {}, 'siteName') || t('site.defaultName'))}</h1>
          </a>
        </div>
        <div className="mobile-actions" style={{ display: 'none', alignItems: 'center', gap: '4px' }}>
          {user && (
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              aria-expanded={showNotifPanel}
              aria-haspopup="true"
              aria-label={t('nav.notifications') || '通知'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--foreground)', fontSize: '20px', position: 'relative',
                padding: '6px', lineHeight: 1
              }}
            >
              <span aria-hidden="true">🔔</span>
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
          }} title={themeTitle} aria-label={themeTitle}>
            {themeIcon}
          </button>
          <LanguageSwitcher style={{ fontSize: '12px' }} />
          <button className="mobile-menu-btn" onClick={() => { setShowMobileMenu(!showMobileMenu); setShowMobileMore(false); }} aria-expanded={showMobileMenu} aria-haspopup="true" aria-label={t('nav.menu')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--foreground)', fontSize: '22px', padding: '6px'
          }}><span aria-hidden="true">☰</span></button>
        </div>
        <ul className={showMobileMenu ? 'mobile-open' : ''}>
          <li><a href="/" onClick={(e) => { e.preventDefault(); setShowMobileMenu(false); if (document.startViewTransition) { document.startViewTransition(() => navigate('/')); } else { navigate('/'); } }} style={{ color: isActive('/') ? 'var(--primary)' : undefined }}>{t('nav.home')}</a></li>
          <li><TransitionLink to="/calendar" onClick={() => setShowMobileMenu(false)} style={{ color: isActive('/calendar') ? 'var(--primary)' : undefined }}>{t('nav.calendar')}</TransitionLink></li>
          <li><TransitionLink to="/timeline" onClick={() => setShowMobileMenu(false)} style={{ color: isActive('/timeline') ? 'var(--primary)' : undefined }}>{t('nav.timeline')}</TransitionLink></li>
          {user ? (
            <>
              <li><TransitionLink to="/profile" onClick={() => setShowMobileMenu(false)} style={{ color: isActive('/profile') ? 'var(--primary)' : undefined }}>{t('nav.profile')}</TransitionLink></li>
              <li style={{position: 'relative'}}>
                <button
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
                  className="desktop-only-notif"
                  aria-expanded={showNotifPanel}
                  aria-haspopup="true"
                  aria-label={t('nav.notifications') || '通知'}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--foreground)', fontSize: '20px', position: 'relative',
                    padding: '4px 8px', lineHeight: 1
                  }}
                >
                  <span aria-hidden="true">🔔</span>
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: '-2px', right: '0',
                      background: 'var(--badge-bg)', color: 'var(--badge-text)', fontSize: '11px',
                      borderRadius: '10px', padding: '1px 5px', minWidth: '16px',
                      textAlign: 'center', lineHeight: '14px'
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>
                {showNotifPanel && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute', top: '100%', right: 0,
                    width: 'min(360px, calc(100vw - 40px))', maxHeight: '480px', overflow: 'auto',
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '12px', boxShadow: '0 8px 32px var(--shadow-modal)',
                    zIndex: 10000, backdropFilter: 'blur(20px)', padding: 0
                  }}
                >
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px', borderBottom: '1px solid var(--border)'
                    }}>
                      <h3 style={{margin: 0, fontSize: '16px', color: 'var(--foreground)'}}>{t('nav.notifications')}</h3>
                      <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                        {user && (
                          <button onClick={() => navigate('/settings')} style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px',
                            color: 'var(--text-secondary)',
                          }}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            {t('notification.pushSettings')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                      {unreadCount > 0 && (
                        <button onClick={markAllRead} style={{ fontSize: '12px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {t('notification.markAllRead')}
                        </button>
                      )}
                      {notifications.some(n => n.isRead) && (
                        <button onClick={deleteAllRead} style={{ fontSize: '12px', color: 'var(--destructive-text)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          {t('notification.clearRead')}
                        </button>
                      )}
                    </div>
                    <div>
                      {notifications.length === 0 ? (
                        <div style={{padding: '30px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                          {t('notification.noNotifications')}
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n._id}
                            role="menuitem"
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
                                {renderNotificationMessage(n)}
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
                  </div>
                )}
              </li>
              <li className="desktop-only-theme">
                <LanguageSwitcher style={{ fontSize: '13px' }} />
              </li>
              <li className="desktop-only-theme">
                <button onClick={toggleTheme} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--foreground)', fontSize: '18px', padding: '4px 8px'
                }} title={themeTitle} aria-label={themeTitle}>
                  {themeIcon}
                </button>
              </li>
              <li style={{position: 'relative'}}>
                <button
                  className="desktop-more-btn"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  aria-expanded={showMoreMenu}
                  aria-haspopup="true"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--foreground)', fontSize: '14px',
                    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {t('nav.more')}
                </button>
                {showMoreMenu && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute', top: '100%', right: 0,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '10px', boxShadow: '0 8px 32px var(--shadow-modal)',
                    minWidth: '160px', zIndex: 10000, overflow: 'hidden',
                    backdropFilter: 'blur(20px)', padding: 0
                  }}
                >
                  {installPrompt && !isInstalled && (
                    <button onClick={() => { handleInstallClick(); setShowMoreMenu(false); }} role="menuitem" style={{
                      display: 'block', width: '100%', padding: '12px 16px',
                      color: 'var(--foreground)', background: 'none', border: 'none',
                      fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid var(--border)'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >{t('pwa.installBtn')}</button>
                  )}
                  {moreMenuItems.map((item, i) => (
                    <Link key={item.to} to={item.to} onClick={() => { setShowMoreMenu(false); setShowMobileMenu(false); }} role="menuitem" style={{
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
                    >{t('nav.userFeedback')}</button>
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
                    >{t('nav.clearCache')}</button>
                  </div>
                  <div>
                    <button onClick={() => { setShowMoreMenu(false); logout(); }} style={{
                      display: 'block', width: '100%', padding: '12px 16px',
                      color: 'var(--destructive-text)', background: 'none', border: 'none',
                      fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--destructive-bg-subtle)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >{t('nav.logout')}</button>
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
                  <span>{t('nav.more')}</span>
                  <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: showMobileMore ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                </button>
              </li>
              {showMobileMore && renderMobileMoreItems()}
            </>
          ) : (
            <>
              <li><Link to="/login">{t('nav.login')}</Link></li>
              <li><Link to="/register">{t('nav.register')}</Link></li>
              <li className="desktop-only-theme">
                <LanguageSwitcher style={{ fontSize: '13px' }} />
              </li>
              <li className="desktop-only-theme">
                <button onClick={toggleTheme} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--foreground)', fontSize: '18px', padding: '4px 8px'
                }} title={themeTitle} aria-label={themeTitle}>
                  {themeIcon}
                </button>
              </li>
              <li style={{position: 'relative'}}>
                <button
                  className="desktop-more-btn"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  aria-expanded={showMoreMenu}
                  aria-haspopup="true"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--foreground)', fontSize: '14px',
                    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {t('nav.more')}
                </button>
                {showMoreMenu && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute', top: '100%', right: 0,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '10px', boxShadow: '0 8px 32px var(--shadow-modal)',
                    minWidth: '160px', zIndex: 10000, overflow: 'hidden',
                    backdropFilter: 'blur(20px)', padding: 0
                  }}
                >
                  {installPrompt && !isInstalled && (
                    <button onClick={() => { handleInstallClick(); setShowMoreMenu(false); }} role="menuitem" style={{
                      display: 'block', width: '100%', padding: '12px 16px',
                      color: 'var(--foreground)', background: 'none', border: 'none',
                      fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.2s',
                      borderBottom: '1px solid var(--border)'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >{t('pwa.installBtn')}</button>
                  )}
                  {moreMenuItems.map((item, i) => (
                    <Link key={item.to} to={item.to} onClick={() => { setShowMoreMenu(false); setShowMobileMenu(false); }} role="menuitem" style={{
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
                      transition: 'background 0.2s'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                       onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >{t('nav.clearCache')}</button>
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
                  <span>{t('nav.more')}</span>
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

export default NavBar;
