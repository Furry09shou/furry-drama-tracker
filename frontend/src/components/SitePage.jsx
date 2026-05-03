﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SitePage = ({ pageKey }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
            textAlign: 'center', padding: aboutData.banner ? '0 40px 40px' : '40px',
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
            {aboutData.description && (
              <p style={{
                color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7,
                margin: '8px auto 0', maxWidth: '500px'
              }}>
                {aboutData.description}
              </p>
            )}
            {aboutData.version && (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginBottom: '24px', marginTop: '12px' }}>
                版本 {aboutData.version}
              </p>
            )}
            {(() => {
              const changelog = aboutData.changelog || [];
              const oldUpdates = aboutData.updates || [];
              const hasChangelog = changelog.length > 0;
              const hasOldUpdates = oldUpdates.length > 0;
              if (!hasChangelog && !hasOldUpdates) return null;
              return (
                <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--foreground)', marginBottom: '12px', fontSize: '16px' }}>更新日志</h3>
                  {hasChangelog && changelog.map((entry, idx) => (
                    <div key={idx} style={{
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
                        {idx === 0 && (
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
                  {!hasChangelog && hasOldUpdates && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {oldUpdates.map((item, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '10px',
                          padding: '10px 14px', borderRadius: '8px',
                          background: 'var(--hover-bg)', border: '1px solid var(--border)'
                        }}>
                          <span style={{
                            color: 'var(--primary-light)', fontSize: '12px', fontWeight: 600,
                            background: 'var(--primary-bg)', borderRadius: '4px',
                            padding: '2px 8px', flexShrink: 0, marginTop: '1px'
                          }}>{i + 1}</span>
                          <span style={{ color: 'var(--text-lighter)', fontSize: '14px', lineHeight: 1.5 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{
              borderTop: '1px solid var(--border)', paddingTop: '20px',
              color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 2
            }}>
              {aboutData.copyright && <p style={{ margin: '4px 0' }}>{aboutData.copyright}</p>}
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
              {aboutData.aiDisclaimer && <p style={{ margin: '4px 0', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>{aboutData.aiDisclaimer}</p>}
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
        background: 'var(--card)', borderRadius: '16px', padding: '40px',
        border: '1px solid var(--border)'
      }}>
        <h1 style={{ margin: '0 0 24px 0', color: 'var(--foreground)' }}>{content ? content.title : '加载中...'}</h1>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {content ? content.content : ''}
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
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px', maxWidth: '800px' }}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>
        返回上一步
      </button>
      <div style={{
        background: 'var(--card)', borderRadius: '16px', padding: '40px',
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
                <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >查看协议原文 →</a>
              </div>
              <div style={{ padding: '12px', background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ color: 'var(--foreground)', margin: '0 0 6px 0', fontSize: '14px' }}>后端 — AGPL v3.0</h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>GNU Affero General Public License v3.0 or later</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--warning-text)' }}>AGPL 要求通过网络提供服务的后端也必须公开源代码</p>
                <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', marginTop: '4px', display: 'inline-block' }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >查看协议原文 →</a>
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
