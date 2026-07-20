import React, { useState, useEffect, Component, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import I18nContext, { I18nProvider, useI18n } from './contexts/I18nContext';
import { SiteSettingsProvider, useSiteSettings } from './contexts/SiteSettingsContext';
import useTranslation from './hooks/useTranslation';
import NavBar from './components/NavBar';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import ForceEmailChange from './components/ForceEmailChange';
import Home from './components/Home';
import EpisodeDetail from './components/EpisodeDetail';
import Login from './components/Login';
import Register from './components/Register';
import NotFound from './components/NotFound';
import OfflineIndicator from './components/OfflineIndicator';
import InstallPrompt from './components/InstallPrompt';
import BrowserCompat from './components/BrowserCompat';
import AnnouncementBanner from './components/AnnouncementBanner';
import AnnouncementPopup from './components/AnnouncementPopup';

const Profile = lazy(() => import('./components/Profile'));
const Admin = lazy(() => import('./components/Admin'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const AdminEpisodes = lazy(() => import('./components/AdminEpisodes'));
const AdminUsers = lazy(() => import('./components/AdminUsers'));
const AdminCategories = lazy(() => import('./components/AdminCategories'));
const AdminBanners = lazy(() => import('./components/AdminBanners'));
const AdminReview = lazy(() => import('./components/AdminReview'));
const AdminCreatorProfile = lazy(() => import('./components/AdminCreatorProfile'));
const AdminCreatorProfiles = lazy(() => import('./components/AdminCreatorProfiles'));
const AdminAnnouncements = lazy(() => import('./components/AdminAnnouncements'));
const AdminSiteContent = lazy(() => import('./components/AdminSiteContent'));
const AdminReports = lazy(() => import('./components/AdminReports'));
const AdminStats = lazy(() => import('./components/AdminStats'));
const CreatorPage = lazy(() => import('./components/CreatorPage'));
const UpdateCalendar = lazy(() => import('./components/UpdateCalendar'));
const PrivacyPage = lazy(() => import('./components/SitePage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./components/SitePage').then(m => ({ default: m.TermsPage })));
const AboutPage = lazy(() => import('./components/SitePage').then(m => ({ default: m.AboutPage })));
const LicensePage = lazy(() => import('./components/SitePage').then(m => ({ default: m.LicensePage })));
const ChangePassword = lazy(() => import('./components/ChangePassword'));
const ChangeEmail = lazy(() => import('./components/ChangeEmail'));
const AccountSecurity = lazy(() => import('./components/AccountSecurity'));
const TwoFactorPage = lazy(() => import('./components/TwoFactorPage'));
const DeleteAccount = lazy(() => import('./components/DeleteAccount'));
const SharedFolder = lazy(() => import('./components/SharedFolder'));
const Settings = lazy(() => import('./components/Settings'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const VerifyEmail = lazy(() => import('./components/VerifyEmail'));
const VerifyEmailChange = lazy(() => import('./components/VerifyEmailChange'));
const AdminEmailSettings = lazy(() => import('./components/AdminEmailSettings'));
const AdminAuditLogs = lazy(() => import('./components/AdminAuditLogs'));
const AdminBackup = lazy(() => import('./components/AdminBackup'));
const AdminFeedback = lazy(() => import('./components/AdminFeedback'));
const AdminApiUsage = lazy(() => import('./components/AdminApiUsage'));
const AdminFriendLinks = lazy(() => import('./components/AdminFriendLinks'));
const AdminSessions = lazy(() => import('./components/AdminSessions'));
const UserDevices = lazy(() => import('./components/UserDevices'));
const FriendLinks = lazy(() => import('./components/FriendLinks'));
const FeedbackModal = lazy(() => import('./components/FeedbackModal'));
const ThemeColorPicker = lazy(() => import('./components/ThemeColorPicker'));
const AdminAnalytics = lazy(() => import('./components/AdminAnalytics'));
const Timeline = lazy(() => import('./components/Timeline'));

const getRoutePageTitleKey = (pathname) => {
  // 管理后台路由
  if (pathname === '/admin') return 'pageTitle.admin';
  if (pathname.startsWith('/admin/dashboard')) return 'pageTitle.adminDashboard';
  if (pathname.startsWith('/admin/episodes')) return 'pageTitle.adminEpisodes';
  if (pathname.startsWith('/admin/users')) return 'pageTitle.adminUsers';
  if (pathname.startsWith('/admin/categories')) return 'pageTitle.adminCategories';
  if (pathname.startsWith('/admin/banners')) return 'pageTitle.adminBanners';
  if (pathname.startsWith('/admin/review')) return 'pageTitle.adminReview';
  if (pathname.startsWith('/admin/reports')) return 'pageTitle.adminReports';
  if (pathname.startsWith('/admin/stats')) return 'pageTitle.adminStats';
  if (pathname.startsWith('/admin/creator-profiles')) return 'pageTitle.adminCreatorProfiles';
  if (pathname.startsWith('/admin/announcements')) return 'pageTitle.adminAnnouncements';
  if (pathname.startsWith('/admin/creator-profile')) return 'pageTitle.adminCreatorProfile';
  if (pathname.startsWith('/admin/site-content')) return 'pageTitle.adminSiteContent';
  if (pathname.startsWith('/admin/email-settings')) return 'pageTitle.adminEmailSettings';
  if (pathname.startsWith('/admin/audit-logs')) return 'pageTitle.adminAuditLogs';
  if (pathname.startsWith('/admin/backup')) return 'pageTitle.adminBackup';
  if (pathname.startsWith('/admin/feedback')) return 'pageTitle.adminFeedback';
  if (pathname.startsWith('/admin/api-usage')) return 'pageTitle.adminApiUsage';
  if (pathname.startsWith('/admin/friend-links')) return 'pageTitle.adminFriendLinks';
  if (pathname.startsWith('/admin/sessions')) return 'pageTitle.adminSessions';
  if (pathname.startsWith('/admin/analytics')) return 'pageTitle.adminAnalytics';

  // 公共路由
  if (pathname === '/') return 'pageTitle.home';
  if (pathname.startsWith('/episode/')) return 'pageTitle.episodeDetail';
  if (pathname === '/login' || pathname === '/verify-device') return 'pageTitle.login';
  if (pathname === '/register') return 'pageTitle.register';
  if (pathname === '/profile') return 'pageTitle.profile';
  if (pathname === '/devices') return 'pageTitle.devices';
  if (pathname === '/change-password') return 'pageTitle.changePassword';
  if (pathname === '/change-email') return 'pageTitle.changeEmail';
  if (pathname === '/account-security') return 'pageTitle.accountSecurity';
  if (pathname === '/two-factor') return 'pageTitle.twoFactor';
  if (pathname === '/delete-account') return 'pageTitle.deleteAccount';
  if (pathname === '/settings') return 'pageTitle.settings';
  if (pathname === '/reset-password') return 'pageTitle.resetPassword';
  if (pathname === '/verify-email') return 'pageTitle.verifyEmail';
  if (pathname === '/verify-email-change') return 'pageTitle.verifyEmailChange';
  if (pathname.startsWith('/shared-folder/')) return 'pageTitle.sharedFolder';
  if (pathname === '/calendar') return 'pageTitle.calendar';
  if (pathname === '/timeline') return 'pageTitle.timeline';
  if (pathname.startsWith('/creator/')) return 'pageTitle.creator';
  if (pathname === '/privacy') return 'pageTitle.privacy';
  if (pathname === '/terms') return 'pageTitle.terms';
  if (pathname === '/about') return 'pageTitle.about';
  if (pathname === '/friend-links') return 'pageTitle.friendLinks';
  if (pathname === '/license') return 'pageTitle.license';

  return null;
};

const LoadingFallback = () => {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        <div>{t('common.loading')}</div>
      </div>
    </div>
  );
};

const AdminGuard = ({ children }) => {
  const [verifying, setVerifying] = React.useState(true);
  const [authorized, setAuthorized] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const res = await axios.get('/api/admin/verify');
        setAuthorized(res.status === 200);
      } catch {
        setAuthorized(false);
      }
      setVerifying(false);
    };
    verifyAdmin();
  }, [location.pathname]);

  if (verifying) return <LoadingFallback />;
  if (!authorized) return <Navigate to="/login" replace />;
  return children;
};

