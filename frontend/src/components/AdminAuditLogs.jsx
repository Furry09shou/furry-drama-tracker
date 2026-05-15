import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminAuditLogs = () => {
  const [admin, setAdmin] = useState(null);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ action: '', admin: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      const parsed = JSON.parse(adminData);
      setAdmin(parsed);
      if (parsed.role !== 'superadmin') navigate('/admin/dashboard', { replace: true });
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!admin) return;
    const token = localStorage.getItem('adminToken');
    const params = new URLSearchParams({ page, limit: 30 });
    if (filter.action) params.set('action', filter.action);
    if (filter.admin) params.set('admin', filter.admin);
    axios.get(`/api/audit-logs?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { setLogs(res.data.logs); setTotal(res.data.total); })
      .catch(() => {});
  }, [admin, page, filter]);

  if (!admin) return null;

  const formatTime = (d) => new Date(d).toLocaleString('zh-CN');

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>操作日志</h2>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>共 {total} 条</span>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input placeholder="筛选操作类型" value={filter.action} onChange={e => { setFilter(p => ({ ...p, action: e.target.value })); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px' }} />
        <input placeholder="筛选管理员" value={filter.admin} onChange={e => { setFilter(p => ({ ...p, admin: e.target.value })); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px' }} />
      </div>

      <div style={{ borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--glass-bg)' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>时间</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>管理员</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>操作</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>目标</th>
              <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>详情</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '8px 14px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{formatTime(log.createdAt)}</td>
                <td style={{ padding: '8px 14px', color: 'var(--foreground)' }}>{log.adminName}</td>
                <td style={{ padding: '8px 14px' }}><span style={{ background: 'var(--primary-bg)', color: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{log.action}</span></td>
                <td style={{ padding: '8px 14px', color: 'var(--text-secondary)' }}>{log.target}</td>
                <td style={{ padding: '8px 14px', color: 'var(--text-tertiary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>暂无日志</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
        <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
        <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>第 {page} 页</span>
        <button className="btn btn-secondary" disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
