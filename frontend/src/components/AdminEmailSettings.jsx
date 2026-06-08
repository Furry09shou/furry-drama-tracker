import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useI18n } from '../contexts/I18nContext';

const AdminEmailSettings = () => {
  const { admin } = useOutletContext();
  const [emailData, setEmailData] = useState({
    host: '', port: '465', user: '', pass: '', fromName: '兽剧聚合平台', enabled: false
  });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (admin.role === 'superadmin') {
      fetchEmailConfig();
    } else {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [admin, navigate]);

  const fetchEmailConfig = async () => {
    try {
      const res = await adminApi.get('/api/site-content/email');
      if (res.data && res.data.content) {
        const data = JSON.parse(res.data.content);
        setEmailData({
          host: data.host || '',
          port: data.port || '465',
          user: data.user || '',
          pass: data.pass || '',
          fromName: data.fromName || '兽剧聚合平台',
          enabled: data.enabled || false
        });
      }
    } catch (err) {
      console.error('获取邮件配置失败', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await adminApi.put('/api/site-content/email', {
        title: t('adminEmailSettings.emailService'),
        content: JSON.stringify(emailData)
      });
      setMessage(t('adminEmailSettings.saveSuccess'));
    } catch (err) {
      setMessage(err.response?.data?.message || t('adminEmailSettings.saveFailed'));
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testEmail) {
      setTestMsg(t('adminEmailSettings.testEmailRequired'));
      return;
    }
    setTesting(true);
    setTestMsg('');
    try {
      const res = await adminApi.post('/api/site-content/test-email', {
        host: emailData.host,
        port: emailData.port,
        user: emailData.user,
        pass: emailData.pass,
        fromName: emailData.fromName,
        to: testEmail
      });
      setTestMsg(res.data.message);
    } catch (err) {
      setTestMsg(err.response?.data?.message || t('adminEmailSettings.testSendFailed'));
    }
    setTesting(false);
  };

  if (!admin) return null;

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2>{t('adminEmailSettings.title')}</h2>
        </div>
      </div>

      <div className="form-container" style={{ maxWidth: '700px' }}>
        <div style={{
          padding: '14px 18px', marginBottom: '24px', borderRadius: '10px',
          background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)',
          fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)'
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: 'var(--foreground)' }}>{t('adminEmailSettings.infoTitle')}</p>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            <li>{t('adminEmailSettings.infoItem1')}</li>
            <li>{t('adminEmailSettings.infoItem2')}</li>
            <li>{t('adminEmailSettings.infoItem3')}</li>
            <li>{t('adminEmailSettings.infoItem4')}</li>
          </ul>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={emailData.enabled}
              onChange={(e) => setEmailData(prev => ({ ...prev, enabled: e.target.checked }))}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>{t('adminEmailSettings.enableEmail')}</span>
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('adminEmailSettings.enableEmailHint')}
          </p>
        </div>

        <div className="form-group">
          <label>{t('adminEmailSettings.smtpHost')}</label>
          <input
            type="text"
            value={emailData.host}
            onChange={(e) => setEmailData(prev => ({ ...prev, host: e.target.value }))}
            placeholder={t('adminEmailSettings.smtpHostPlaceholder')}
          />
        </div>

        <div className="form-group">
          <label>{t('adminEmailSettings.smtpPort')}</label>
          <input
            type="text"
            value={emailData.port}
            onChange={(e) => setEmailData(prev => ({ ...prev, port: e.target.value }))}
            placeholder={t('adminEmailSettings.smtpPortPlaceholder')}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('adminEmailSettings.smtpPortHint')}
          </p>
        </div>

        <div className="form-group">
          <label>{t('adminEmailSettings.smtpUser')}</label>
          <input
            type="email"
            value={emailData.user}
            onChange={(e) => setEmailData(prev => ({ ...prev, user: e.target.value }))}
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label>{t('adminEmailSettings.smtpPass')}</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              value={emailData.pass}
              onChange={(e) => setEmailData(prev => ({ ...prev, pass: e.target.value }))}
              placeholder={t('adminEmailSettings.smtpPassPlaceholder')}
              style={{ width: '100%', paddingRight: '80px' }}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--primary)',
                cursor: 'pointer', fontSize: '13px', padding: '4px 8px'
              }}
            >
              {showPass ? t('adminEmailSettings.hide') : t('adminEmailSettings.show')}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('adminEmailSettings.smtpPassHint')}
          </p>
        </div>

        <div className="form-group">
          <label>{t('adminEmailSettings.fromName')}</label>
          <input
            type="text"
            value={emailData.fromName}
            onChange={(e) => setEmailData(prev => ({ ...prev, fromName: e.target.value }))}
            placeholder={t('adminEmailSettings.fromNamePlaceholder')}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('adminEmailSettings.fromNameHint')}
          </p>
        </div>

        {message && (
          <div style={{
            padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
            background: message.includes(t('adminEmailSettings.successKeyword')) ? 'var(--success-bg)' : 'var(--destructive-bg)',
            color: message.includes(t('adminEmailSettings.successKeyword')) ? 'var(--success-text)' : 'var(--destructive-text)',
            border: `1px solid ${message.includes(t('adminEmailSettings.successKeyword')) ? 'var(--success-border)' : 'var(--destructive-border)'}`
          }}>
            {message}
          </div>
        )}

        <button className="btn" onClick={handleSave} disabled={saving} style={{ marginBottom: '30px' }}>
          {saving ? t('adminEmailSettings.saving') : t('adminEmailSettings.saveConfig')}
        </button>

        <div style={{
          padding: '20px', borderRadius: '12px',
          background: 'var(--card)', border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--foreground)' }}>{t('adminEmailSettings.testEmailTitle')}</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
            {t('adminEmailSettings.testEmailDesc')}
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder={t('adminEmailSettings.testEmailPlaceholder')}
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '14px' }}
            />
            <button
              className="btn"
              onClick={handleTest}
              disabled={testing || !emailData.host || !emailData.user || !emailData.pass}
              style={{ whiteSpace: 'nowrap' }}
            >
              {testing ? t('adminEmailSettings.sending') : t('adminEmailSettings.testSend')}
            </button>
          </div>
          {testMsg && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: testMsg.includes(t('adminEmailSettings.successKeyword')) ? 'var(--success-bg)' : 'var(--destructive-bg)',
              color: testMsg.includes(t('adminEmailSettings.successKeyword')) ? 'var(--success-text)' : 'var(--destructive-text)',
              border: `1px solid ${testMsg.includes(t('adminEmailSettings.successKeyword')) ? 'var(--success-border)' : 'var(--destructive-border)'}`
            }}>
              {testMsg}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '24px', padding: '16px', borderRadius: '10px',
          background: 'var(--hover-bg)', border: '1px solid var(--border)',
          fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.8
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--foreground)' }}>{t('adminEmailSettings.commonSmtpTitle')}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
            <div><strong>{t('adminEmailSettings.qqMail')}</strong>：smtp.qq.com:465</div>
            <div><strong>{t('adminEmailSettings.mail163')}</strong>：smtp.163.com:465</div>
            <div><strong>Gmail</strong>：smtp.gmail.com:587</div>
            <div><strong>{t('adminEmailSettings.aliyun')}</strong>：smtp.mxhichina.com:465</div>
            <div><strong>Outlook</strong>：smtp.office365.com:587</div>
            <div><strong>{t('adminEmailSettings.tencentExmail')}</strong>：smtp.exmail.qq.com:465</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEmailSettings;
