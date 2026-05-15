import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';

const Badge = ({ count }) => {
  if (!count) return null;
  return (
    <span style={{
      position: 'absolute', top: '10px', right: '10px',
      background: '#ef4444', color: '#fff', fontSize: '11px',
      fontWeight: 700, minWidth: '18px', height: '18px',
      borderRadius: '9px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0 5px',
      lineHeight: '18px', boxShadow: '0 1px 3px rgba(239,68,68,0.4)'
    }}>{count}</span>
  );
};

const AdminDashboard = () => {
  const { admin } = useOutletContext();
  const navigate = useNavigate();
  const [statusMsg, setStatusMsg] = useState('');
  const [pendingCounts, setPendingCounts] = useState({ episodes: 0, reports: 0, feedbacks: 0, friendLinks: 0 });
  const statusTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
    };
  }, []);

  const clearStatusMsg = useCallback(() => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = setTimeout(() => setStatusMsg(''), 3000);
  }, []);

  useEffect(() => {
    if (!admin) return;
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    axios.get('/api/admin/pending-counts', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setPendingCounts(res.data))
      .catch(() => {});
  }, [admin]);

  if (!admin) return null;

  return (
    <>
      <div style={{marginBottom: '30px'}}>
        <h2>欢迎，{admin.username}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          角色权限：{admin.role === 'superadmin' ? '超级管理员' : admin.role === 'admin' ? '管理员' : '创作者'}
        </p>
      </div>

      <div className="dashboard-cards">
        <Link to="/admin/episodes" className="dashboard-card" style={{ position: 'relative' }}>
          <div className="card-icon">🎬</div>
          <h3>剧集管理</h3>
          <p>{admin.role === 'creator' ? '创建和管理我的剧集' : '添加、编辑和管理剧集'}</p>
          <Badge count={pendingCounts.episodes} />
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

        {admin.role === 'superadmin' && (
          <Link to="/admin/email-settings" className="dashboard-card">
            <div className="card-icon">📧</div>
            <h3>邮件服务设置</h3>
            <p>配置SMTP邮件发送服务</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/audit-logs" className="dashboard-card">
            <div className="card-icon">📋</div>
            <h3>操作日志</h3>
            <p>查看管理员操作记录</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/backup" className="dashboard-card">
            <div className="card-icon">💾</div>
            <h3>数据备份与恢复</h3>
            <p>导出和恢复数据库</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/friend-links" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">🔗</div>
            <h3>友链管理</h3>
            <p>添加、编辑和管理友情链接</p>
            <Badge count={pendingCounts.friendLinks} />
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/sessions" className="dashboard-card">
            <div className="card-icon">📱</div>
            <h3>设备管理</h3>
            <p>管理账号登录设备</p>
          </Link>
        )}

        {admin.role === 'superadmin' && (
          <Link to="/admin/api-usage" className="dashboard-card">
            <div className="card-icon">📊</div>
            <h3>API用量监控</h3>
            <p>查看接口调用统计</p>
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/analytics" className="dashboard-card">
            <div className="card-icon">📈</div>
            <h3>数据分析</h3>
            <p>用户活跃度、热门剧集、留存率</p>
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/feedback" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">💬</div>
            <h3>用户反馈</h3>
            <p>查看和回复用户反馈</p>
            <Badge count={pendingCounts.feedbacks} />
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/review" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">✅</div>
            <h3>审核管理</h3>
            <p>审核创作者提交的剧集</p>
            <Badge count={pendingCounts.episodes} />
          </Link>
        )}

        {(admin.role === 'admin' || admin.role === 'superadmin') && (
          <Link to="/admin/reports" className="dashboard-card" style={{ position: 'relative' }}>
            <div className="card-icon">🚨</div>
            <h3>举报管理</h3>
            <p>处理用户举报</p>
            <Badge count={pendingCounts.reports} />
          </Link>
        )}

        <Link to="/admin/change-password" className="dashboard-card">
          <div className="card-icon">🔐</div>
          <h3>修改密码</h3>
          <p>修改登录密码</p>
        </Link>
      </div>

      {admin.role === 'superadmin' && (
        <div style={{ marginTop: '24px', background: 'var(--card)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--foreground)' }}>⚙️ 自动状态流转</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const token = localStorage.getItem('adminToken');
                const res = await axios.post('/api/auto-status/auto-complete', {}, { headers: { Authorization: `Bearer ${token}` } });
                setStatusMsg(res.data.message);
              } catch (e) { setStatusMsg('操作失败'); }
              clearStatusMsg();
            }}>🔄 自动标记已完结</button>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const token = localStorage.getItem('adminToken');
                const res = await axios.post('/api/auto-status/check-premieres', {}, { headers: { Authorization: `Bearer ${token}` } });
                setStatusMsg(res.data.message);
              } catch (e) { setStatusMsg('操作失败'); }
              clearStatusMsg();
            }}>🎬 发布到期预告</button>
          </div>
          {statusMsg && <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--success-text)' }}>{statusMsg}</p>}
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
