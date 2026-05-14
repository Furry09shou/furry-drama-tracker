import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const FriendLinks = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ name: '', url: '', logo: '', description: '' });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');
  const [activeTab, setActiveTab] = useState('links');
  const [myApplications, setMyApplications] = useState([]);
  const [captchaData, setCaptchaData] = useState({ captchaId: '', question: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/friend-links')
      .then(res => {
        setLinks(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'my-applications') {
      const token = localStorage.getItem('token');
      if (token) {
        axios.get('/api/friend-links/my-applications', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => setMyApplications(res.data))
          .catch(() => setMyApplications([]));
      }
    }
  }, [activeTab]);

  const fetchCaptcha = async () => {
    try {
      const res = await axios.get('/api/captcha');
      setCaptchaData({ captchaId: res.data.captchaId, question: res.data.question });
    } catch (e) {}
  };

  useEffect(() => {
    if (showApplyModal) fetchCaptcha();
  }, [showApplyModal]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.name.trim() || !applyForm.url.trim()) {
      setApplyMsg('站点名称和链接为必填项');
      return;
    }
    if (!captchaAnswer.trim()) {
      setApplyMsg('请输入验证码');
      return;
    }
    setApplyLoading(true);
    setApplyMsg('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('/api/friend-links/apply', {
        ...applyForm,
        captchaId: captchaData.captchaId,
        captchaAnswer: captchaAnswer.trim()
      }, { headers });
      setApplyMsg('申请已提交，等待管理员审核');
      setApplyForm({ name: '', url: '', logo: '', description: '' });
      setCaptchaAnswer('');
      setTimeout(() => {
        setShowApplyModal(false);
        setApplyMsg('');
      }, 2000);
    } catch (err) {
      setApplyMsg(err.response?.data?.message || '提交失败');
      fetchCaptcha();
      setCaptchaAnswer('');
    }
    setApplyLoading(false);
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { text: '待审核', bg: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'var(--warning-border)' },
      approved: { text: '已通过', bg: 'var(--success-bg)', color: 'var(--success-text)', border: 'var(--success-border)' },
      rejected: { text: '已拒绝', bg: 'var(--destructive-bg)', color: 'var(--destructive-text)', border: 'var(--destructive-border)' },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{
        fontSize: '12px', padding: '2px 10px', borderRadius: '10px',
        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
        fontWeight: 500
      }}>{s.text}</span>
    );
  };

  if (loading) return <div className="container"><h2>加载中...</h2></div>;

  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '800px' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        返回上一步
      </button>

      <div style={{
        background: 'var(--card)', borderRadius: '16px', padding: '24px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ margin: 0, color: 'var(--foreground)', fontSize: '22px' }}>友情链接</h1>
          <button onClick={() => setShowApplyModal(true)} style={{
            padding: '8px 18px', borderRadius: '10px', fontSize: '14px',
            background: 'var(--primary)', color: '#fff', border: 'none',
            cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
            <span style={{ fontSize: '16px' }}>+</span> 申请友链
          </button>
        </div>

        {isLoggedIn && (
          <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid var(--border)' }}>
            <button onClick={() => setActiveTab('links')} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === 'links' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'links' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 'links' ? 600 : 400,
              marginBottom: '-2px', transition: 'all 0.2s'
            }}>友链列表</button>
            <button onClick={() => setActiveTab('my-applications')} style={{
              padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === 'my-applications' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'my-applications' ? 'var(--primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '14px', fontWeight: activeTab === 'my-applications' ? 600 : 400,
              marginBottom: '-2px', transition: 'all 0.2s'
            }}>我的申请</button>
          </div>
        )}

        {activeTab === 'links' ? (
          links.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              暂无友链
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {links.map(link => {
                const isSafeUrl = /^https?:\/\//i.test(link.url);
                const Wrapper = isSafeUrl ? 'a' : 'div';
                const wrapperProps = isSafeUrl ? { href: link.url, target: '_blank', rel: 'noopener noreferrer' } : {};
                return (
                <Wrapper key={link._id} {...wrapperProps} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px', borderRadius: '12px',
                  background: 'var(--hover-bg)', border: '1px solid var(--border)',
                  color: 'var(--foreground)', textDecoration: 'none',
                  fontSize: '14px', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-modal)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  {link.logo ? (
                    <img src={link.logo} alt="" style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      objectFit: 'cover', flexShrink: 0,
                      border: '1px solid var(--border)'
                    }} />
                  ) : (
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: 'var(--primary-bg)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '16px', flexShrink: 0,
                      border: '1px solid var(--primary-border)'
                    }}>🔗</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--foreground)', marginBottom: '2px' }}>
                      {link.name}
                    </div>
                    {link.description && (
                      <div style={{
                        fontSize: '12px', color: 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{link.description}</div>
                    )}
                  </div>
                </Wrapper>
              )})}
            </div>
          )
        ) : (
          <div>
            {myApplications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                暂无友链申请记录
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myApplications.map(app => (
                  <div key={app._id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', borderRadius: '12px',
                    background: 'var(--hover-bg)', border: '1px solid var(--border)',
                    fontSize: '14px'
                  }}>
                    {app.logo ? (
                      <img src={app.logo} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔗</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{app.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{app.url}</div>
                      {app.rejectionReason && (
                        <div style={{ fontSize: '12px', color: 'var(--destructive-text)', marginTop: '4px' }}>原因: {app.rejectionReason}</div>
                      )}
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showApplyModal && (
        <div onClick={() => { setShowApplyModal(false); setApplyMsg(''); }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px', width: 'min(440px, calc(100vw - 40px))',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--foreground)' }}>申请友情链接</h3>
              <button onClick={() => { setShowApplyModal(false); setApplyMsg(''); }} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1
              }}>✕</button>
            </div>

            <form onSubmit={handleApply} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                  站点名称 <span style={{ color: 'var(--destructive-text)' }}>*</span>
                </label>
                <input type="text" value={applyForm.name} onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })} placeholder="请输入站点名称" style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--hover-bg)',
                  color: 'var(--foreground)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                  站点链接 <span style={{ color: 'var(--destructive-text)' }}>*</span>
                </label>
                <input type="url" value={applyForm.url} onChange={(e) => setApplyForm({ ...applyForm, url: e.target.value })} placeholder="https://example.com" style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--hover-bg)',
                  color: 'var(--foreground)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                  Logo 链接
                </label>
                <input type="url" value={applyForm.logo} onChange={(e) => setApplyForm({ ...applyForm, logo: e.target.value })} placeholder="https://example.com/logo.png" style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--hover-bg)',
                  color: 'var(--foreground)', fontSize: '14px', outline: 'none',
                  boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                  站点描述
                </label>
                <textarea value={applyForm.description} onChange={(e) => setApplyForm({ ...applyForm, description: e.target.value })} placeholder="简要描述您的站点" rows={3} style={{
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--hover-bg)',
                  color: 'var(--foreground)', fontSize: '14px', outline: 'none',
                  resize: 'vertical', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                  验证码 <span style={{ color: 'var(--destructive-text)' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="text" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} placeholder={captchaData.question || '请输入验证码'} style={{
                    flex: 1, padding: '10px 14px', borderRadius: '10px',
                    border: '1px solid var(--border)', background: 'var(--hover-bg)',
                    color: 'var(--foreground)', fontSize: '14px', outline: 'none',
                    boxSizing: 'border-box'
                  }} />
                  <button type="button" onClick={fetchCaptcha} style={{
                    padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
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

              {applyMsg && (
                <div style={{
                  padding: '10px', borderRadius: '8px', fontSize: '13px',
                  background: applyMsg.includes('失败') || applyMsg.includes('必填') || applyMsg.includes('验证码') ? 'var(--destructive-bg)' : 'var(--success-bg-strong)',
                  border: `1px solid ${applyMsg.includes('失败') || applyMsg.includes('必填') || applyMsg.includes('验证码') ? 'var(--destructive-border)' : 'var(--success-border)'}`,
                  color: applyMsg.includes('失败') || applyMsg.includes('必填') || applyMsg.includes('验证码') ? 'var(--destructive-text)' : 'var(--success-text)'
                }}>{applyMsg}</div>
              )}

              <button type="submit" disabled={applyLoading} style={{
                padding: '10px', borderRadius: '10px', fontSize: '15px',
                background: 'var(--primary)', color: '#fff', border: 'none',
                cursor: applyLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
                opacity: applyLoading ? 0.7 : 1, transition: 'all 0.2s'
              }}>
                {applyLoading ? '提交中...' : '提交申请'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendLinks;
