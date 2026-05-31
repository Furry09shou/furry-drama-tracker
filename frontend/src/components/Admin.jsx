import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const Admin = () => {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [captchaData, setCaptchaData] = useState({ captchaId: '', svg: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const navigate = useNavigate();

  const fetchCaptcha = async () => {
    try {
      const res = await axios.get('/api/auth/captcha');
      setCaptchaData({ captchaId: res.data.captchaId, svg: res.data.svg });
      setCaptchaAnswer('');
    } catch (e) {}
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const user = JSON.parse(userStr);
      if (!user.adminAccess) {
        navigate('/', { replace: true });
      }
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => { fetchCaptcha(); }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/admin/login', { username, password, captchaId: captchaData.captchaId, captchaAnswer });
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('adminData', JSON.stringify(response.data));
      try {
        await axios.post('/api/admin-sessions/create', {
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          language: navigator.language
        }, {
          headers: { Authorization: `Bearer ${response.data.token}` }
        });
      } catch (sessionErr) {
        console.error('Failed to create session:', sessionErr);
      }
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || t('admin.loginFailed'));
      fetchCaptcha();
    }
  };

  return (
    <div className="auth-form">
      <h2>{t('admin.adminLogin')}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>{t('admin.username')}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('admin.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('auth.captcha')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="text" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required placeholder={t('auth.enterCaptcha')} style={{ flex: 1, minWidth: 0 }} />
            {captchaData.svg && (
              <img src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaData.svg)}`} alt={t('auth.captcha')} onClick={fetchCaptcha} style={{ height: '40px', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }} title={t('common.clickToRefresh')} />
            )}
          </div>
        </div>
        <div className="form-group">
          <button type="submit">{t('admin.login')}</button>
        </div>
      </form>
    </div>
  );
};

export default Admin;
