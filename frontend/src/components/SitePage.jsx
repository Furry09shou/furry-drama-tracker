import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const getI18nContent = (raw, lang) => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && ('zh' in parsed || 'en' in parsed || 'ja' in parsed)) {
      return parsed[lang] || parsed.zh || raw;
    }
  } catch (e) {}
  return raw;
};

const getLocVal = (data, field, lang) => {
  if (lang === 'zh') return data[field] || '';
  const key = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
  return data[key] || data[field] || '';
};

const SitePage = ({ pageKey }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [changelogPage, setChangelogPage] = useState(1);
  const navigate = useNavigate();
  const { lang } = useI18n();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await axios.get(`/api/site-content/${pageKey}`);
        setContent(res.data);
      } catch (err) {
        console.error('获取内容失败', err);
      }
      setLoading(false);
    };
    fetchContent();
  }, [pageKey]);

  useEffect(() => {
    setChangelogPage(1);
  }, [pageKey]);

  if (loading) return <div className="container"><h2>加载中...</h2></div>;

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
          返回上一步
        </button>
        <div style={{
          borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)',
          background: 'var(--card)'
        }}>
          {aboutData.banner && (
            <div style={{
              height: '220px', overflow: 'hidden', position: 'relative'
            }}>
              <img
                src={aboutData.banner}
                alt="Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
                background: 'linear-gradient(transparent, var(--card))'
              }} />
            </div>
          )}
          <div style={{
            textAlign: 'center', padding: aboutData.banner ? '0 16px 16px' : '16px',
            marginTop: aboutData.banner ? '-30px' : '0', position: 'relative'
          }}>
            {aboutData.logo && (
              <img
                src={aboutData.logo}
                alt="Logo"
                style={{
                  width: '80px', height: '80px', borderRadius: '16px',
                  objectFit: 'cover', marginBottom: '16px',
                  border: '3px solid var(--card)', boxShadow: '0 4px 12px var(--shadow-modal)'
                }}
              />
            )}
            <h1 style={{ margin: '0 0 8px 0', color: 'var(--foreground)' }}>{content.title}</h1>
            {(getLocVal(aboutData, 'description', lang) || aboutData.description) && (
              <p style={{
                color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7,
                margin: '8px auto 0', maxWidth: '500px'
              }}>
                {getLocVal(aboutData, 'description', lang) || aboutData.description}
              </p>
            )}
            {aboutData.version && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '24px', marginTop: '12px' }}>
                版本 {aboutData.version}
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
                  <h3 style={{ color: 'var(--foreground)', marginBottom: '12px', fontSize: '16px' }}>更新日志</h3>
                  {hasCurrentUpdates && (
                    <div style={{
                      marginBottom: '16px', borderRadius: '12px',
                      background: 'var(--hover-bg)', border: '1px solid var(--border)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderBottom: '1px solid var(--border)',
                        background: 'var(--glass-bg)'
                      }}>
                        <span style={{
                          color: 'var(--primary-light)', fontSize: '13px', fontWeight: 700,
                          background: 'var(--primary-bg)', borderRadius: '6px',
                          padding: '3px 10px'
                        }}>v{aboutData.version}</span>
                        <span style={{
                          fontSize: '11px', color: 'var(--warning-text)',
                          background: 'var(--warning-bg)', padding: '1px 8px',
                          borderRadius: '4px', border: '1px solid var(--warning-border)'
                        }}>开发中</span>
                      </div>
                      <div style={{ padding: '10px 14px' }}>
                        {currentUpdates.map((item, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                            padding: '6px 0',
                            borderBottom: i < currentUpdates.length - 1 ? '1px dashed var(--border)' : 'none'
                          }}>
                            <span style={{ color: 'var(--primary-light)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>•</span>
                            <span style={{ color: 'var(--text-lighter)', fontSize: '13px', lineHeight: 1.5 }}>{item}</span>
                          </div>
                        ))}
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
                          <div key={(safePage - 1) * PAGE_SIZE + idx} style={{
                            marginBottom: '16px', borderRadius: '12px',
                            background: 'var(--hover-bg)', border: '1px solid var(--border)',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              padding: '10px 14px', borderBottom: '1px solid var(--border)',
                              background: 'var(--glass-bg)'
                            }}>
                              <span style={{
                                color: 'var(--primary-light)', fontSize: '13px', fontWeight: 700,
                                background: 'var(--primary-bg)', borderRadius: '6px',
                                padding: '3px 10px'
                              }}>v{entry.version}</span>
                              {entry.date && (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>{entry.date}</span>
                              )}
                              {(safePage === 1 && idx === 0) && (
                                <span style={{
                                  fontSize: '11px', color: 'var(--success-text)',
                                  background: 'var(--success-bg)', padding: '1px 8px',
                                  borderRadius: '4px', border: '1px solid var(--success-border)'
                                }}>最新</span>
                              )}
                            </div>
                            <div style={{ padding: '10px 14px' }}>
                              {(entry.items || []).map((item, i) => (
                                <div key={i} style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                                  padding: '6px 0',
                                  borderBottom: i < (entry.items || []).length - 1 ? '1px dashed var(--border)' : 'none'
                                }}>
                                  <span style={{
                                    color: 'var(--primary-light)', fontSize: '11px',
                                    flexShrink: 0, marginTop: '2px'
                                  }}>•</span>
                                  <span style={{ color: 'var(--text-lighter)', fontSize: '13px', lineHeight: 1.5 }}>{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {totalPages > 1 && (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '8px', marginTop: '8px', marginBottom: '8px'
                          }}>
                            <button
                              disabled={safePage <= 1}
                              onClick={() => setChangelogPage(safePage - 1)}
                              style={{
                                padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                                border: '1px solid var(--border)', background: safePage <= 1 ? 'var(--hover-bg)' : 'var(--card)',
                                color: safePage <= 1 ? 'var(--text-tertiary)' : 'var(--foreground)',
                                cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                                opacity: safePage <= 1 ? 0.5 : 1
                              }}
                            >上一页</button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                              <button
                                key={p}
                                onClick={() => setChangelogPage(p)}
                                style={{
                                  width: '32px', height: '32px', borderRadius: '8px', fontSize: '13px',
                                  border: p === safePage ? '1px solid var(--primary)' : '1px solid var(--border)',
                                  background: p === safePage ? 'var(--primary-bg)' : 'var(--card)',
                                  color: p === safePage ? 'var(--primary-light)' : 'var(--text-secondary)',
                                  cursor: 'pointer', fontWeight: p === safePage ? 700 : 400
                                }}
                              >{p}</button>
                            ))}
                            <button
                              disabled={safePage >= totalPages}
                              onClick={() => setChangelogPage(safePage + 1)}
                              style={{
                                padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                                border: '1px solid var(--border)', background: safePage >= totalPages ? 'var(--hover-bg)' : 'var(--card)',
                                color: safePage >= totalPages ? 'var(--text-tertiary)' : 'var(--foreground)',
                                cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                                opacity: safePage >= totalPages ? 0.5 : 1
                              }}
                            >下一页</button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              );
            })()}
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: '20px',
              color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 2
            }}>
              {(getLocVal(aboutData, 'copyright', lang) || aboutData.copyright) && <p style={{ margin: '4px 0' }}>{getLocVal(aboutData, 'copyright', lang) || aboutData.copyright}</p>}
              {aboutData.icp && (
                <p style={{ margin: '4px 0' }}>
                  <a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >{aboutData.icp}</a>
                </p>
              )}
              {aboutData.policeRecord && (
                <p style={{ margin: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <a href="https://beian.mps.gov.cn/#/query/webSearch" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    <img src="https://www.beian.gov.cn/img/ghs.png" alt="" style={{ width: '14px', height: '14px' }} />
                    {aboutData.policeRecord}
                  </a>
                </p>
              )}
              {(getLocVal(aboutData, 'aiDisclaimer', lang) || aboutData.aiDisclaimer) && <p style={{ margin: '4px 0', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>{getLocVal(aboutData, 'aiDisclaimer', lang) || aboutData.aiDisclaimer}</p>}
              <p style={{ margin: '4px 0' }}>
                <Link to="/license" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >GPL v3.0 / AGPL v3.0 许可协议</Link>
              </p>
              <p style={{ margin: '8px 0 4px 0' }}>
                <span
                  onClick={() => setShowGithubModal(true)}
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  GitHub 开源项目
                </span>
              </p>
              {showGithubModal && (
                <div onClick={() => setShowGithubModal(false)} style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div onClick={(e) => e.stopPropagation()} style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '16px', padding: '24px', width: 'min(300px, calc(100vw - 40px))',
                    maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--foreground)' }}>GitHub 开源项目</h3>
                      <button onClick={() => setShowGithubModal(false)} style={{
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        fontSize: '20px', cursor: 'pointer', padding: '4px 8px', lineHeight: 1
                      }}>✕</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                        borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <span style={{ fontSize: '24px' }}>🎨</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>前端项目</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>furry-drama-fe</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>GPL v3.0</span>
                            <Link to="/license" onClick={() => setShowGithubModal(false)} style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none' }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >查看许可协议</Link>
                          </div>
                        </div>
                        <a href="https://github.com/Furry09shou/furry-drama-fe" target="_blank" rel="noopener noreferrer" onClick={() => setShowGithubModal(false)} style={{
                          padding: '6px 12px', borderRadius: '8px', background: 'var(--primary)',
                          color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                          flexShrink: 0, whiteSpace: 'nowrap'
                        }}>GitHub</a>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                        borderRadius: '12px', background: 'var(--hover-bg)', border: '1px solid var(--border)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                        <span style={{ fontSize: '24px' }}>⚙️</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--foreground)' }}>后端项目</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>furry-drama-be</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--card)', padding: '1px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>AGPL v3.0</span>
                            <Link to="/license" onClick={() => setShowGithubModal(false)} style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none' }}
                              onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >查看许可协议</Link>
                          </div>
                        </div>
                        <a href="https://github.com/Furry09shou/furry-drama-be" target="_blank" rel="noopener noreferrer" onClick={() => setShowGithubModal(false)} style={{
                          padding: '6px 12px', borderRadius: '8px', background: 'var(--primary)',
                          color: '#fff', textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                          flexShrink: 0, whiteSpace: 'nowrap'
                        }}>GitHub</a>
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
        返回上一步
      </button>
      <div style={{
        background: 'var(--card)', borderRadius: '16px', padding: '20px',
        border: '1px solid var(--border)'
      }}>
        <h1 style={{ margin: '0 0 24px 0', color: 'var(--foreground)' }}>{content ? content.title : '加载中...'}</h1>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {content ? getI18nContent(content.content, lang) : ''}
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
  return (
    <div className="container" style={{ paddingTop: '20px', paddingBottom: '60px', maxWidth: '800px' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        返回上一步
      </button>
      <div style={{
        background: 'var(--card)', borderRadius: '16px', padding: '20px',
        border: '1px solid var(--border)'
      }}>
        <h1 style={{ margin: '0 0 24px 0', color: 'var(--foreground)' }}>开源许可协议</h1>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div style={{
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '16px', marginBottom: '20px'
          }}>
            <h3 style={{ color: 'var(--foreground)', margin: '0 0 12px 0', fontSize: '15px' }}>项目协议</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ color: 'var(--foreground)', margin: '0 0 6px 0', fontSize: '14px' }}>前端 — GPL v3.0</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>GNU General Public License v3.0 or later</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >查看协议原文 →</a>
                  <a href="https://github.com/Furry09shou/furry-drama-fe" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    GitHub 仓库 →
                  </a>
                </div>
              </div>
              <div style={{ padding: '12px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ color: 'var(--foreground)', margin: '0 0 6px 0', fontSize: '14px' }}>后端 — AGPL v3.0</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>GNU Affero General Public License v3.0 or later</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--warning-text)' }}>AGPL 要求通过网络提供服务的后端也必须公开源代码</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >查看协议原文 →</a>
                  <a href="https://github.com/Furry09shou/furry-drama-be" target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    GitHub 仓库 →
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div style={{
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '16px', marginBottom: '20px'
          }}>
            <h3 style={{ color: 'var(--foreground)', margin: '0 0 12px 0', fontSize: '15px' }}>协议要点</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong style={{ color: 'var(--success-text)' }}>自由使用</strong> — 您可以自由地运行、复制和分发本软件</li>
              <li><strong style={{ color: 'var(--success-text)' }}>自由修改</strong> — 您可以研究本软件的工作原理并按需修改</li>
              <li><strong style={{ color: 'var(--success-text)' }}>自由分发</strong> — 您可以重新分发本软件的副本</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>相同协议</strong> — 衍生作品必须以相同的协议发布</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>开源要求</strong> — 分发时必须提供源代码</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>网络服务</strong> — AGPL 要求通过网络提供服务也必须公开源代码</li>
              <li><strong style={{ color: 'var(--warning-text)' }}>声明变更</strong> — 修改后的作品必须标注变更内容</li>
            </ul>
          </div>
          <div style={{
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '16px', marginBottom: '20px'
          }}>
            <h3 style={{ color: 'var(--foreground)', margin: '0 0 12px 0', fontSize: '15px' }}>免责声明</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>本软件按"原样"提供，不作任何明示或暗示的保证，包括但不限于适销性和特定用途适用性的保证。在任何情况下，作者或版权持有人均不对因使用本软件而产生的任何索赔、损害或其他责任负责。</p>
          </div>
          <div style={{
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '16px', marginBottom: '20px'
          }}>
            <h3 style={{ color: 'var(--foreground)', margin: '0 0 12px 0', fontSize: '15px' }}>第三方依赖</h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>本项目使用了以下开源第三方库，各自遵循其原有许可协议：</p>
            <h4 style={{ color: 'var(--text-secondary)', margin: '8px 0 4px 0', fontSize: '13px' }}>前端</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>React — MIT License</li>
              <li>React Router — MIT License</li>
              <li>Axios — MIT License</li>
              <li>Vite — MIT License</li>
            </ul>
            <h4 style={{ color: 'var(--text-secondary)', margin: '12px 0 4px 0', fontSize: '13px' }}>后端</h4>
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
          <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>
            完整的 GPL v3 协议文本请参阅项目仓库中的 LICENSE.md 文件。
          </p>
        </div>
      </div>
    </div>
  );
};

export default SitePage;
