import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin', { replace: true });
  };

  if (!admin) return null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <Link to="/" className="btn btn-secondary">返回首页</Link>
          <h2>管理后台</h2>
        </div>
        <div>
          <span style={{marginRight: '15px'}}>欢迎，{admin.username}</span>
          <button className="btn btn-secondary" onClick={handleLogout}>退出</button>
        </div>
      </div>

      <div className="dashboard-cards">
        <Link to="/admin/episodes" className="dashboard-card">
          <div className="card-icon">🎬</div>
          <h3>剧集管理</h3>
          <p>{admin.role === 'creator' ? '创建和管理我的剧集' : '添加、编辑和管理剧集'}</p>
        </Link>
        
        {admin.role === 'creator' && (
          <Link to="/admin/creator-profile" className="dashboard-card">
            <div className="card-icon">👤</div>
            <h3>管理主页</h3>
            <p>编辑我的创作者主页</p>
          </Link>
        )}
        
        {admin.role !== 'creator' && (
          <>
            <Link to="/admin/categories" className="dashboard-card">
              <div className="card-icon">🏷️</div>
              <h3>分类管理</h3>
              <p>添加、编辑和管理分类</p>
            </Link>

            <Link to="/admin/banners" className="dashboard-card">
              <div className="card-icon">🖼️</div>
              <h3>轮播图管理</h3>
              <p>管理首页轮播图内容</p>
            </Link>
          </>
        )}
        
        {admin.role === 'superadmin' && (
          <Link to="/admin/users" className="dashboard-card">
            <div className="card-icon">👥</div>
            <h3>用户管理</h3>
            <p>添加和管理账号</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/site-content" className="dashboard-card">
            <div className="card-icon">📝</div>
            <h3>网站内容管理</h3>
            <p>编辑隐私政策、用户协议、关于我们</p>
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/review" className="dashboard-card">
            <div className="card-icon">✅</div>
            <h3>审核管理</h3>
            <p>审核创作者提交的剧集</p>
          </Link>
        )}

        <Link to="/admin/change-password" className="dashboard-card">
          <div className="card-icon">🔐</div>
          <h3>修改密码</h3>
          <p>修改登录密码</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;