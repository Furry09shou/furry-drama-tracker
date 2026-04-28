import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = ({ login }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let browser = '', browserVersion = '', os = '', osVersion = '', deviceType = '桌面端', deviceModel = '', carrier = '';

    if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) deviceType = '移动端';
    else if (/Tablet/i.test(ua)) deviceType = '平板';

    if (/Edg\/(\d+[\.\d]*)/.test(ua)) { browser = 'Microsoft Edge'; browserVersion = ua.match(/Edg\/(\d+[\.\d]*)/)?.[1] || ''; }
    else if (/Chrome\/(\d+[\.\d]*)/.test(ua) && !/Edg/.test(ua)) { browser = 'Google Chrome'; browserVersion = ua.match(/Chrome\/(\d+[\.\d]*)/)?.[1] || ''; }
    else if (/Firefox\/(\d+[\.\d]*)/.test(ua)) { browser = 'Mozilla Firefox'; browserVersion = ua.match(/Firefox\/(\d+[\.\d]*)/)?.[1] || ''; }
    else if (/Safari\/(\d+[\.\d]*)/.test(ua) && !/Chrome/.test(ua)) { browser = 'Apple Safari'; browserVersion = ua.match(/Version\/(\d+[\.\d]*)/)?.[1] || ''; }

    if (/Windows NT (\d+[\.\d]*)/.test(ua)) { os = 'Windows'; osVersion = ua.match(/Windows NT (\d+[\.\d]*)/)?.[1] || ''; }
    else if (/Mac OS X (\d+[._\d]*)/.test(ua)) { os = 'macOS'; osVersion = (ua.match(/Mac OS X (\d+[._\d]*)/)?.[1] || '').replace(/_/g, '.'); }
    else if (/Android (\d+[\.\d]*)/.test(ua)) {
      os = 'Android'; osVersion = ua.match(/Android (\d+[\.\d]*)/)?.[1] || '';
      const buildMatch = ua.match(/;\s*([^;)]+)\s*Build\//);
      if (buildMatch) deviceModel = buildMatch[1].trim();
    } else if (/iPhone OS (\d+[_\d]*)/.test(ua)) {
      os = 'iOS'; osVersion = (ua.match(/iPhone OS (\d+[_\d]*)/)?.[1] || '').replace(/_/g, '.');
      deviceModel = 'iPhone';
    } else if (/iPad/.test(ua)) {
      os = 'iPadOS'; osVersion = (ua.match(/CPU OS (\d+[_\d]*)/)?.[1] || '').replace(/_/g, '.');
      deviceModel = 'iPad';
    } else if (/Linux/.test(ua)) { os = 'Linux'; }

    if (navigator.connection && navigator.connection.effectiveType) {
      carrier = navigator.connection.effectiveType;
    }

    return {
      browser, browserVersion, os, osVersion, deviceType, deviceModel, carrier,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language || ''
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth/login', {
        ...formData,
        deviceInfo: getDeviceInfo()
      });
      login(response.data);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.message || '登录失败');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: forgotEmail });
      setResetToken(res.data.resetToken);
      setShowForgot(false);
      setShowReset(true);
    } catch (err) {
      setError(err.response?.data?.message || '找回密码失败');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('密码长度不能少于6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    try {
      await axios.post('/api/auth/reset-password', {
        token: resetToken,
        newPassword
      });
      setSuccessMsg('密码重置成功，请使用新密码登录');
      setShowReset(false);
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err) {
      setError(err.response?.data?.message || '密码重置失败');
    }
  };

  if (showReset) {
    return (
      <div className="auth-form">
        <h2>重置密码</h2>
        <p style={{color: '#94a3b8', fontSize: '14px', marginBottom: '20px'}}>邮箱验证通过，请设置新密码</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>新密码</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="请输入新密码（至少6位）"
            />
          </div>
          <div className="form-group">
            <label>确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="请再次输入新密码"
            />
          </div>
          <div className="form-group">
            <button type="submit">确认重置</button>
          </div>
        </form>
        <div style={{textAlign: 'center', marginTop: '15px', position: 'relative', zIndex: 1}}>
          <span 
            onClick={() => { setShowReset(false); setError(''); setResetToken(''); }}
            style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}
          >
            返回登录
          </span>
        </div>
      </div>
    );
  }

  if (showForgot) {
    return (
      <div className="auth-form">
        <h2>找回密码</h2>
        <p style={{color: '#94a3b8', fontSize: '14px', marginBottom: '20px'}}>输入注册时使用的邮箱，验证后可直接重置密码</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              placeholder="请输入注册邮箱"
            />
          </div>
          <div className="form-group">
            <button type="submit">验证邮箱</button>
          </div>
        </form>
        <div style={{textAlign: 'center', marginTop: '15px', position: 'relative', zIndex: 1}}>
          <span 
            onClick={() => { setShowForgot(false); setError(''); }}
            style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}
          >
            返回登录
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-form">
      <h2>登录</h2>
      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-message" style={{padding: '10px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '6px', color: '#22c55e'}}>{successMsg}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">邮箱</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">密码</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <button type="submit">登录</button>
        </div>
      </form>
      <div style={{textAlign: 'center', marginTop: '10px', position: 'relative', zIndex: 1}}>
        <span 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowForgot(true); setError(''); setSuccessMsg(''); }}
          style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}
        >
          忘记密码？
        </span>
      </div>
    </div>
  );
};

export default Login;
