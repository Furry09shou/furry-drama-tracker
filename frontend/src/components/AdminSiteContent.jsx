import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ImageUploader from './ImageUploader';
import { useI18n } from '../contexts/I18nContext';

const LANGS = [
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

const getLocKey = (field, lang) => lang === 'zh' ? field : `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
const getLocVal = (data, field, lang) => data[getLocKey(field, lang)] || '';

const parseI18nContent = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && ('zh' in parsed || 'en' in parsed)) {
      return { zh: parsed.zh || '', en: parsed.en || '' };
    }
  } catch (e) {}
  return { zh: raw || '', en: '' };
};

const AdminSiteContent = () => {
  const { lang: uiLang, t } = useI18n();
  const [admin, setAdmin] = useState(null);
  const [contents, setContents] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [editLang, setEditLang] = useState('zh');
  const [editTitle, setEditTitle] = useState('');
  const [editContentI18n, setEditContentI18n] = useState({ zh: '', en: '' });
  const [aboutData, setAboutData] = useState({
    banner: '', logo: '', description: '', version: '1.0.0',
    updates: [], changelog: [], icp: '', policeRecord: '',
    aiDisclaimer: '本网站部分内容由AI生成', copyright: '© 2026 09兽',
    descriptionEn: '',
    aiDisclaimerEn: '',
    copyrightEn: '',
  });
  const [settingsData, setSettingsData] = useState({
    siteName: '兽剧聚合平台', navLogo: '', welcomeTitle: '欢迎来到兽剧聚合平台',
    welcomeSubtitle: '发现和追踪你喜爱的兽剧内容', favicon: '', browserTitle: '兽剧聚合平台',
    siteNameEn: '',
    welcomeTitleEn: '',
    welcomeSubtitleEn: '',
    browserTitleEn: '',
  });
  const [newUpdate, setNewUpdate] = useState('');
  const [changelogInputs, setChangelogInputs] = useState({});
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
      console.error(t('adminContent.fetchFailed'), err);
    }
  };

  const startEdit = (item) => {
    setEditingKey(item.key);
    setEditTitle(item.title);
    setEditLang('zh');
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
          copyright: data.copyright || '© 2026 09兽',
          descriptionEn: data.descriptionEn || '',
          aiDisclaimerEn: data.aiDisclaimerEn || '',
          copyrightEn: data.copyrightEn || '',
        });
      } catch (e) {
        setAboutData({
          banner: '', logo: '', description: '', version: '1.0.0',
          updates: [], changelog: [], icp: '', policeRecord: '',
          aiDisclaimer: '本网站部分内容由AI生成', copyright: '© 2026 09兽',
          descriptionEn: '',
          aiDisclaimerEn: '',
          copyrightEn: '',
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
          browserTitle: data.browserTitle || '兽剧聚合平台',
          siteNameEn: data.siteNameEn || '',
          welcomeTitleEn: data.welcomeTitleEn || '',
          welcomeSubtitleEn: data.welcomeSubtitleEn || '',
          browserTitleEn: data.browserTitleEn || '',
        });
      } catch (e) {
        setSettingsData({
          siteName: '兽剧聚合平台', navLogo: '',
          welcomeTitle: '欢迎来到兽剧聚合平台',
          welcomeSubtitle: '发现和追踪你喜爱的兽剧内容',
          favicon: '', browserTitle: '兽剧聚合平台',
          siteNameEn: '', welcomeTitleEn: '',
          welcomeSubtitleEn: '',
          browserTitleEn: '',
        });
      }
    } else {
      setEditContentI18n(parseI18nContent(item.content));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('adminToken');
      let contentToSave;
      if (editingKey === 'about') {
        contentToSave = JSON.stringify(aboutData);
      } else if (editingKey === 'settings') {
        contentToSave = JSON.stringify(settingsData);
      } else {
        contentToSave = JSON.stringify(editContentI18n);
      }
      await axios.put(`/api/site-content/${editingKey}`, {
        title: editTitle, content: contentToSave
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage(t('adminContent.saveSuccess'));
      fetchContents(token);
    } catch (err) {
      setMessage(err.response?.data?.message || t('adminContent.saveFailed'));
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

  const renderLangTabs = () => (
    <div style={{
      display: 'flex', gap: '6px', marginBottom: '20px',
      background: 'var(--hover-bg)', borderRadius: '10px', padding: '4px',
      border: '1px solid var(--border)'
    }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          type="button"
          onClick={() => setEditLang(l.code)}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
            background: editLang === l.code ? 'var(--primary-bg)' : 'transparent',
            border: editLang === l.code ? '1px solid var(--primary-border)' : '1px solid transparent',
            color: editLang === l.code ? 'var(--primary-light)' : 'var(--text-secondary)',
            fontWeight: editLang === l.code ? 600 : 400,
            fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <span>{l.flag}</span>
          <span>{l.label}</span>
          {editLang !== 'zh' && l.code !== 'zh' && (
            <span style={{
              fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
              background: getLocVal(
                editingKey === 'about' ? aboutData : editingKey === 'settings' ? settingsData : {},
                editingKey === 'about' ? 'description' : editingKey === 'settings' ? 'siteName' : '',
                l.code
              ) ? 'var(--success-bg)' : 'var(--hover-bg-strong)',
              color: getLocVal(
                editingKey === 'about' ? aboutData : editingKey === 'settings' ? settingsData : {},
                editingKey === 'about' ? 'description' : editingKey === 'settings' ? 'siteName' : '',
                l.code
              ) ? 'var(--success-text)' : 'var(--text-tertiary)',
            }}>
              {getLocVal(
                editingKey === 'about' ? aboutData : editingKey === 'settings' ? settingsData : {},
                editingKey === 'about' ? 'description' : editingKey === 'settings' ? 'siteName' : '',
                l.code
              ) ? t('adminContent.filled') : t('adminContent.notFilled')}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const renderLocalizedField = (label, emoji, data, setter, field, placeholder, multiline) => {
    const currentLang = LANGS.find(l => l.code === editLang);
    const zhValue = data[field] || '';
    const locKey = getLocKey(field, editLang);
    const locValue = data[locKey] || '';

    if (editLang === 'zh') {
      return (
        <div className="form-group" key={`${field}-${editLang}`}>
          <label>{emoji} {label}</label>
          {multiline ? (
            <textarea value={zhValue} onChange={(e) => setter(prev => ({ ...prev, [field]: e.target.value }))} placeholder={placeholder} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }} />
          ) : (
            <input type="text" value={zhValue} onChange={(e) => setter(prev => ({ ...prev, [field]: e.target.value }))} placeholder={placeholder} />
          )}
        </div>
      );
    }

    return (
      <div className="form-group" key={`${field}-${editLang}`}>
        <label>{emoji} {label}（{currentLang.flag} {currentLang.label}）</label>
        {zhValue && (
          <div style={{
            marginBottom: '8px', padding: '10px 12px', borderRadius: '8px',
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: '-8px', left: '10px',
              background: 'var(--card)', padding: '0 6px',
              fontSize: '10px', color: 'var(--text-tertiary)',
              border: '1px solid var(--border)', borderRadius: '3px',
            }}>🇨🇳 {t('adminContent.chineseRef')}</span>
            <div style={{ marginTop: '4px' }}>{zhValue}</div>
          </div>
        )}
        {multiline ? (
          <textarea value={locValue} onChange={(e) => setter(prev => ({ ...prev, [locKey]: e.target.value }))} placeholder={placeholder || t('adminContent.translationPlaceholder')} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }} />
        ) : (
          <input type="text" value={locValue} onChange={(e) => setter(prev => ({ ...prev, [locKey]: e.target.value }))} placeholder={placeholder || t('adminContent.translationPlaceholder')} />
        )}
      </div>
    );
  };

  const renderSettingsEditor = () => {
    if (editLang !== 'zh') {
      const currentLang = LANGS.find(l => l.code === editLang);
      return (
        <div>
          <div style={{
            background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)',
            borderRadius: '12px', padding: '16px', marginBottom: '20px',
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>
              🌐 {currentLang.flag} {currentLang.label} {t('adminContent.translationTitle')}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t('adminContent.translationDesc', { lang: currentLang.label })}
            </p>
          </div>
          {renderLocalizedField(t('adminContent.siteName'), '📝', settingsData, setSettingsData, 'siteName', 'e.g., Furry Drama Hub')}
          {renderLocalizedField(t('adminContent.welcomeTitle'), '🎉', settingsData, setSettingsData, 'welcomeTitle', 'e.g., Welcome to Furry Drama Hub')}
          {renderLocalizedField(t('adminContent.welcomeSubtitle'), '💬', settingsData, setSettingsData, 'welcomeSubtitle', 'e.g., Discover and track your favorite dramas')}
          {renderLocalizedField(t('adminContent.browserTitle'), '🌐', settingsData, setSettingsData, 'browserTitle', 'e.g., Furry Drama Hub')}

          <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '14px' }}>👁️ {t('adminContent.effectPreview')}（{currentLang.label}）</h4>
            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                {settingsData.navLogo && <img src={settingsData.navLogo} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />}
                <span style={{ fontWeight: 700, fontSize: '16px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {getLocVal(settingsData, 'siteName', editLang) || settingsData.siteName || t('adminContent.siteName')}
                </span>
              </div>
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <h3 style={{ margin: '0 0 6px 0', color: 'var(--foreground)', fontSize: '16px' }}>
                  {getLocVal(settingsData, 'welcomeTitle', editLang) || settingsData.welcomeTitle || t('adminContent.welcomeTitle')}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                  {getLocVal(settingsData, 'welcomeSubtitle', editLang) || settingsData.welcomeSubtitle || t('adminContent.welcomeSubtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🌐 {t('adminContent.browserTab')}</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t('adminContent.browserTabDesc')}</p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>{t('adminContent.favicon')}</label>
            <ImageUploader label="Favicon" value={settingsData.favicon} onChange={(url) => setSettingsData(prev => ({ ...prev, favicon: url }))} aspectRatio={1} outputWidth={32} outputHeight={32} />
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px' }}>{t('adminContent.faviconHint')}</p>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t('adminContent.browserTitleLabel')}</label>
            <input type="text" value={settingsData.browserTitle} onChange={(e) => setSettingsData(prev => ({ ...prev, browserTitle: e.target.value }))} placeholder={t('adminContent.browserTitlePlaceholder')} />
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{t('adminContent.browserTitleHint')}</p>
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
              {settingsData.browserTitle || t('adminContent.browserTitle')}
            </span>
          </div>
        </div>

        <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🏷️ {t('adminContent.navLogo')}</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t('adminContent.navLogoDesc')}</p>
          <ImageUploader label={t('adminContent.navLogoLabel')} value={settingsData.navLogo} onChange={(url) => setSettingsData(prev => ({ ...prev, navLogo: url }))} aspectRatio={1} outputWidth={64} outputHeight={64} />
        </div>

        <div className="form-group">
          <label>📝 {t('adminContent.siteNameLabel')}</label>
          <input type="text" value={settingsData.siteName} onChange={(e) => setSettingsData(prev => ({ ...prev, siteName: e.target.value }))} placeholder={t('adminContent.siteNamePlaceholder')} />
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{t('adminContent.siteNameHint')}</p>
        </div>

        <div className="form-group">
          <label>🎉 {t('adminContent.welcomeTitleLabel')}</label>
          <input type="text" value={settingsData.welcomeTitle} onChange={(e) => setSettingsData(prev => ({ ...prev, welcomeTitle: e.target.value }))} placeholder={t('adminContent.welcomeTitlePlaceholder')} />
        </div>

        <div className="form-group">
          <label>💬 {t('adminContent.welcomeSubtitleLabel')}</label>
          <input type="text" value={settingsData.welcomeSubtitle} onChange={(e) => setSettingsData(prev => ({ ...prev, welcomeSubtitle: e.target.value }))} placeholder={t('adminContent.welcomeSubtitlePlaceholder')} />
        </div>

        <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '14px' }}>👁️ {t('adminContent.effectPreview')}</h4>
          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              {settingsData.navLogo && <img src={settingsData.navLogo} alt="Logo" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />}
              <span style={{ fontWeight: 700, fontSize: '16px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{settingsData.siteName || t('adminContent.siteName')}</span>
            </div>
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <h3 style={{ margin: '0 0 6px 0', color: 'var(--foreground)', fontSize: '16px' }}>{settingsData.welcomeTitle || t('adminContent.welcomeTitle')}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>{settingsData.welcomeSubtitle || t('adminContent.welcomeSubtitle')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAboutEditor = () => {
    if (editLang !== 'zh') {
      const currentLang = LANGS.find(l => l.code === editLang);
      return (
        <div>
          <div style={{
            background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)',
            borderRadius: '12px', padding: '16px', marginBottom: '20px',
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>
              🌐 {currentLang.flag} {currentLang.label} {t('adminContent.translationTitle')}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              {t('adminContent.translationDesc', { lang: currentLang.label })}
            </p>
          </div>
          {renderLocalizedField(t('adminContent.siteDesc'), '📝', aboutData, setAboutData, 'description', t('adminContent.siteDescPlaceholder'), true)}
          {renderLocalizedField(t('adminContent.aiDisclaimer'), '🤖', aboutData, setAboutData, 'aiDisclaimer', 'e.g., Some content on this site is generated by AI')}
          {renderLocalizedField(t('adminContent.copyright'), '©', aboutData, setAboutData, 'copyright', 'e.g., © 2026 09兽')}

          <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '14px' }}>👁️ {t('adminContent.pagePreview')}（{currentLang.label}）</h4>
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)' }}>
              {aboutData.banner && (
                <div style={{ height: '100px', overflow: 'hidden' }}>
                  <img src={aboutData.banner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ textAlign: 'center', padding: '20px 16px' }}>
                {aboutData.logo && (<img src={aboutData.logo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', marginBottom: '10px' }} />)}
                <h3 style={{ margin: '0 0 4px 0', color: 'var(--foreground)', fontSize: '15px' }}>{t('adminContent.aboutUs')}</h3>
                {(getLocVal(aboutData, 'description', editLang) || aboutData.description) && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                    {getLocVal(aboutData, 'description', editLang) || aboutData.description}
                  </p>
                )}
                {aboutData.version && <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', margin: '6px 0 0 0' }}>{t('adminContent.version')} {aboutData.version}</p>}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '10px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  {(getLocVal(aboutData, 'copyright', editLang) || aboutData.copyright) && <p style={{ margin: '1px 0' }}>{getLocVal(aboutData, 'copyright', editLang) || aboutData.copyright}</p>}
                  {(getLocVal(aboutData, 'aiDisclaimer', editLang) || aboutData.aiDisclaimer) && <p style={{ margin: '1px 0', fontStyle: 'italic' }}>{getLocVal(aboutData, 'aiDisclaimer', editLang) || aboutData.aiDisclaimer}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🖼️ {t('adminContent.bannerImage')}</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t('adminContent.bannerImageDesc')}</p>
          <ImageUploader label={t('adminContent.bannerImage')} value={aboutData.banner} onChange={(url) => setAboutData(prev => ({ ...prev, banner: url }))} aspectRatio={3} outputWidth={1200} outputHeight={400} />
        </div>

        <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--foreground)', fontSize: '14px' }}>🏷️ {t('adminContent.siteLogo')}</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t('adminContent.siteLogoDesc')}</p>
          <ImageUploader label={t('adminContent.siteLogo')} value={aboutData.logo} onChange={(url) => setAboutData(prev => ({ ...prev, logo: url }))} aspectRatio={1} outputWidth={200} outputHeight={200} />
        </div>

        <div className="form-group">
          <label>📝 {t('adminContent.siteDesc')}</label>
          <textarea value={aboutData.description} onChange={(e) => setAboutData(prev => ({ ...prev, description: e.target.value }))} placeholder={t('adminContent.siteDescPlaceholder')} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.6, resize: 'vertical' }} />
        </div>

        <div className="form-group">
          <label>🔢 {t('adminContent.versionNumber')}</label>
          <input type="text" value={aboutData.version} onChange={(e) => setAboutData(prev => ({ ...prev, version: e.target.value }))} placeholder="e.g., 1.0.0" />
        </div>

        <div className="form-group">
          <label>📋 {t('adminContent.changelog')}</label>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 12px 0', lineHeight: 1.6 }}>
            {t('adminContent.changelogDesc')}
          </p>
          <div style={{
            padding: '14px', borderRadius: '10px', marginBottom: '12px',
            background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--foreground)' }}>{t('adminContent.currentVersionUpdates')}</h4>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input type="text" value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)} placeholder={t('adminContent.updateInputPlaceholder')} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px', minWidth: 0 }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUpdate(); } }} />
                <button type="button" style={{ background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', color: 'var(--primary-light)', cursor: 'pointer', fontSize: '14px', width: '26px', height: '26px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1 }} onClick={addUpdate}>+</button>
              </div>
            </div>
            {aboutData.updates.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                {aboutData.updates.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    background: 'var(--hover-bg)', border: '1px solid var(--border)',
                    borderRadius: '6px', padding: '8px 10px'
                  }}>
                    <span style={{ fontSize: '13px', color: 'var(--foreground)', lineHeight: 1.5, flex: 1, wordBreak: 'break-all' }}>• {item}</span>
                    <button type="button" onClick={() => removeUpdate(index)} style={{
                      background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                      color: 'var(--destructive-text)', cursor: 'pointer', fontSize: '12px',
                      width: '20px', height: '20px', borderRadius: '3px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, marginTop: '1px'
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="btn" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => {
              if (aboutData.updates.length === 0) { setMessage(t('adminContent.addUpdatesFirst')); return; }
              const newEntry = {
                version: aboutData.version,
                date: new Date().toISOString().split('T')[0],
                items: [...aboutData.updates]
              };
              const existing = aboutData.changelog.find(c => c.version === aboutData.version);
              let newChangelog;
              if (existing) {
                const mergedItems = [...existing.items, ...aboutData.updates.filter(item => !existing.items.includes(item))];
                const updatedEntry = { ...existing, items: mergedItems };
                newChangelog = aboutData.changelog.map(c => c.version === aboutData.version ? updatedEntry : c);
              } else {
                newChangelog = [newEntry, ...aboutData.changelog];
              }
              setAboutData(prev => ({ ...prev, changelog: newChangelog, updates: [] }));
              setNewUpdate('');
              setMessage(t('adminContent.versionLogPublished', { version: aboutData.version }));
            }}>
              📦 {t('adminContent.publishVersionLog', { version: aboutData.version })}
            </button>
          </div>

          {aboutData.changelog.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--foreground)' }}>{t('adminContent.historyChangelog')}</h4>
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
                        {idx === 0 && <span style={{ fontSize: '10px', color: 'var(--success-text)', background: 'var(--success-bg)', padding: '1px 6px', borderRadius: '3px' }}>{t('adminContent.latest')}</span>}
                      </div>
                      <button type="button" onClick={() => {
                        setAboutData(prev => ({ ...prev, changelog: prev.changelog.filter((_, i) => i !== idx) }));
                      }} style={{ background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)', color: 'var(--destructive-text)', cursor: 'pointer', fontSize: '12px', width: '20px', height: '20px', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                    </div>
                    <div style={{ padding: '8px 12px' }}>
                      {(entry.items || []).map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '6px',
                          padding: '4px 0',
                          borderBottom: i < (entry.items || []).length - 1 ? '1px dashed var(--border)' : 'none'
                        }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, wordBreak: 'break-all' }}>• {item}</span>
                          <button type="button" onClick={() => {
                            setAboutData(prev => ({
                              ...prev,
                              changelog: prev.changelog.map((c, ci) => ci === idx ? { ...c, items: c.items.filter((_, ii) => ii !== i) } : c).filter(c => c.items.length > 0)
                            }));
                          }} style={{
                            background: 'var(--destructive-bg)', border: '1px solid var(--destructive-border)',
                            color: 'var(--destructive-text)', cursor: 'pointer', fontSize: '12px',
                            width: '18px', height: '18px', borderRadius: '3px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, marginTop: '2px'
                          }}>×</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border)' }}>
                        <input type="text" value={changelogInputs[idx] || ''} onChange={(e) => setChangelogInputs(prev => ({ ...prev, [idx]: e.target.value }))} placeholder={t('adminContent.appendInputPlaceholder')} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '12px', minWidth: 0 }} onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (changelogInputs[idx] || '').trim();
                            if (!val) return;
                            setAboutData(prev => ({
                              ...prev,
                              changelog: prev.changelog.map((c, ci) => ci === idx ? { ...c, items: [...c.items, val] } : c)
                            }));
                            setChangelogInputs(prev => ({ ...prev, [idx]: '' }));
                          }
                        }} />
                        <button type="button" onClick={() => {
                          const val = (changelogInputs[idx] || '').trim();
                          if (!val) return;
                          setAboutData(prev => ({
                            ...prev,
                            changelog: prev.changelog.map((c, ci) => ci === idx ? { ...c, items: [...c.items, val] } : c)
                          }));
                          setChangelogInputs(prev => ({ ...prev, [idx]: '' }));
                        }} style={{
                          background: 'var(--primary-bg)', border: '1px solid var(--primary-border)',
                          color: 'var(--primary-light)', cursor: 'pointer', fontSize: '14px',
                          width: '24px', height: '24px', borderRadius: '4px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                        }}>+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>🌐 {t('adminContent.icpFiling')}</label>
          <input type="text" value={aboutData.icp} onChange={(e) => setAboutData(prev => ({ ...prev, icp: e.target.value }))} placeholder={t('adminContent.icpPlaceholder')} />
        </div>

        <div className="form-group">
          <label>🛡️ {t('adminContent.policeFiling')}</label>
          <input type="text" value={aboutData.policeRecord} onChange={(e) => setAboutData(prev => ({ ...prev, policeRecord: e.target.value }))} placeholder={t('adminContent.policePlaceholder')} />
        </div>

        <div className="form-group">
          <label>🤖 {t('adminContent.aiDisclaimer')}</label>
          <input type="text" value={aboutData.aiDisclaimer} onChange={(e) => setAboutData(prev => ({ ...prev, aiDisclaimer: e.target.value }))} placeholder={t('adminContent.aiDisclaimerPlaceholder')} />
        </div>

        <div className="form-group">
          <label>© {t('adminContent.copyright')}</label>
          <input type="text" value={aboutData.copyright} onChange={(e) => setAboutData(prev => ({ ...prev, copyright: e.target.value }))} placeholder={t('adminContent.copyrightPlaceholder')} />
        </div>

        <div style={{ background: 'var(--primary-bg-subtle)', border: '1px solid var(--primary-border-subtle)', borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--foreground)', fontSize: '14px' }}>👁️ {t('adminContent.pagePreview')}</h4>
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)' }}>
            {aboutData.banner && (
              <div style={{ height: '100px', overflow: 'hidden' }}>
                <img src={aboutData.banner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ textAlign: 'center', padding: '20px 16px' }}>
              {aboutData.logo && (<img src={aboutData.logo} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', marginBottom: '10px' }} />)}
              <h3 style={{ margin: '0 0 4px 0', color: 'var(--foreground)', fontSize: '15px' }}>{t('adminContent.aboutUs')}</h3>
              {aboutData.description && (<p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '6px 0 0 0', lineHeight: 1.5 }}>{aboutData.description}</p>)}
              {aboutData.version && <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', margin: '6px 0 0 0' }}>{t('adminContent.version')} {aboutData.version}</p>}
              {aboutData.changelog.length > 0 && (
                <div style={{ textAlign: 'left', marginTop: '10px' }}>
                  <p style={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 600, margin: '0 0 4px 0' }}>{t('adminContent.updateLog')}</p>
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
  };

  const renderContentEditor = () => {
    const currentLang = LANGS.find(l => l.code === editLang);
    return (
      <div className="form-group">
        <label>{t('adminContent.contentLabel')}{editLang !== 'zh' ? `（${currentLang.flag} ${currentLang.label}）` : ''}</label>
        {editLang !== 'zh' && editContentI18n.zh && (
          <div style={{
            marginBottom: '8px', padding: '10px 12px', borderRadius: '8px',
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
            position: 'relative', whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'auto',
          }}>
            <span style={{
              position: 'sticky', top: 0, display: 'inline-block',
              background: 'var(--card)', padding: '0 6px',
              fontSize: '10px', color: 'var(--text-tertiary)',
              border: '1px solid var(--border)', borderRadius: '3px', marginBottom: '4px',
            }}>🇨🇳 {t('adminContent.chineseRef')}</span>
            <div>{editContentI18n.zh}</div>
          </div>
        )}
        <textarea
          value={editContentI18n[editLang] || ''}
          onChange={(e) => setEditContentI18n(prev => ({ ...prev, [editLang]: e.target.value }))}
          rows={20}
          placeholder={editLang === 'zh' ? t('adminContent.contentPlaceholder') : t('adminContent.contentTranslationPlaceholder', { lang: currentLang.label })}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)', fontSize: '14px', lineHeight: 1.8, resize: 'vertical' }}
        />
      </div>
    );
  };

  return (
    <div className="admin-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2>{t('adminContent.contentManagement')}</h2>
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
                {item.key === 'about' ? t('adminContent.aboutDesc') : item.key === 'settings' ? t('adminContent.settingsDesc') : item.key === 'privacy' ? t('adminContent.privacyDesc') : t('adminContent.termsDesc')}
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: 0 }}>{t('adminContent.lastUpdated')}{new Date(item.updatedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="form-container" style={{ maxWidth: '800px' }}>
          <button className="btn btn-secondary" onClick={() => { setEditingKey(null); setMessage(''); }} style={{ marginBottom: '20px' }}>{t('adminContent.backToList')}</button>
          <div className="form-group">
            <label>{t('adminContent.titleLabel')}</label>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          {renderLangTabs()}
          {editingKey === 'about' ? renderAboutEditor() : editingKey === 'settings' ? renderSettingsEditor() : renderContentEditor()}
          {message && (
            <div style={{ padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', background: message.includes(t('adminContent.saveSuccess')) ? 'var(--success-bg)' : 'var(--destructive-bg)', color: message.includes(t('adminContent.saveSuccess')) ? 'var(--success-text)' : 'var(--destructive-text)', border: `1px solid ${message.includes(t('adminContent.saveSuccess')) ? 'var(--success-border)' : 'var(--destructive-border)'}` }}>{message}</div>
          )}
          <button className="btn" onClick={handleSave} disabled={saving}>{saving ? t('adminContent.saving') : `💾 ${t('adminContent.saveBtn')}`}</button>
        </div>
      )}
    </div>
  );
};

export default AdminSiteContent;
