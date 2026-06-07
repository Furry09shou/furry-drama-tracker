import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const AdminBackup = () => {
  const { admin } = useOutletContext();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (admin.role !== 'superadmin') navigate('/admin/dashboard', { replace: true });
  }, [admin, navigate]);

  if (!admin) return null;

  const handleExport = async () => {
    setExporting(true);
    setMessage('');
    try {
      const res = await adminApi.get('/api/backup/export', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage(t('adminBackup.exportSuccess'));
    } catch (e) {
      setMessage(t('adminBackup.exportFailed'));
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
      const res = await adminApi.post('/api/backup/import', { data, overwrite });
      setMessage(t('adminBackup.importSuccess') + JSON.stringify(res.data.results));
    } catch (e) {
      setMessage(t('adminBackup.importFailed') + (e.response?.data?.message || e.message));
    }
    setImporting(false);
    e.target.value = '';
  };

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <h2>{t('adminBackup.title')}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '16px' }}>{t('adminBackup.exportTitle')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px 0' }}>{t('adminBackup.exportDesc')}</p>
          <button className="btn" onClick={handleExport} disabled={exporting}>
            {exporting ? t('adminBackup.exporting') : t('adminBackup.exportData')}
          </button>
        </div>

        <div style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '16px' }}>{t('adminBackup.importTitle')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, margin: '0 0 12px 0' }}>{t('adminBackup.importDesc')}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
            {t('adminBackup.overwriteData')}
          </label>
          <label className="btn" style={{ display: 'inline-block', cursor: importing ? 'wait' : 'pointer' }}>
            {importing ? t('adminBackup.importing') : t('adminBackup.selectBackupFile')}
            <input type="file" accept=".json" onChange={handleImport} disabled={importing} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {message && (
        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: message.includes(t('adminBackup.successKeyword')) ? 'var(--success-bg)' : 'var(--destructive-bg)', color: message.includes(t('adminBackup.successKeyword')) ? 'var(--success-text)' : 'var(--destructive-text)', border: `1px solid ${message.includes(t('adminBackup.successKeyword')) ? 'var(--success-border)' : 'var(--destructive-border)'}`, fontSize: '13px' }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default AdminBackup;
