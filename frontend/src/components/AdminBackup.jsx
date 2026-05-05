import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminBackup = () => {
  const [admin, setAdmin] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [overwrite, setOverwrite] = useState(false);
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

  if (!admin) return null;

  const handleExport = async () => {
    setExporting(true);
    setMessage('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/backup/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage('导出成功');
    } catch (e) {
      setMessage('导出失败');
    }
    setExporting(false);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setMessage('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const token = localStorage.getItem('adminToken');
      const res = await axios.post('/api/backup/import', { data, overwrite }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('恢复成功：' + JSON.stringify(res.data.results));
    } catch (e) {
      setMessage('恢复失败：' + (e.response?.data?.message || e.message));
    }
    setImporting(false);
    e.target.value = '';
  };

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Link to="/admin/dashboard" className="btn btn-secondary">返回控制台</Link>
        <h2>数据备份与恢复</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '16px' }}>📦 导出备份</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px 0' }}>将所有数据导出为 JSON 文件，可用于迁移或备份。</p>
          <button className="btn" onClick={handleExport} disabled={exporting}>
            {exporting ? '导出中...' : '💾 导出数据'}
          </button>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '16px' }}>📥 恢复数据</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 12px 0' }}>从备份文件恢复数据。</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
            覆盖现有数据
          </label>
          <label className="btn" style={{ display: 'inline-block', cursor: importing ? 'wait' : 'pointer' }}>
            {importing ? '恢复中...' : '📂 选择备份文件'}
            <input type="file" accept=".json" onChange={handleImport} disabled={importing} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {message && (
        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: message.includes('成功') ? 'var(--success-bg)' : 'var(--destructive-bg)', color: message.includes('成功') ? 'var(--success-text)' : 'var(--destructive-text)', border: `1px solid ${message.includes('成功') ? 'var(--success-border)' : 'var(--destructive-border)'}`, fontSize: '13px' }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AdminBackup;
