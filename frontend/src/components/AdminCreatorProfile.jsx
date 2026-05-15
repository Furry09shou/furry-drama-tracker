import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ImageUploader from './ImageUploader';

const AdminCreatorProfile = () => {
  const [admin, setAdmin] = useState(null);
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      const parsed = JSON.parse(adminData);
      setAdmin(parsed);
      if (parsed.role === 'creator' || parsed.role === 'admin' || parsed.role === 'superadmin') {
        fetchProfile(token);
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchProfile = async (token) => {
    try {
      const res = await axios.get('/api/creator-profile/my-profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setDisplayName(res.data.displayName || '');
      setAvatar(res.data.avatar || '');
      setBio(res.data.bio || '');
      const links = res.data.socialLinks
        ? (typeof res.data.socialLinks === 'object' && !(res.data.socialLinks instanceof Map)
          ? res.data.socialLinks
          : Object.fromEntries(res.data.socialLinks))
        : {};
      setSocialLinks(Object.entries(links).map(([name, url]) => ({ name, url })));
    } catch (err) {
      console.error('获取创作者主页失败', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('adminToken');
      const linksObj = {};
      socialLinks.forEach(item => {
        if (item.name.trim()) linksObj[item.name.trim()] = item.url.trim();
      });
      const res = await axios.put('/api/creator-profile/my-profile', {
        displayName, avatar, bio, socialLinks: linksObj
      }, { headers: { Authorization: `Bearer ${token}` } });
      setProfile(res.data);
      setMessage('保存成功');
    } catch (err) {
      setMessage(err.response?.data?.message || '保存失败');
    }
    setSaving(false);
  };

  if (!admin) return null;

  return (
    <div className="admin-panel">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2>管理我的主页</h2>
        </div>
      </div>

      <div className="form-container" style={{maxWidth: '700px'}}>
        <div className="form-group">
          <label>显示名称</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="创作者显示名称"
          />
        </div>

        <div className="form-group">
          <label>头像</label>
          <ImageUploader
            value={avatar}
            onChange={setAvatar}
            label=""
            aspectRatio={1}
            outputWidth={200}
            outputHeight={200}
          />
        </div>

        <div className="form-group">
          <label>个人简介</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="介绍一下自己..."
            rows={4}
            style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', resize: 'vertical'}}
          />
        </div>

        <div className="form-group">
          <label>社交链接</label>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {socialLinks.map((item, index) => (
              <div key={index} style={{
                background: 'var(--hover-bg)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '12px'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                  <span style={{fontSize: '13px', color: 'var(--text-secondary)'}}>链接 {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== index))}
                    style={{
                      background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                      color: 'var(--destructive-text)', borderRadius: '6px', padding: '4px 10px',
                      cursor: 'pointer', fontSize: '12px', lineHeight: 1
                    }}
                  >删除</button>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const newList = [...socialLinks];
                      newList[index] = {...newList[index], name: e.target.value};
                      setSocialLinks(newList);
                    }}
                    placeholder="平台名称，如：Twitter、B站"
                    style={{width: '100%'}}
                  />
                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => {
                      const newList = [...socialLinks];
                      newList[index] = {...newList[index], url: e.target.value};
                      setSocialLinks(newList);
                    }}
                    placeholder="链接地址"
                    style={{width: '100%'}}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSocialLinks([...socialLinks, { name: '', url: '' }])}
              style={{
                background: 'var(--primary-bg-subtle)', border: '1px dashed var(--primary)',
                color: 'var(--primary)', borderRadius: '8px', padding: '10px',
                cursor: 'pointer', fontSize: '14px'
              }}
            >+ 添加社交链接</button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '10px 16px', borderRadius: '8px', marginBottom: '16px',
            background: message.includes('成功') ? 'var(--success-bg)' : 'var(--destructive-bg)',
            color: message.includes('成功') ? 'var(--success-text)' : 'var(--destructive-text)',
            border: `1px solid ${message.includes('成功') ? 'var(--success-border)' : 'var(--destructive-border)'}`
          }}>{message}</div>
        )}

        <button className="btn" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存主页'}
        </button>

        {profile && (
          <div style={{marginTop: '20px', padding: '16px', background: 'var(--primary-bg-subtle)', borderRadius: '8px', border: '1px solid var(--primary-border-subtle)'}}>
            <p style={{margin: '0 0 8px 0', fontSize: '14px', color: 'var(--foreground)'}}>
              <strong>主页链接：</strong>
              <Link
                to={`/creator/${admin._id}`}
                style={{color: 'var(--primary)', textDecoration: 'none', marginLeft: '8px'}}
              >点击查看我的主页</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCreatorProfile;
