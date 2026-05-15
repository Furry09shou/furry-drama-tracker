import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDeviceInfo } from '../utils/deviceInfo';

const Login = ({ login }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [needVerification, setNeedVerification] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [captchaData, setCaptchaData] = useState({ captchaId: '', svg: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [needDeviceVerify, setNeedDeviceVerify] = useState(false);
  const [deviceVerifyEmail, setDeviceVerifyEmail] = useState('');
  const [deviceVerifyLoading, setDeviceVerifyLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fetchCaptcha = async () => {
    try {
      const res = await axios.get('/api/auth/captcha');
      setCaptchaData({ captchaId: res.data.captchaId, svg: res.data.svg });
      setCaptchaAnswer('');
    } catch (e) {}
  };

  useEffect(() => { fetchCaptcha(); }, []);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setDeviceVerifyLoading(true);
      axios.post('/api/auth/verify-device', { token })
        .then(res => {
          login(res.data);
          navigate('/');
        })
        .catch(err => {
          setError(err.response?.data?.message || '设备验证失败，请重新登录');
        })
        .finally(() => setDeviceVerifyLoading(false));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNeedVerification(false);
    setNeedDeviceVerify(false);
    try {
      const response = await axios.post('/api/auth/login', {
        ...formData,
        deviceInfo: getDeviceInfo(),
        captchaId: captchaData.captchaId,
        captchaAnswer
      });
      login(response.data);
      navigate('/');
    } catch (error) {
      const data = error.response?.data;
      fetchCaptcha();
      if (data?.needVerification) {
        setNeedVerification(true);
        setVerifyEmail(data.email || formData.email);
        setError(data.message || '请先验证邮箱后再登录');
      } else if (data?.needDeviceVerify) {
        setNeedDeviceVerify(true);
        setDeviceVerifyEmail(data.email || formData.email);
        setError('');
      } else {
        setError(data?.message || '登录失败');
      }
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      await axios.post('/api/auth/forgot-password', { email: forgotEmail, captchaId: captchaData.captchaId, captchaAnswer });
      setSuccessMsg('如果该邮箱已注册，重置链接已发送至邮箱');
      setShowForgot(false);
    } catch (err) {
      fetchCaptcha();
      setError(err.response?.data?.message || '找回密码失败');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('密码长度不能少于8位'); return; }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) { setError('密码必须包含至少一个字母和一个数字'); return; }
    if (newPassword !== confirmPassword) { setError('两次输入的密码不一致'); return; }
    try {
      await axios.post('/api/auth/reset-password', { token: resetToken, newPassword });
      setSuccessMsg('密码重置成功，请使用新密码登录');
      setShowReset(false);
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err) {
      setError(err.response?.data?.message || '密码重置失败');
    }
  };

  const PasswordToggle = ({ show, onToggle }) => (
    <button type="button" onClick={onToggle} style={{
      position: 'absolute', right: '10px', top: 0, bottom: 0,
      background: 'none', border: 'none', cursor: 'pointer',
      color: 'var(--text-secondary)', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '24px', height: '24px', margin: 'auto',
    }}>
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  if (deviceVerifyLoading) {
    return (
      <div className="auth-form" style={{textAlign: 'center', padding: '60px 20px'}}>
        <div style={{fontSize: '48px', marginBottom: '16px'}}>🔐</div>
        <h2>正在验证设备...</h2>
        <p style={{color: 'var(--text-secondary)'}}>请稍候</p>
      </div>
    );
  }

  if (needDeviceVerify) {
    return (
      <div className="auth-form" style={{textAlign: 'center', padding: '40px 20px'}}>
        <div style={{fontSize: '48px', marginBottom: '16px'}}>📧</div>
        <h2>新设备验证</h2>
        <p style={{color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '12px'}}>
          检测到您在新设备上登录，验证邮件已发送至<br/>
          <strong>{deviceVerifyEmail}</strong><br/>
          请在邮箱中点击确认按钮完成验证。
        </p>
        <p style={{color: 'var(--text-secondary)', fontSize: '13px', marginTop: '16px'}}>
          验证链接30分钟内有效
        </p>
        <button onClick={() => { setNeedDeviceVerify(false); fetchCaptcha(); }} style={{
          marginTop: '24px', padding: '10px 24px', borderRadius: '8px',
          background: 'var(--hover-bg)', border: '1px solid var(--border)',
          color: 'var(--foreground)', cursor: 'pointer', fontSize: '14px'
        }}>返回登录</button>
      </div>
    );
  }

  if (showReset) {
    return (
      <div className="auth-form">
        <h2>重置密码</h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px'}}>邮箱验证通过，请设置新密码</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>新密码</label>
            <div style={{position: 'relative'}}>
              <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder="请输入新密码（至少8位，含字母和数字）" style={{paddingRight: '40px'}} />
              <PasswordToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
            </div>
          </div>
          <div className="form-group">
            <label>确认新密码</label>
            <div style={{position: 'relative'}}>
              <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} placeholder="请再次输入新密码" style={{paddingRight: '40px'}} />
              <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
            </div>
          </div>
          <div className="form-group"><button type="submit">确认重置</button></div>
        </form>
        <div style={{textAlign: 'center', marginTop: '15px', position: 'relative', zIndex: 1}}>
          <span onClick={() => { setShowReset(false); setError(''); setResetToken(''); }} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}>返回登录</span>
        </div>
      </div>
    );
  }

  if (showForgot) {
    return (
      <div className="auth-form">
        <h2>找回密码</h2>
        <p style={{color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px'}}>输入注册时使用的邮箱，验证后可直接重置密码</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label>邮箱</label>
            <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required placeholder="请输入注册邮箱" />
          </div>
          <div className="form-group">
            <label>图形验证码</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="text" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required placeholder="请输入验证码" style={{ flex: 1, minWidth: 0 }} />
              {captchaData.svg && (
                <img src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaData.svg)}`} alt="验证码" onClick={fetchCaptcha} style={{ height: '40px', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }} title="点击刷新" />
              )}
            </div>
          </div>
          <div className="form-group"><button type="submit">验证邮箱</button></div>
        </form>
        <div style={{textAlign: 'center', marginTop: '15px', position: 'relative', zIndex: 1}}>
          <span onClick={() => { setShowForgot(false); setError(''); fetchCaptcha(); }} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}>返回登录</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-form">
      <h2>登录</h2>
      {error && <div className="error-message">{error}</div>}
      {needVerification && (
        <div style={{
          padding: '16px', marginBottom: '16px', borderRadius: '8px',
          background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
          color: 'var(--warning-text)', fontSize: '14px', lineHeight: 1.7
        }}>
          <p style={{margin: '0 0 10px 0'}}>📧 您的邮箱 <strong>{verifyEmail}</strong> 尚未验证，请查收验证邮件完成验证后再登录。</p>
          <button
            onClick={async () => {
              setResendLoading(true);
              setResendMsg('');
              try {
                const res = await axios.post('/api/auth/resend-verification-by-email', { email: verifyEmail });
                setResendMsg(res.data.message);
              } catch (err) {
                setResendMsg(err.response?.data?.message || '发送失败');
              }
              setResendLoading(false);
            }}
            disabled={resendLoading}
            style={{
              padding: '6px 16px', borderRadius: '6px', fontSize: '13px',
              background: 'var(--btn-gradient)', color: 'var(--btn-text)',
              border: 'none', cursor: 'pointer', fontWeight: 500
            }}
          >
            {resendLoading ? '发送中...' : '重新发送验证邮件'}
          </button>
          {resendMsg && (
            <p style={{margin: '8px 0 0 0', fontSize: '13px',
              color: resendMsg.includes('已发送') ? 'var(--success-text)' : 'var(--destructive-text)'
            }}>{resendMsg}</p>
          )}
        </div>
      )}
      {successMsg && <div className="success-message" style={{padding: '10px', background: 'var(--success-bg-strong)', border: '1px solid var(--success-border)', borderRadius: '6px', color: 'var(--success-text)'}}>{successMsg}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">邮箱</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="password">密码</label>
          <div style={{position: 'relative'}}>
            <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} required style={{paddingRight: '40px'}} />
            <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="captcha">图形验证码</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="text" id="captcha" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required placeholder="请输入验证码" style={{ flex: 1, minWidth: 0 }} />
            {captchaData.svg && (
              <img src={`data:image/svg+xml;utf8,${encodeURIComponent(captchaData.svg)}`} alt="验证码" onClick={fetchCaptcha} style={{ height: '40px', cursor: 'pointer', borderRadius: '4px', flexShrink: 0 }} title="点击刷新" />
            )}
          </div>
        </div>
        <div className="form-group">
          <button type="submit">登录</button>
        </div>
      </form>
      <div style={{textAlign: 'center', marginTop: '10px', position: 'relative', zIndex: 1}}>
        <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowForgot(true); setError(''); setSuccessMsg(''); }} style={{color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: '4px 8px', display: 'inline-block', userSelect: 'none'}}>忘记密码？</span>
      </div>
    </div>
  );
};

export default Login;
