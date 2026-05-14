import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { getDeviceInfo } from '../utils/deviceInfo';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaData, setCaptchaData] = useState({ captchaId: '', question: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCaptcha();
  }, []);

  const fetchCaptcha = async () => {
    try {
      const res = await axios.get('/api/captcha');
      setCaptchaData({ captchaId: res.data.captchaId, question: res.data.question });
    } catch (e) {}
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
    if (!agreedToTerms) {
      setError('请先阅读并同意用户协议和隐私政策');
      return;
    }
    if (!captchaAnswer.trim()) {
      setError('请输入验证码');
      return;
    }
    try {
      await axios.post('/api/auth/register', {
        ...formData,
        captchaId: captchaData.captchaId,
        captchaAnswer: captchaAnswer.trim(),
        deviceInfo: getDeviceInfo()
      });
      setRegisteredEmail(formData.email);
      setRegistered(true);
    } catch (error) {
      setError(error.response?.data?.message || '注册失败');
      fetchCaptcha();
      setCaptchaAnswer('');
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
          <div style={{position: 'relative'}}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              style={{paddingRight: '40px'}}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
              position: 'absolute', right: '8px', top: 0, bottom: 0,
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
              color: 'var(--text-secondary)', padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{showPassword ? '隐藏' : '显示'}</button>
          </div>
          <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>密码长度至少8位，需包含字母和数字</span>
        </div>
        <div className="form-group">
          <label htmlFor="captcha">验证码</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              id="captcha"
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              required
              placeholder={captchaData.question || '请输入验证码'}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={fetchCaptcha} style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: 'var(--hover-bg)', border: '1px solid var(--border)',
              color: 'var(--foreground)', cursor: 'pointer', whiteSpace: 'nowrap'
            }}>刷新</button>
          </div>
          {captchaData.question && (
            <span style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block'}}>
              请计算: {captchaData.question} = ?
            </span>
          )}
        </div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }}
          />
          <label htmlFor="terms" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', margin: 0, fontWeight: 400 }}>
            我已阅读并同意
            <Link to="/terms" style={{ color: 'var(--primary)', textDecoration: 'none', marginLeft: '2px', marginRight: '2px' }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >《用户协议》</Link>
            和
            <Link to="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none', marginLeft: '2px' }}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
            >《隐私政策》</Link>
          </label>
        </div>
        <div className="form-group">
          <button type="submit" disabled={!agreedToTerms} style={{ opacity: agreedToTerms ? 1 : 0.5, cursor: agreedToTerms ? 'pointer' : 'not-allowed' }}>注册</button>
        </div>
      </form>
    </div>
  );
};

export default Register;
