﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState, useEffect } from 'react';
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
            {aboutData.updates && aboutData.updates.length > 0 && (
              <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--foreground)', marginBottom: '12px', fontSize: '16px' }}>更新日志</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aboutData.updates.map((item, i) => (
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
              </div>
            )}
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

export default SitePage;
