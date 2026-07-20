import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import useTranslation from '../hooks/useTranslation';
import TranslatableText from './TranslatableText';
import { TranslatableBlock } from './TranslatableText';

const SitePage = ({ pageKey }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [changelogPage, setChangelogPage] = useState(1);
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const { getLocalizedContent } = useTranslation();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await axios.get(`/api/site-content/${pageKey}`);
        setContent(res.data);
      } catch (err) {}
      setLoading(false);
    };
    fetchContent();
  }, [pageKey]);

  useEffect(() => {
    setChangelogPage(1);
  }, [pageKey]);

  if (loading) return <div className="container"><h2>{t('common.loading')}</h2></div>;

  const resolveContent = (rawContent, field) => {
    if (!rawContent) return '';
    try {
      const parsed = JSON.parse(rawContent);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        if (field) {
          return getLocalizedContent({ content: rawContent }, field) || parsed[field] || '';
        }
        if ('zh' in parsed || 'en' in parsed) {
          const localizedContent = parsed[lang] || parsed['zh'] || parsed['en'] || '';
          if (localizedContent) return localizedContent;
        }
        const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
        const localizedContent = parsed[`content${suffix}`] || parsed['content'] || parsed['contentZh'] || '';
        if (localizedContent) return localizedContent;
      }
    } catch (e) {}
    return rawContent;
  };

  if (pageKey === 'about' && content) {
    let aboutData = {};
    try {
      aboutData = JSON.parse(content.content);
    } catch (e) {
      aboutData = { copyright: content.content };
    }

    return (
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '800px' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
          {t('common.goBack')}
        </button>
        <div style={{
          borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)',
          background: 'var(--card)'
        }}>
          {aboutData.banner && (
            <div style={{ height: '220px', overflow: 'hidden', position: 'relative' }}>
              <img src={aboutData.banner} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(transparent, var(--card))' }} />
            </div>
          )}
          <div style={{
            textAlign: 'center', padding: aboutData.banner ? '0 16px 16px' : '16px',
            marginTop: aboutData.banner ? '-30px' : '0', position: 'relative'
          }}>
            {aboutData.logo && (
              <img src={aboutData.logo} alt="Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'cover', marginBottom: '16px', border: '3px solid var(--card)', boxShadow: '0 4px 12px var(--shadow-modal)' }} />
            )}
            <h1 style={{ margin: '0 0 8px 0', color: 'var(--foreground)' }}>
              <TranslatableText text={content.title} />
            </h1>
            {getLocalizedContent({ content: content.content }, 'description') && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7, margin: '8px auto 0', maxWidth: '500px' }}>
                <TranslatableText text={getLocalizedContent({ content: content.content }, 'description')} />
              </p>
            )}
            {aboutData.version && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '24px', marginTop: '12px' }}>
                {t('sitePage.version')} {aboutData.version}
              </p>
            )}
            {(() => {
              const changelog = aboutData.changelog || [];
              const currentUpdates = aboutData.updates || [];
              const hasChangelog = changelog.length > 0;
              const hasCurrentUpdates = currentUpdates.length > 0;
              if (!hasChangelog && !hasCurrentUpdates) return null;
              return (
                <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--foreground)', marginBottom: '12px', fontSize: '16px' }}>{t('sitePage.changelog')}</h3>
                  {hasCurrentUpdates && (
                    <div style={{ marginBottom: '16px', borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--glass-bg)' }}>
                        <span style={{ color: 'var(--primary-light)', fontSize: '13px', fontWeight: 700, background: 'var(--primary-bg)', borderRadius: '6px', padding: '3px 10px' }}>v{aboutData.version}</span>
                        <span style={{ fontSize: '11px', color: 'var(--warning-text)', background: 'var(--warning-bg)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--warning-border)' }}>{t('sitePage.comingSoon')}</span>
                      </div>
                      <div style={{ padding: '10px 14px' }}>
                        {currentUpdates.map((item, i) => {
                          // 兼容旧格式（字符串）和新格式（{content, date}）
                          const text = typeof item === 'string' ? item : (item.content || '');
                          const date = typeof item === 'object' && item.date ? item.date : '';
                          return (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: i < currentUpdates.length - 1 ? '1px dashed var(--border)' : 'none' }}>
                            <span style={{ color: 'var(--primary-light)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>•</span>
                            <span style={{ color: 'var(--text-lighter)', fontSize: '13px', lineHeight: 1.5, flex: 1 }}><TranslatableText text={text} /></span>
                            {date && <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>{date}</span>}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {hasChangelog && (() => {
                    const PAGE_SIZE = 5;
                    const totalPages = Math.ceil(changelog.length / PAGE_SIZE);
                    const safePage = Math.min(changelogPage, totalPages) || 1;
                    const pagedChangelog = changelog.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
                    return (
                      <>
                        {pagedChangelog.map((entry, idx) => (
                          <div key={(safePage - 1) * PAGE_SIZE + idx} style={{ marginBottom: '16px', borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--glass-bg)' }}>
                              <span style={{ color: 'var(--primary-light)', fontSize: '13px', fontWeight: 700, background: 'var(--primary-bg)', borderRadius: '6px', padding: '3px 10px' }}>v{entry.version}</span>
                              {entry.date && <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{entry.date}</span>}
                              {(safePage === 1 && idx === 0) && <span style={{ fontSize: '11px', color: 'var(--success-text)', background: 'var(--success-bg)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--success-border)' }}>{t('sitePage.latest')}</span>}
                            </div>
                            <div style={{ padding: '10px 14px' }}>
                              {(entry.items || []).map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0', borderBottom: i < (entry.items || []).length - 1 ? '1px dashed var(--border)' : 'none' }}>
                                  <span style={{ color: 'var(--primary-light)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>•</span>
                                  <span style={{ color: 'var(--text-lighter)', fontSize: '13px', lineHeight: 1.5 }}><TranslatableText text={item} /></span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {totalPages > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px', marginBottom: '8px' }}>
                            <button disabled={safePage <= 1} onClick={() => setChangelogPage(safePage - 1)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)', background: safePage <= 1 ? 'var(--hover-bg)' : 'var(--card)', color: safePage <= 1 ? 'var(--text-tertiary)' : 'var(--foreground)', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1 }}>{t('sitePage.prevPage')}</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                              <button key={p} onClick={() => setChangelogPage(p)} style={{ width: '32px', height: '32px', borderRadius: '8px', fontSize: '13px', border: p === safePage ? '1px solid var(--primary)' : '1px solid var(--border)', background: p === safePage ? 'var(--primary-bg)' : 'var(--card)', color: p === safePage ? 'var(--primary-light)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: p === safePage ? 700 : 400 }}>{p}</button>
                            ))}
                            <button disabled={safePage >= totalPages} onClick={() => setChangelogPage(safePage + 1)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)', background: safePage >= totalPages ? 'var(--hover-bg)' : 'var(--card)', color: safePage >= totalPages ? 'var(--text-tertiary)' : 'var(--foreground)', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1 }}>{t('sitePage.nextPage')}</button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              );
            })()}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 2 }}>
              {getLocalizedContent({ content: content.content }, 'copyright') && <p style={{ margin: '4px 0' }}><TranslatableText text={getLocalizedContent({ content: content.content }, 'copyright')} /></p>}
              {aboutData.icp && (
                <p style={{ margin: '4px 0' }}>
                  <a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{aboutData.icp}</a>
                </p>
              )}
              {aboutData.policeRecord && (
                <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <a href="https://beian.mps.gov.cn/#/query/webSearch" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                    <img src="https://www.beian.gov.cn/img/ghs.png" alt="" style={{ width: '14px', height: '14px' }} />
                    {aboutData.policeRecord}
                  </a>
                </p>
              )}
              {getLocalizedContent({ content: content.content }, 'aiDisclaimer') && <p style={{ margin: '4px 0', fontStyle: 'italic', color: 'var(--text-tertiary)' }}><TranslatableText text={getLocalizedContent({ content: content.content }, 'aiDisclaimer')} /></p>}
              <p style={{ margin: '4px 0' }}>
                <Link to="/license" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{t('sitePage.license')}</Link>
              </p>
              <p style={{ margin: '8px 0 4px 0' }}>
                <span onClick={() => setShowGithubModal(true)} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  {t('sitePage.githubProject')}
                </span>
              </p>
              {showGithubModal && (
                <div onClick={() => setShowGithubModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', width: 'min(360px, calc(100vw - 40px))', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--foreground)' }}>{t('sitePage.githubProject')}</h3>
                      <button onClick={() => setShowGithubModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '20px' }}>📦</span>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>{t('sitePage.project')}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>furry-drama-tracker</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{t('sitePage.frontendProject')}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GPL v3.0</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{t('sitePage.backendProject')}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AGPL v3.0</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Link to="/license" onClick={() => setShowGithubModal(false)} style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{t('sitePage.viewLicense')}</Link>
                          <a href="https://github.com/Furry09shou/furry-drama-tracker" target="_blank" rel="noopener noreferrer" onClick={() => setShowGithubModal(false)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>GitHub</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '800px' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        {t('common.goBack')}
      </button>
      <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
        <h1 style={{ margin: '0 0 24px 0', color: 'var(--foreground)' }}>
          {content ? <TranslatableText text={content.title} /> : t('common.loading')}
        </h1>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          {content ? (() => {
            const rawContent = content.content;
            const resolved = resolveContent(rawContent);
            if (resolved && resolved !== rawContent) {
              return <TranslatableBlock text={resolved} />;
            }
            return <TranslatableBlock text={rawContent} />;
          })() : ''}
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage = () => <SitePage pageKey="privacy" />;
export const TermsPage = () => <SitePage pageKey="terms" />;
export const AboutPage = () => <SitePage pageKey="about" />;

export const LicensePage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '60px', maxWidth: '800px' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        {t('common.goBack')}
      </button>
      <div style={{ background: 'var(--card)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
        <h1 style={{ margin: '0 0 24px 0', color: 'var(--foreground)' }}>{t('sitePage.openSourceLicense')}</h1>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: 'var(--foreground)', margin: 0, fontSize: '15px' }}>{t('sitePage.projectLicense')}</h3>
              <a href="https://github.com/Furry09shou/furry-drama-tracker" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>
                <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                {t('sitePage.githubRepo')}
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ color: 'var(--foreground)', margin: '0 0 6px 0', fontSize: '14px' }}>{t('sitePage.frontendGPL')}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>GNU General Public License v3.0 or later</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{t('sitePage.viewOriginal')}</a>
                  </div>
                </div>
                <img src="/images/gpl-v3-logo.svg" alt="GPLv3" style={{ height: '48px', flexShrink: 0 }} />
              </div>
              <div style={{ padding: '12px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ color: 'var(--foreground)', margin: '0 0 6px 0', fontSize: '14px' }}>{t('sitePage.backendAGPL')}</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>GNU Affero General Public License v3.0 or later</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--warning-text)' }}>{t('sitePage.agplNote')}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }} onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'} onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}>{t('sitePage.viewOriginal')}</a>
                  </div>
                </div>
                <img src="/images/agpl-v3-logo.svg" alt="AGPLv3" style={{ height: '48px', flexShrink: 0 }} />
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--foreground)', margin: '0 0 12px 0', fontSize: '15px' }}>{t('sitePage.licensePoints')}</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong style={{ color: 'var(--success-text)' }}>{t('sitePage.freeUse')}</strong> — {t('sitePage.freeUseDesc')}</li>
              <li><strong style={{ color: 'var(--success-text)' }}>{t('sitePage.freeModify')}</strong> — {t('sitePage.freeModifyDesc')}</li>
              <li><strong style={{ color: 'var(--success-text)' }}>{t('sitePage.freeDistribute')}</strong> — {t('sitePage.freeDistributeDesc')}</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>{t('sitePage.sameLicense')}</strong> — {t('sitePage.sameLicenseDesc')}</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>{t('sitePage.openSourceReq')}</strong> — {t('sitePage.openSourceReqDesc')}</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>{t('sitePage.networkService')}</strong> — {t('sitePage.networkServiceDesc')}</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>{t('sitePage.stateChanges')}</strong> — {t('sitePage.stateChangesDesc')}</li>
            </ul>
          </div>
          <div style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--foreground)', margin: '0 0 12px 0', fontSize: '15px' }}>{t('sitePage.disclaimer')}</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>{t('sitePage.disclaimerText')}</p>
          </div>
          <div style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--foreground)', margin: '0 0 12px 0', fontSize: '15px' }}>{t('sitePage.thirdPartyDeps')}</h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{t('sitePage.thirdPartyDepsDesc')}</p>
            <h4 style={{ color: 'var(--text-secondary)', margin: '8px 0 4px 0', fontSize: '13px' }}>{t('sitePage.frontendProject')}</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>React — MIT License</li>
              <li>React Router — MIT License</li>
              <li>Axios — MIT License</li>
              <li>Vite — MIT License</li>
            </ul>
            <h4 style={{ color: 'var(--text-secondary)', margin: '12px 0 4px 0', fontSize: '13px' }}>{t('sitePage.backendProject')}</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Express — MIT License</li>
              <li>Mongoose — MIT License</li>
              <li>bcryptjs — MIT License</li>
              <li>jsonwebtoken — MIT License</li>
              <li>multer — MIT License</li>
              <li>cors — MIT License</li>
              <li>dotenv — BSD-2-Clause License</li>
              <li>helmet — MIT License</li>
              <li>express-rate-limit — MIT License</li>
              <li>nodemailer — MIT License</li>
              <li>xss — MIT License</li>
            </ul>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>{t('sitePage.fullLicenseNote')}</p>
        </div>
      </div>
    </div>
  );
};

export default SitePage;
