import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [resolveNote, setResolveNote] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const adminData = localStorage.getItem('adminData');
    if (!adminData) { navigate('/admin'); return; }
    try { JSON.parse(adminData); } catch (e) { navigate('/admin'); return; }
  }, [navigate]);

  useEffect(() => {
    fetchReports();
  }, [statusFilter, page]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/reports/list', {
        params: { status: statusFilter, page, limit: 10 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.reports);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id, status) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/api/reports/resolve/${id}`, {
        status, resolveNote
      }, { headers: { Authorization: `Bearer ${token}` } });
      setResolveNote('');
      fetchReports();
    } catch (err) {
      console.error('Resolve report error:', err);
    }
  };

  const reasonLabels = {
    inappropriate: '不当内容', copyright: '版权侵权',
    spam: '垃圾信息', misleading: '误导信息', other: '其他'
  };
  const statusLabels = {
    pending: { text: '待处理', color: 'var(--warning-text)' },
    resolved: { text: '已处理', color: 'var(--secondary)' },
    dismissed: { text: '已驳回', color: 'var(--text-tertiary)' }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>🚨 举报管理</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        {['pending', 'resolved', 'dismissed', ''].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={statusFilter === s ? 'btn' : 'btn btn-secondary'}
            style={{ fontSize: '14px' }}>
            {s === '' ? '全部' : statusLabels[s].text}
            {s === 'pending' && ` (${total})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>加载中...</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>暂无举报</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.map(r => (
            <div key={r._id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '12px',
                      background: `${statusLabels[r.status].color}20`, color: statusLabels[r.status].color,
                      fontWeight: 600
                    }}>{statusLabels[r.status].text}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '12px',
                      background: 'var(--primary-bg)', color: 'var(--primary)', fontWeight: 600
                    }}>{reasonLabels[r.reason]}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      {r.targetType === 'episode' ? '剧集' : '创作者'}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    举报人：{r.reporterId?.username || '未知'}
                    {r.reporterId?.email && ` (${r.reporterId.email})`}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: '14px', color: 'var(--foreground)', marginTop: '8px' }}>
                      {r.description}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                    {new Date(r.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                {r.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input value={resolveNote} onChange={e => setResolveNote(e.target.value)}
                      placeholder="处理备注" style={{
                        padding: '6px 10px', borderRadius: '6px', fontSize: '13px',
                        background: 'var(--hover-bg-strong)', border: '1px solid var(--border)',
                        color: 'var(--foreground)', width: '140px'
                      }} />
                    <button onClick={() => handleResolve(r._id, 'resolved')}
                      className="btn" style={{ fontSize: '13px', padding: '6px 12px', background: 'var(--secondary)' }}>
                      处理
                    </button>
                    <button onClick={() => handleResolve(r._id, 'dismissed')}
                      className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 12px' }}>
                      驳回
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="btn btn-secondary" style={{ fontSize: '13px' }}>上一页</button>
          <span style={{ color: 'var(--text-secondary)', lineHeight: '36px', fontSize: '14px' }}>
            {page} / {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="btn btn-secondary" style={{ fontSize: '13px' }}>下一页</button>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