const FooterBeian = () => {
  const { t } = useI18n();
  const { getLocalizedContent } = useTranslation();
  const [aboutData, setAboutData] = useState(null);
  const [showGithubModal, setShowGithubModal] = useState(false);

  useEffect(() => {
    axios.get('/api/site-content/about')
      .then(res => {
        try {
          const data = JSON.parse(res.data.content);
          setAboutData(data);
        } catch (e) {}
      })
      .catch(() => {});
  }, []);

  if (!aboutData) return null;

  const copyright = getLocalizedContent(aboutData, 'copyright') || aboutData.copyright || '';
  const aiDisclaimer = getLocalizedContent(aboutData, 'aiDisclaimer') || aboutData.aiDisclaimer || '';

  if (!aboutData.icp && !aboutData.policeRecord && !copyright && !aiDisclaimer) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '12px', right: '16px', zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px',
      opacity: 0.5, transition: 'opacity 0.3s',
      fontSize: '12px', lineHeight: 1.6,
      padding: '6px 10px', borderRadius: '8px',
      background: 'rgba(var(--background-rgb), 0.6)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }}
    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
    >
      <button
        onClick={() => window.location.reload()}
        title={t('common.refreshPage')}
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
        {t('common.refresh')}
      </button>
      {copyright && (
        <span style={{ color: 'var(--text-secondary)' }}>{copyright}</span>
      )}
      {aiDisclaimer && (
        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{aiDisclaimer}</span>
      )}
      {aboutData.icp && (
        <a
          href={`https://beian.miit.gov.cn/#/Integrated/index`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
        >{aboutData.icp}</a>
      )}
      {aboutData.policeRecord && (
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
          {aboutData.policeRecord}
        </a>
      )}
      <Link to="/license" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
      >{t('footer.licenseAgreement')}</Link>
      <span
        onClick={() => setShowGithubModal(true)}
        style={{ color: 'var(--text-tertiary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style={{ flexShrink: 0 }}><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        {t('footer.githubProject')}
      </span>
      {showGithubModal && (
        <div onClick={() => setShowGithubModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px', width: 'min(360px, calc(100vw - 40px))',
            maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--foreground)' }}>{t('footer.githubProject')}</h3>
              <button onClick={() => setShowGithubModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1
              }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '20px' }}>📦</span>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>{t('footer.project')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>furry-drama-tracker</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{t('footer.frontendProject')}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GPL v3.0</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{t('footer.backendProject')}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AGPL v3.0</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to="/license" onClick={() => setShowGithubModal(false)} style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >{t('footer.viewLicense')}</Link>
                  <a href="https://github.com/Furry09shou/furry-drama-tracker" target="_blank" rel="noopener noreferrer" onClick={() => setShowGithubModal(false)} style={{
                    padding: '6px 12px', borderRadius: '8px', background: 'var(--primary)',
                    color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                    flexShrink: 0, whiteSpace: 'nowrap'
                  }}>GitHub</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {aboutData.version && (
        <span style={{ color: 'var(--text-tertiary)' }}>v{aboutData.version}</span>
      )}
    </div>
  );
};

function AppContent() {
  const { user, login, logout, initializing, updateUser } = useAuth();
  const { t, lang } = useI18n();
  const { settings: siteSettingsData } = useSiteSettings();
  const [showFeedback, setShowFeedback] = useState(false);
  const [apiError, setApiError] = useState(null);
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleApiError = (e) => {
      const msg = e.detail.message || (e.detail.messageKey ? t(e.detail.messageKey) : '');
      setApiError(msg);
      setTimeout(() => setApiError(null), 3000);
    };
    window.addEventListener('api-error', handleApiError);
    return () => window.removeEventListener('api-error', handleApiError);
  }, [t]);

  useEffect(() => {
    if (!siteSettingsData) return;
    const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
    const siteName = siteSettingsData[`browserTitle${suffix}`] || siteSettingsData.browserTitle || t('site.defaultName');
    const pageKey = getRoutePageTitleKey(location.pathname);
    const pageTitle = pageKey ? t(pageKey) : null;
    document.title = pageTitle ? `${pageTitle} - ${siteName}` : siteName;
    if (siteSettingsData.favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = siteSettingsData.favicon;
    }
  }, [siteSettingsData, lang, location.pathname, t]);

  // ===== 自定义网站背景图片：用户个人背景 > 站点默认背景 > 未登录 localStorage 背景 =====
  useEffect(() => {
    const applyBg = () => {
      const root = document.documentElement;
      // 优先级：用户个人背景 > 站点默认背景 > 未登录 localStorage 背景
      const userBg = user?.backgroundPrefs;
      const siteBg = siteSettingsData;
      let bg = null;
      if (userBg && userBg.enabled && userBg.image) {
        bg = userBg;
      } else if (siteBg && siteBg.backgroundEnabled && siteBg.backgroundImage) {
        bg = { image: siteBg.backgroundImage, opacity: siteBg.backgroundOpacity, blur: siteBg.backgroundBlur };
      } else if (!user) {
        // 未登录用户：读取 localStorage
        try {
          const guest = JSON.parse(localStorage.getItem('guest_background_prefs') || '{}');
          if (guest.enabled && guest.image) bg = guest;
        } catch {}
      }

      if (bg) {
        root.style.setProperty('--bg-image', `url(${bg.image})`);
        root.style.setProperty('--bg-opacity', ((bg.opacity !== undefined ? bg.opacity : 30) / 100).toString());
        root.style.setProperty('--bg-blur', `${bg.blur || 0}px`);
        root.setAttribute('data-custom-bg', 'true');
      } else {
        root.style.removeProperty('--bg-image');
        root.style.removeProperty('--bg-opacity');
        root.style.removeProperty('--bg-blur');
        root.removeAttribute('data-custom-bg');
      }
    };
    applyBg();
    // 监听未登录用户背景更新事件
    const onGuestBg = () => applyBg();
    window.addEventListener('guest-bg-updated', onGuestBg);
    return () => window.removeEventListener('guest-bg-updated', onGuestBg);
  }, [siteSettingsData, user]);

  // ===== PWA 运行时更新：指向后端动态 manifest 端点，并更新图标、主题色等 meta =====
  useEffect(() => {
    if (!siteSettingsData) return;
    const pwaName = siteSettingsData.pwaName || siteSettingsData.siteName || t('site.defaultName');
    const pwaShortName = siteSettingsData.pwaShortName || (pwaName || '').slice(0, 12);
    const pwaThemeColor = siteSettingsData.pwaThemeColor || '#6366f1';

    // 将 manifest 链接指向后端动态端点（同源 HTTP，满足浏览器可安装性要求）
    // 不再使用 blob: URL，因为 blob: URL 会导致浏览器无法验证 manifest，安装提示不弹出
    let manifestLink = document.querySelector("link[rel='manifest']");
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }
    const currentHref = manifestLink.getAttribute('href') || '';
    // 仅在尚未指向动态端点时更新，避免重复设置
    if (!currentHref.includes('/api/site-content/pwa-manifest')) {
      manifestLink.setAttribute('href', '/api/site-content/pwa-manifest');
    }

    // 更新 apple-touch-icon
    if (siteSettingsData.pwaIcon512 || siteSettingsData.pwaIcon192) {
      let appleLink = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = siteSettingsData.pwaIcon512 || siteSettingsData.pwaIcon192;
    }

    // 更新 apple-mobile-web-app-title
    const setMeta = (name, content) => {
      if (!content) return;
      let meta = document.querySelector(`meta[name='${name}']`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    setMeta('apple-mobile-web-app-title', pwaShortName || pwaName);
    setMeta('application-name', pwaShortName || pwaName);
    setMeta('theme-color', pwaThemeColor);
    setMeta('msapplication-TileColor', pwaThemeColor);
  }, [siteSettingsData, t]);

  if (initializing) {
    return (
      <div className="container" style={{textAlign: 'center', paddingTop: '100px'}}>
        <h2>{t('common.loading')}</h2>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
              <Route path="episodes" element={<AdminGuard><AdminEpisodes /></AdminGuard>} />
              <Route path="users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
              <Route path="categories" element={<AdminGuard><AdminCategories /></AdminGuard>} />
              <Route path="banners" element={<AdminGuard><AdminBanners /></AdminGuard>} />
              <Route path="review" element={<AdminGuard><AdminReview /></AdminGuard>} />
              <Route path="reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
              <Route path="stats" element={<AdminGuard><AdminStats /></AdminGuard>} />
              <Route path="creator-profile" element={<AdminGuard><AdminCreatorProfile /></AdminGuard>} />
              <Route path="creator-profiles" element={<AdminGuard><AdminCreatorProfiles /></AdminGuard>} />
              <Route path="announcements" element={<AdminGuard><AdminAnnouncements /></AdminGuard>} />
              <Route path="site-content" element={<AdminGuard><AdminSiteContent /></AdminGuard>} />
              <Route path="email-settings" element={<AdminGuard><AdminEmailSettings /></AdminGuard>} />
              <Route path="audit-logs" element={<AdminGuard><AdminAuditLogs /></AdminGuard>} />
              <Route path="backup" element={<AdminGuard><AdminBackup /></AdminGuard>} />
              <Route path="feedback" element={<AdminGuard><AdminFeedback /></AdminGuard>} />
              <Route path="api-usage" element={<AdminGuard><AdminApiUsage /></AdminGuard>} />
              <Route path="friend-links" element={<AdminGuard><AdminFriendLinks /></AdminGuard>} />
              <Route path="sessions" element={<AdminGuard><AdminSessions /></AdminGuard>} />
              <Route path="analytics" element={<AdminGuard><AdminAnalytics /></AdminGuard>} />
            </Route>
          </Routes>
        </Suspense>
        <FooterBeian />
      </>
    );
  }

  return (
    <>
      <a href="#main-content" className="skip-link">{t('common.skipToMain')}</a>
      <AnnouncementBanner />
      <NavBarErrorBoundary>
        <NavBar onFeedback={() => setShowFeedback(true)} />
      </NavBarErrorBoundary>
      <div className="container" id="main-content">
        <div key={location.pathname} className="page-enter">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/episode/:id" element={<EpisodeDetail user={user} />} />
            <Route path="/login" element={<Login login={login} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={user ? <Profile user={user} setUser={updateUser} logout={logout} /> : <Navigate to="/login" />} />
            <Route path="/devices" element={user ? <UserDevices user={user} /> : <Navigate to="/login" />} />
            <Route path="/change-password" element={user ? <ChangePassword user={user} /> : <Navigate to="/login" />} />
            <Route path="/change-email" element={user ? <ChangeEmail user={user} /> : <Navigate to="/login" />} />
            <Route path="/account-security" element={user ? <AccountSecurity user={user} /> : <Navigate to="/login" />} />
            <Route path="/two-factor" element={user ? <TwoFactorPage user={user} setUser={updateUser} /> : <Navigate to="/login" />} />
            <Route path="/delete-account" element={user ? <DeleteAccount user={user} /> : <Navigate to="/login" />} />
            <Route path="/settings" element={user ? <Settings user={user} /> : <Navigate to="/login" />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/verify-email-change" element={<VerifyEmailChange />} />
            <Route path="/shared-folder/:shareToken" element={<SharedFolder />} />
            <Route path="/verify-device" element={<Login login={login} />} />
            <Route path="/calendar" element={<UpdateCalendar />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/creator/:id" element={<CreatorPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/friend-links" element={<FriendLinks />} />
            <Route path="/license" element={<LicensePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </div>
      </div>
      <FooterBeian />
      <FeedbackModal show={showFeedback} onClose={() => setShowFeedback(false)} user={user} />
      <ThemeColorPicker />
      <OfflineIndicator />
      <InstallPrompt />
      <AnnouncementPopup />
      {user?.forceEmailChange && (
        <ForceEmailChange onUpdate={updateUser} onLogout={logout} />
      )}
      {apiError && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', background: '#e74c3c', color: '#fff',
          padding: '12px 20px', borderRadius: '8px', zIndex: 10000, fontSize: '14px',
          maxWidth: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'opacity 0.3s'
        }}>{apiError}</div>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <ThemeProvider>
        <I18nProvider>
          <SiteSettingsProvider>
            <AuthProvider>
            <ErrorBoundary>
              <BrowserCompat>
                <AppContent />
              </BrowserCompat>
            </ErrorBoundary>
            </AuthProvider>
          </SiteSettingsProvider>
        </I18nProvider>
      </ThemeProvider>
    </Router>
  );
}

class NavBarErrorBoundary extends Component {
  static contextType = I18nContext;
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      const t = this.context?.t || ((k) => k);
      return (
        <header style={{ padding: '12px 20px', background: 'var(--card)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)', textDecoration: 'none' }}>{t('admin.brand')}</Link>
          <button onClick={() => window.location.reload()} style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: '6px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}>{t('common.refresh')}</button>
        </header>
      );
    }
    return this.props.children;
  }
}

class ErrorBoundary extends Component {
  static contextType = I18nContext;
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidMount() {
  }
  componentWillUnmount() {
  }
  render() {
    if (this.state.hasError) {
      const { t } = this.context;
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--foreground)' }}>
          <h2>{t('common.pageLoadError')}</h2>
          <p style={{ color: 'var(--destructive-text)', margin: '16px 0' }}>{import.meta.env.PROD ? t('common.pageLoadError') : this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} style={{ padding: '10px 24px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' }}>{t('common.refreshPage')}</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 全局异步错误处理
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

export default App;
