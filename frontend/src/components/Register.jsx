﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
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
    if (formData.password.length < 8) {
      setError('密码长度至少8位，需包含字母和数字');
      return;
    }
    if (!/[A-Za-z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      setError('密码必须包含至少一个字母和一个数字');
      return;
    }
    try {
      await axios.post('/api/auth/register', {
        ...formData,
        deviceInfo: getDeviceInfo()
      });
      setRegisteredEmail(formData.email);
      setRegistered(true);
    } catch (error) {
      setError(error.response?.data?.message || '注册失败');
    }
  };
  
  if (registered) {
    return (
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
        <h2>验证您的邮箱</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.7 }}>
          验证邮件已发送至 <strong style={{ color: 'var(--foreground)' }}>{registeredEmail}</strong>
        </p>
        <div style={{
          padding: '14px', marginBottom: '20px', borderRadius: '8px',
          background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
          color: 'var(--warning-text)', fontSize: '13px', lineHeight: 1.7, textAlign: 'left'
        }}>
          <p style={{margin: '0 0 6px 0', fontWeight: 600}}>⚠️ 必须完成邮箱验证才能登录</p>
          <ul style={{margin: 0, paddingLeft: '16px'}}>
            <li>请查收邮件并点击验证链接（24小时内有效）</li>
            <li>验证完成后方可登录使用</li>
            <li>如未收到邮件，请检查垃圾邮件</li>
          </ul>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn" onClick={() => navigate('/login')}>前往登录</button>
          <Link to="/" className="btn btn-secondary">返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form">
      <h2>注册</h2>
      <div style={{
        padding: '10px 14px', marginBottom: '16px', borderRadius: '8px',
        background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)',
        color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6
      }}>
        📧 注册需验证邮箱，请填写您可接收邮件的邮箱地址
      </div>
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
            minLength={8}
          />
          <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>密码长度至少8位，需包含字母和数字</span>
        </div>
        <div className="form-group">
          <button type="submit">注册</button>
        </div>
      </form>
    </div>
  );
};

export default Register;