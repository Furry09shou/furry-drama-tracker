﻿﻿﻿﻿﻿import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ImageUploader from './ImageUploader';

const AdminSiteContent = () => {
  const [admin, setAdmin] = useState(null);
  const [contents, setContents] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [aboutData, setAboutData] = useState({
    banner: '', logo: '', description: '', version: '1.0.0',
    updates: [], icp: '', policeRecord: '', aiDisclaimer: '本网站部分内容由AI生成', copyright: '© 2026 09兽'
  });
  const [settingsData, setSettingsData] = useState({
    siteName: '兽剧聚合平台', navLogo: '', welcomeTitle: '欢迎来到兽剧聚合平台', welcomeSubtitle: '发现和追踪你喜爱的兽剧内容'
  });
  const [newUpdate, setNewUpdate] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    if (token && adminData) {
      const parsed = JSON.parse(adminData);
      setAdmin(parsed);
      if (parsed.role === 'superadmin') {
        fetchContents(token);
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } else {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const fetchContents = async (token) => {
    try {
      const res = await axios.get('/api/site-content/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContents(res.data);
    } catch (err) {
      console.error('获取网站内容失败', err);
    }
  };

  const startEdit = (item) => {
    setEditingKey(item.key);
    setEditTitle(item.title);
    setMessage('');
    if (item.key === 'about') {
      try {
        const data = JSON.parse(item.content);
        setAboutData({
          banner: data.banner || '',
          logo: data.logo || '',
          description: data.description || '',
          version: data.version || '1.0.0',
          updates: data.updates || [],
          icp: data.icp || '',
          policeRecord: data.policeRecord || '',
          aiDisclaimer: data.aiDisclaimer || '本网站部分内容由AI生成',
          copyright: data.copyright || '© 2026 09兽'
        });
      } catch (e) {
        setAboutData({
          banner: '', logo: '', description: '', version: '1.0.0',
          updates: [], icp: '', policeRecord: '', aiDisclaimer: '本网站部分内容由AI生成', copyright: '© 2026 09兽'
        });
      }
    } else if (item.key === 'settings') {
      try {
        const data = JSON.parse(item.content);
        setSettingsData({
          siteName: data.siteName || '兽剧聚合平台',
          navLogo: data.navLogo || '',
          welcomeTitle: data.welcomeTitle || '欢迎来到兽剧聚合平台',
          welcomeSubtitle: data.welcomeSubtitle || '发现和追踪你喜爱的兽剧内容'
        });
      } catch (e) {
        setSettingsData({ siteName: '兽剧聚合平台', navLogo: '', welcomeTitle: '欢迎来到兽剧聚合平台', welcomeSubtitle: '发现和追踪你喜爱的兽剧内容' });
      }
    } else {
      setEditContent(item.content);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('adminToken');
      let contentToSave = editContent;
      if (editingKey === 'about') {
        contentToSave = JSON.stringify(aboutData);
      } else if (editingKey === 'settings') {
        contentToSave = JSON.stringify(settingsData);
      }
      await axios.put(`/api/site-content/${editingKey}`, {
        title: editTitle, content: contentToSave
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('保存成功');
      fetchContents(token);
    } catch (err) {
      setMessage(err.response?.data?.message || '保存失败');
    }
    setSaving(false);
  };

  const addUpdate = () => {
    if (newUpdate.trim()) {
      setAboutData(prev => ({ ...prev, updates: [...prev.updates, newUpdate.trim()] }));
      setNewUpdate('');
    }
  };

  const removeUpdate = (index) => {
    setAboutData(prev => ({ ...prev, updates: prev.updates.filter((_, i) => i !== index) }));
  };

  const moveUpdate = (index, direction) => {
    const newUpdates = [...aboutData.updates];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newUpdates.length) return;
    [newUpdates[index], newUpdates[newIndex]] = [newUpdates[newIndex], newUpdates[index]];
    setAboutData(prev => ({ ...prev, updates: newUpdates }));
  };

  if (!admin) return null;

  const renderSettingsEditor = () => (
    <div>
      <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🏷️ 导航栏Logo</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>显示在导航栏左上角，建议使用正方形小图标</p>
        <ImageUploader label="导航栏Logo" value={settingsData.navLogo} onChange={(url) => setSettingsData(prev => ({ ...prev, navLogo: url }))} aspectRatio={1} outputWidth={64} outputHeight={64} />
      </div>

      <div className="form-group">
        <label>📝 网站名称</label>
        <input type="text" value={settingsData.siteName} onChange={(e) => setSettingsData(prev => ({ ...prev, siteName: e.target.value }))} placeholder="如：兽剧聚合平台" />
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>显示在导航栏左上角和浏览器标签页</p>
      </div>

      <div className="form-group">
        <label>🎉 欢迎页标题</label>
        <input type="text" value={settingsData.welcomeTitle} onChange={(e) => setSettingsData(prev => ({ ...prev, welcomeTitle: e.target.value }))} placeholder="如：欢迎来到兽剧聚合平台" />
      </div>

      <div className="form-group">
        <label>💬 欢迎页副标题</label>
        <input type="text" value={settingsData.welcomeSubtitle} onChange={(e) => setSettingsData(prev => ({ ...prev, welcomeSubtitle: e.target.value }))} placeholder="如：发现和追踪你喜爱的兽剧内容" />
      </div>

      <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '14px' }}>👁️ 效果预览</h4>
        <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            {settingsData.navLogo && <img src={settingsData.navLogo} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />}
            <span style={{ fontWeight: 700, fontSize: '16px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{settingsData.siteName || '网站名称'}</span>
          </div>
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <h3 style={{ margin: '0 0 6px 0', color: 'var(--foreground)', fontSize: '16px' }}>{settingsData.welcomeTitle || '欢迎标题'}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>{settingsData.welcomeSubtitle || '欢迎副标题'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAboutEditor = () => (
    <div>
      <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🖼️ 横幅图片</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>显示在关于我们页面顶部，建议使用宽幅图片</p>
        <ImageUploader label="横幅图片" value={aboutData.banner} onChange={(url) => setAboutData(prev => ({ ...prev, banner: url }))} aspectRatio={3} outputWidth={1200} outputHeight={400} />
      </div>

      <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🏷️ 网站Logo</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>网站标志图标，建议使用正方形图片</p>
        <ImageUploader label="网站Logo" value={aboutData.logo} onChange={(url) => setAboutData(prev => ({ ...prev, logo: url }))} aspectRatio={1} outputWidth={200} outputHeight={200} />
      </div>

      <div className="form-group">
        <label>📝 网站简介</label>
        <textarea value={aboutData.description} onChange={(e) => setAboutData(prev => ({ ...prev, description: e.target.value }))} placeholder="输入网站简介描述..." rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }} />
      </div>

      <div className="form-group">
        <label>🔢 版本号</label>
        <input type="text" value={aboutData.version} onChange={(e) => setAboutData(prev => ({ ...prev, version: e.target.value }))} placeholder="如：1.0.0" />
      </div>

      <div className="form-group">
        <label>📋 更新日志</label>
        <div style={{ marginBottom: '12px' }}>
          <input type="text" value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="输入更新内容" style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '14px', marginBottom: '8px' }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUpdate(); } }} />
          <button type="button" className="btn" style={{ fontSize: '13px', padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={addUpdate}>添加</button>
        </div>
        {aboutData.updates.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {aboutData.updates.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', flexShrink: 0 }}>{index + 1}.</span>
                  <span style={{ fontSize: '14px', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                  <button type="button" onClick={() => moveUpdate(index, -1)} disabled={index === 0} style={{ background: 'var(--hover-bg-strong)', border: '1px solid var(--border)', color: index === 0 ? 'var(--text-lighter)' : 'var(--text-secondary)', borderRadius: '4px', padding: '2px 6px', cursor: index === 0 ? 'default' : 'pointer', fontSize: '12px' }}>↑</button>
                  <button type="button" onClick={() => moveUpdate(index, 1)} disabled={index === aboutData.updates.length - 1} style={{ background: 'var(--hover-bg-strong)', border: '1px solid var(--border)', color: index === aboutData.updates.length - 1 ? 'var(--text-lighter)' : 'var(--text-secondary)', borderRadius: '4px', padding: '2px 6px', cursor: index === aboutData.updates.length - 1 ? 'default' : 'pointer', fontSize: '12px' }}>↓</button>
                  <button type="button" onClick={() => removeUpdate(index)} style={{ background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)', color: 'var(--destructive-text)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '12px' }}>删除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>🌐 ICP备案号</label>
        <input type="text" value={aboutData.icp} onChange={(e) => setAboutData(prev => ({ ...prev, icp: e.target.value }))} placeholder="如：京ICP备XXXXXXXX号" />
      </div>

      <div className="form-group">
        <label>🛡️ 公安联网备案号</label>
        <input type="text" value={aboutData.policeRecord} onChange={(e) => setAboutData(prev => ({ ...prev, policeRecord: e.target.value }))} placeholder="如：京公网安备XXXXXXXXXXXXXX号" />
      </div>

      <div className="form-group">
        <label>🤖 AI生成声明</label>
        <input type="text" value={aboutData.aiDisclaimer} onChange={(e) => setAboutData(prev => ({ ...prev, aiDisclaimer: e.target.value }))} placeholder="如：本网站部分内容由AI生成" />
      </div>

      <div className="form-group">
        <label>© 版权信息</label>
        <input type="text" value={aboutData.copyright} onChange={(e) => setAboutData(prev => ({ ...prev, copyright: e.target.value }))} placeholder="如：© 2026 09兽" />
      </div>

      <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '14px' }}>👁️ 页面预览</h4>
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)' }}>
          {aboutData.banner && (
            <div style={{ height: '100px', overflow: 'hidden' }}>
              <img src={aboutData.banner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ textAlign: 'center', padding: '20px 16px' }}>
            {aboutData.logo && (<img src={aboutData.logo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', marginBottom: '10px' }} />)}
            <h3 style={{ margin: '0 0 4px 0', color: 'var(--foreground)', fontSize: '15px' }}>关于我们</h3>
            {aboutData.description && (<p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0 0', lineHeight: 1.5 }}>{aboutData.description}</p>)}
            {aboutData.version && <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', margin: '6px 0 0 0' }}>版本 {aboutData.version}</p>}
            {aboutData.updates.length > 0 && (
              <div style={{ textAlign: 'left', marginTop: '10px' }}>
                <p style={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 600, margin: '0 0 4px 0' }}>更新日志</p>
                <ul style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: 1.7, paddingLeft: '14px', margin: 0 }}>
                  {aboutData.updates.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '10px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
              {aboutData.copyright && <p style={{ margin: '1px 0' }}>{aboutData.copyright}</p>}
              {aboutData.icp && <p style={{ margin: '1px 0' }}>{aboutData.icp}</p>}
              {aboutData.policeRecord && <p style={{ margin: '1px 0' }}>{aboutData.policeRecord}</p>}
              {aboutData.aiDisclaimer && <p style={{ margin: '1px 0', fontStyle: 'italic' }}>{aboutData.aiDisclaimer}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Link to="/admin/dashboard" className="btn btn-secondary">返回控制台</Link>
          <h2>网站内容管理</h2>
        </div>
      </div>

      {!editingKey ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {contents.map(item => (
            <div key={item.key} style={{ background: 'var(--card)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }} onClick={() => startEdit(item)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-modal)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--foreground)' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 12px 0' }}>
                {item.key === 'about' ? '网站横幅、Logo、版本、更新日志、备案等' : item.key === 'settings' ? '网站名称、导航栏Logo、欢迎页文字' : item.key === 'privacy' ? '网站隐私政策内容' : '网站用户协议内容'}
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>最后更新：{new Date(item.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="form-container" style={{ maxWidth: '800px' }}>
          <button className="btn btn-secondary" onClick={() => { setEditingKey(null); setMessage(''); }} style={{ marginBottom: '20px' }}>← 返回列表</button>
          <div className="form-group">
            <label>标题</label>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          {editingKey === 'about' ? renderAboutEditor() : editingKey === 'settings' ? renderSettingsEditor() : (
            <div className="form-group">
              <label>内容</label>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={20} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.8, resize: 'vertical' }} />
            </div>
          )}
          {message && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: message.includes('成功') ? 'var(--success-bg)' : 'var(--destructive-bg)', color: message.includes('成功') ? 'var(--success-text)' : 'var(--destructive-text)', border: `1px solid ${message.includes('成功') ? 'var(--success-border)' : 'var(--destructive-border)'}` }}>{message}</div>
          )}
          <button className="btn" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '💾 保存'}</button>
        </div>
      )}
    </div>
  );
};

export default AdminSiteContent;
