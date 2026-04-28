import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
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
    if (formData.password.length < 6) {
      setError('密码长度至少6位');
      return;
    }
    try {
      await axios.post('/api/auth/register', {
        ...formData,
        deviceInfo: getDeviceInfo()
      });
      navigate('/login');
    } catch (error) {
      setError(error.response?.data?.message || '注册失败');
    }
  };
  
  return (
    <div className="auth-form">
      <h2>注册</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">用户名</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
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
            minLength={6}
          />
          <span style={{fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block'}}>密码长度至少6位</span>
        </div>
        <div className="form-group">
          <button type="submit">注册</button>
        </div>
      </form>
    </div>
  );
};

export default Register;