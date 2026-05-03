﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState, useEffect } from 'react';
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
    updates: [], changelog: [], icp: '', policeRecord: '', aiDisclaimer: '本网站部分内容由AI生成', copyright: '© 2026 09兽'
  });
  const [settingsData, setSettingsData] = useState({
    siteName: '兽剧聚合平台', navLogo: '', welcomeTitle: '欢迎来到兽剧聚合平台', welcomeSubtitle: '发现和追踪你喜爱的兽剧内容', favicon: '', browserTitle: '兽剧聚合平台'
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
          changelog: data.changelog || [],
          icp: data.icp || '',
          policeRecord: data.policeRecord || '',
          aiDisclaimer: data.aiDisclaimer || '本网站部分内容由AI生成',
          copyright: data.copyright || '© 2026 09兽'
        });
      } catch (e) {
        setAboutData({
          banner: '', logo: '', description: '', version: '1.0.0',
          updates: [], changelog: [], icp: '', policeRecord: '', aiDisclaimer: '本网站部分内容由AI生成', copyright: '© 2026 09兽'
        });
      }
    } else if (item.key === 'settings') {
      try {
        const data = JSON.parse(item.content);
        setSettingsData({
          siteName: data.siteName || '兽剧聚合平台',
          navLogo: data.navLogo || '',
          welcomeTitle: data.welcomeTitle || '欢迎来到兽剧聚合平台',
          welcomeSubtitle: data.welcomeSubtitle || '发现和追踪你喜爱的兽剧内容',
          favicon: data.favicon || '',
          browserTitle: data.browserTitle || '兽剧聚合平台'
        });
      } catch (e) {
        setSettingsData({ siteName: '兽剧聚合平台', navLogo: '', welcomeTitle: '欢迎来到兽剧聚合平台', welcomeSubtitle: '发现和追踪你喜爱的兽剧内容', favicon: '', browserTitle: '兽剧聚合平台' });
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
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🌐 浏览器标签栏</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>设置浏览器标签页显示的图标和标题</p>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>标签栏图标（Favicon）</label>
          <ImageUploader label="Favicon" value={settingsData.favicon} onChange={(url) => setSettingsData(prev => ({ ...prev, favicon: url }))} aspectRatio={1} outputWidth={32} outputHeight={32} />
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>建议使用 32x32 或 64x64 的正方形图标（.ico/.png）</p>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>标签栏标题</label>
          <input type="text" value={settingsData.browserTitle} onChange={(e) => setSettingsData(prev => ({ ...prev, browserTitle: e.target.value }))} placeholder="如：兽剧聚合平台" />
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>显示在浏览器标签页上的文字</p>
        </div>
        <div style={{
          marginTop: '16px', padding: '12px', borderRadius: '8px',
          background: 'var(--card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <div style={{
            width: '16px', height: '16px', borderRadius: '3px', overflow: 'hidden',
            background: settingsData.favicon ? 'transparent' : 'var(--hover-bg-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {settingsData.favicon ? (
              <img src={settingsData.favicon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '10px' }}>🌐</span>
            )}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {settingsData.browserTitle || '网站标题'}
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🏷️ 导航栏Logo</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>显示在导航栏左上角，建议使用正方形小图标</p>
        <ImageUploader label="导航栏Logo" value={settingsData.navLogo} onChange={(url) => setSettingsData(prev => ({ ...prev, navLogo: url }))} aspectRatio={1} outputWidth={64} outputHeight={64} />
      </div>

      <div className="form-group">
        <label>📝 网站名称</label>
        <input type="text" value={settingsData.siteName} onChange={(e) => setSettingsData(prev => ({ ...prev, siteName: e.target.value }))} placeholder="如：兽剧聚合平台" />
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>显示在导航栏左上角</p>
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
        <label>📋 版本更新日志</label>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 12px 0', lineHeight: 1.6 }}>
          每个版本的更新日志独立保存，发布新版本后旧版本日志仍可查看。点击"发布新版本"将当前版本号和更新内容写入日志。
        </p>
        <div style={{
          padding: '14px', borderRadius: '10px', marginBottom: '12px',
          background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--foreground)' }}>当前版本更新内容</h4>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input type="text" value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder="输入更新内容后回车添加" style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px' }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUpdate(); } }} />
            <button type="button" className="btn" style={{ fontSize: '13px', padding: '6px 14px', whiteSpace: 'nowrap' }} onClick={addUpdate}>添加</button>
          </div>
          {aboutData.updates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              {aboutData.updates.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>• {item}</span>
                  <button type="button" onClick={() => removeUpdate(index)} style={{ background: 'none', border: 'none', color: 'var(--destructive-text)', cursor: 'pointer', fontSize: '14px', padding: '0 4px', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" className="btn" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => {
            if (aboutData.updates.length === 0) { setMessage('请先添加更新内容'); return; }
            const newEntry = {
              version: aboutData.version,
              date: new Date().toISOString().split('T')[0],
              items: [...aboutData.updates]
            };
            const existing = aboutData.changelog.find(c => c.version === aboutData.version);
            let newChangelog;
            if (existing) {
              newChangelog = aboutData.changelog.map(c => c.version === aboutData.version ? newEntry : c);
            } else {
              newChangelog = [newEntry, ...aboutData.changelog];
            }
            setAboutData(prev => ({ ...prev, changelog: newChangelog, updates: [] }));
            setNewUpdate('');
            setMessage('版本日志已发布，更新内容已归档到 v' + aboutData.version);
          }}>
            📦 发布 v{aboutData.version} 版本日志
          </button>
        </div>

        {aboutData.changelog.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--foreground)' }}>历史版本日志</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {aboutData.changelog.map((entry, idx) => (
                <div key={idx} style={{
                  borderRadius: '8px', overflow: 'hidden',
                  border: '1px solid var(--border)', background: 'var(--hover-bg)'
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderBottom: '1px solid var(--border)',
                    background: 'var(--glass-bg)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--primary-light)', fontSize: '12px', fontWeight: 700, background: 'var(--primary-bg)', borderRadius: '4px', padding: '2px 8px' }}>v{entry.version}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{entry.date}</span>
                      {idx === 0 && <span style={{ fontSize: '10px', color: 'var(--success-text)', background: 'var(--success-bg)', padding: '1px 6px', borderRadius: '3px' }}>最新</span>}
                    </div>
                    <button type="button" onClick={() => {
                      setAboutData(prev => ({ ...prev, changelog: prev.changelog.filter((_, i) => i !== idx) }));
                    }} style={{ background: 'none', border: 'none', color: 'var(--destructive-text)', cursor: 'pointer', fontSize: '12px' }}>删除</button>
                  </div>
                  <div style={{ padding: '8px 12px' }}>
                    {(entry.items || []).map((item, i) => (
                      <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '2px 0' }}>• {item}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
            {aboutData.changelog.length > 0 && (
              <div style={{ textAlign: 'left', marginTop: '10px' }}>
                <p style={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 600, margin: '0 0 4px 0' }}>更新日志</p>
                {aboutData.changelog.slice(0, 2).map((entry, idx) => (
                  <div key={idx} style={{ marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary-light)' }}>v{entry.version}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '4px' }}>{entry.date}</span>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: 1.5, paddingLeft: '14px', margin: '2px 0 0 0' }}>
                      {entry.items.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                ))}
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
