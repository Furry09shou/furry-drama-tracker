import React, { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import axios from 'axios';

const AdminSidebar = ({ admin, onLogout, collapsed, setCollapsed }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { path: '/admin/dashboard', icon: '📊', label: '仪表盘', roles: ['creator', 'admin', 'superadmin'] },
    { path: '/admin/episodes', icon: '🎬', label: '剧集管理', roles: ['creator', 'admin', 'superadmin'] },
    { path: '/admin/creator-profile', icon: '👤', label: '创作者主页', roles: ['creator'] },
    { path: '/admin/review', icon: '✅', label: '审核管理', roles: ['admin', 'superadmin'] },
    { path: '/admin/reports', icon: '🚨', label: '举报管理', roles: ['admin', 'superadmin'] },
    { path: '/admin/feedback', icon: '💬', label: '用户反馈', roles: ['admin', 'superadmin'] },
    { path: '/admin/analytics', icon: '📈', label: '数据分析', roles: ['admin', 'superadmin'] },
    { path: '/admin/categories', icon: '🏷️', label: '分类管理', roles: ['admin', 'superadmin'] },
    { path: '/admin/banners', icon: '🖼️', label: '轮播图管理', roles: ['admin', 'superadmin'] },
    { path: '/admin/users', icon: '👥', label: '用户管理', roles: ['superadmin'] },
    { path: '/admin/site-content', icon: '📝', label: '网站内容', roles: ['superadmin'] },
    { path: '/admin/email-settings', icon: '📧', label: '邮件设置', roles: ['superadmin'] },
    { path: '/admin/audit-logs', icon: '📋', label: '操作日志', roles: ['superadmin'] },
    { path: '/admin/backup', icon: '💾', label: '数据备份', roles: ['superadmin'] },
    { path: '/admin/friend-links', icon: '🔗', label: '友链管理', roles: ['superadmin'] },
    { path: '/admin/sessions', icon: '📱', label: '设备管理', roles: ['superadmin'] },
    { path: '/admin/api-usage', icon: '📊', label: 'API监控', roles: ['superadmin'] },
    { path: '/admin/change-password', icon: '🔐', label: '修改密码', roles: ['creator', 'admin', 'superadmin'] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(admin?.role));
  const currentPath = location.pathname;

  const sidebarContent = (
    <div style={{
      width: collapsed ? '64px' : '240px',
      height: '100vh', position: 'fixed', left: 0, top: 0,
      background: '#1a1a2e', color: '#e0e0e0',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s ease',
      zIndex: 1000, overflowY: 'auto', overflowX: 'hidden'
    }}>
      <div style={{
        padding: collapsed ? '16px 8px' : '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {!collapsed && <h2 style={{ margin: 0, fontSize: '16px', color: '#fff', whiteSpace: 'nowrap' }}>管理后台</h2>}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          background: 'none', border: 'none', color: '#aaa', cursor: 'pointer',
          fontSize: '18px', padding: '4px'
        }}>{collapsed ? '→' : '←'}</button>
      </div>
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {filteredItems.map(item => {
          const isActive = currentPath === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: collapsed ? '12px 0' : '10px 20px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: isActive ? '#fff' : '#b0b0b0',
              background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
              textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? 600 : 400,
              borderLeft: isActive ? '3px solid #6c63ff' : '3px solid transparent',
              transition: 'all 0.2s', whiteSpace: 'nowrap'
            }} onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
               onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', color: '#b0b0b0', textDecoration: 'none',
          fontSize: '13px', borderRadius: '6px', transition: 'all 0.2s',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
           onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span>🏠</span>{!collapsed && <span>返回首页</span>}
        </Link>
        <button onClick={onLogout} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', color: '#ef4444', background: 'none', border: 'none',
          fontSize: '13px', cursor: 'pointer', borderRadius: '6px', width: '100%',
          transition: 'all 0.2s', justifyContent: collapsed ? 'center' : 'flex-start'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
           onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span>🚪</span>{!collapsed && <span>退出登录</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="admin-sidebar-desktop" style={{ display: 'block' }}>
        {sidebarContent}
      </div>
      <div className="admin-sidebar-mobile" style={{ display: 'none' }}>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{
          position: 'fixed', top: '12px', left: '12px', zIndex: 1001,
          background: '#1a1a2e', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '8px 12px', fontSize: '20px',
          cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>☰</button>
        {mobileOpen && (
          <>
            <div onClick={() => setMobileOpen(false)} style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.5)', zIndex: 999
            }} />
            <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 1000 }}>
              {sidebarContent}
            </div>
          </>
        )}
      </div>
    </>
  );
};

const AdminLayout = () => {
  const [admin, setAdmin] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        navigate('/admin', { replace: true });
      }
    } else {
      navigate('/admin', { replace: true });
    }
    const heartbeat = setInterval(() => {
      const t = localStorage.getItem('adminToken');
      if (t) {
        axios.post('/api/admin-sessions/heartbeat', {}, {
          headers: { Authorization: `Bearer ${t}` }
        }).catch(() => {});
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(heartbeat);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin', { replace: true });
  };

  if (!admin) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar admin={admin} onLogout={handleLogout} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div style={{
        flex: 1,
        marginLeft: collapsed ? '64px' : '240px',
        padding: '24px',
        minHeight: '100vh',
        transition: 'margin-left 0.3s ease'
      }} className="admin-main-content">
        <Outlet context={{ admin }} />
      </div>
    </div>
  );
};

export default AdminLayout;
