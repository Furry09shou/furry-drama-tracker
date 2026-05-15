import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminEmailSettings = () => {
  const [admin, setAdmin] = useState(null);
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

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      const parsed = JSON.parse(adminData);
      setAdmin(parsed);
      if (parsed.role === 'superadmin') {
        fetchEmailConfig(token);
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchEmailConfig = async (token) => {
    try {
      const res = await axios.get('/api/site-content/email', {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('adminToken');
      await axios.put('/api/site-content/email', {
        title: '邮件服务',
        content: JSON.stringify(emailData)
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('保存成功');
    } catch (err) {
      setMessage(err.response?.data?.message || '保存失败');
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!testEmail) {
      setTestMsg('请输入收件邮箱地址');
      return;
    }
    setTesting(true);
    setTestMsg('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.post('/api/site-content/test-email', {
        host: emailData.host,
        port: emailData.port,
        user: emailData.user,
        pass: emailData.pass,
        fromName: emailData.fromName,
        to: testEmail
      }, { headers: { Authorization: `Bearer ${token}` } });
      setTestMsg(res.data.message);
    } catch (err) {
      setTestMsg(err.response?.data?.message || '测试发送失败');
    }
    setTesting(false);
  };

  if (!admin) return null;

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2>📧 邮件服务设置</h2>
        </div>
      </div>

      <div className="form-container" style={{ maxWidth: '700px' }}>
        <div style={{
          padding: '14px 18px', marginBottom: '24px', borderRadius: '10px',
          background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)',
          fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)'
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: 'var(--foreground)' }}>ℹ️ 邮件服务说明</p>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            <li>配置SMTP邮件服务用于发送邮箱验证、密码重置等邮件</li>
            <li>支持常见邮箱服务商：QQ邮箱、163邮箱、Gmail、阿里云企业邮箱等</li>
            <li>配置后请点击"测试发送"验证是否正常工作</li>
            <li>密码为SMTP授权码，非邮箱登录密码</li>
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
            <span>启用邮件服务</span>
          </label>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            启用后将使用下方配置发送邮件，关闭则回退到环境变量配置（如有）
          </p>
        </div>

        <div className="form-group">
          <label>🖥️ SMTP服务器地址</label>
          <input
            type="text"
            value={emailData.host}
            onChange={(e) => setEmailData(prev => ({ ...prev, host: e.target.value }))}
            placeholder="如：smtp.qq.com、smtp.163.com、smtp.gmail.com"
          />
        </div>

        <div className="form-group">
          <label>🔌 SMTP端口</label>
          <input
            type="text"
            value={emailData.port}
            onChange={(e) => setEmailData(prev => ({ ...prev, port: e.target.value }))}
            placeholder="通常为465（SSL）或587（TLS）"
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            465为SSL加密连接，587为STARTTLS连接
          </p>
        </div>

        <div className="form-group">
          <label>👤 SMTP用户名（邮箱地址）</label>
          <input
            type="email"
            value={emailData.user}
            onChange={(e) => setEmailData(prev => ({ ...prev, user: e.target.value }))}
            placeholder="如：your@email.com"
          />
        </div>

        <div className="form-group">
          <label>🔑 SMTP密码（授权码）</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              value={emailData.pass}
              onChange={(e) => setEmailData(prev => ({ ...prev, pass: e.target.value }))}
              placeholder="输入SMTP授权码"
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
              {showPass ? '隐藏' : '显示'}
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            此处填写SMTP授权码，非邮箱登录密码。QQ邮箱需在设置中开启SMTP服务并获取授权码。
          </p>
        </div>

        <div className="form-group">
          <label>📬 发件人名称</label>
          <input
            type="text"
            value={emailData.fromName}
            onChange={(e) => setEmailData(prev => ({ ...prev, fromName: e.target.value }))}
            placeholder="如：兽剧聚合平台"
          />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            收件人看到的发件人名称
          </p>
        </div>

        {message && (
          <div style={{
            padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
            background: message.includes('成功') ? 'var(--success-bg)' : 'var(--destructive-bg)',
            color: message.includes('成功') ? 'var(--success-text)' : 'var(--destructive-text)',
            border: `1px solid ${message.includes('成功') ? 'var(--success-border)' : 'var(--destructive-border)'}`
          }}>
            {message}
          </div>
        )}

        <button className="btn" onClick={handleSave} disabled={saving} style={{ marginBottom: '30px' }}>
          {saving ? '保存中...' : '💾 保存配置'}
        </button>

        <div style={{
          padding: '20px', borderRadius: '12px',
          background: 'var(--card)', border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--foreground)' }}>🧪 测试邮件发送</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
            保存配置后，可在此输入收件邮箱地址进行测试，验证邮件服务是否正常工作。
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="输入收件邮箱地址"
              style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '14px' }}
            />
            <button
              className="btn"
              onClick={handleTest}
              disabled={testing || !emailData.host || !emailData.user || !emailData.pass}
              style={{ whiteSpace: 'nowrap' }}
            >
              {testing ? '发送中...' : '📤 测试发送'}
            </button>
          </div>
          {testMsg && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: testMsg.includes('成功') ? 'var(--success-bg)' : 'var(--destructive-bg)',
              color: testMsg.includes('成功') ? 'var(--success-text)' : 'var(--destructive-text)',
              border: `1px solid ${testMsg.includes('成功') ? 'var(--success-border)' : 'var(--destructive-border)'}`
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
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--foreground)' }}>📋 常见邮箱SMTP配置</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
            <div><strong>QQ邮箱</strong>：smtp.qq.com:465</div>
            <div><strong>163邮箱</strong>：smtp.163.com:465</div>
            <div><strong>Gmail</strong>：smtp.gmail.com:587</div>
            <div><strong>阿里云</strong>：smtp.mxhichina.com:465</div>
            <div><strong>Outlook</strong>：smtp.office365.com:587</div>
            <div><strong>腾讯企业</strong>：smtp.exmail.qq.com:465</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEmailSettings;
