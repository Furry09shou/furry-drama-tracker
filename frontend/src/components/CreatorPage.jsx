import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import useTranslation from '../hooks/useTranslation';

const CreatorPage = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { settings: siteSettingsData } = useSiteSettings();
  const { getLocalizedTitle, getLocalizedDescription } = useTranslation();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/creator-profile/by-admin/${id}`);
        setProfile(res.data.profile);
        setEpisodes(res.data.episodes);
      } catch (err) {
        console.error('获取创作者主页失败', err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [id]);

  // 创作者主页标签页标题显示创作者名字
  useEffect(() => {
    if (profile) {
      const suffix = lang.charAt(0).toUpperCase() + lang.slice(1);
      const siteName = (siteSettingsData && (siteSettingsData[`browserTitle${suffix}`] || siteSettingsData.browserTitle)) || t('site.defaultName');
      document.title = `${profile.displayName} - ${siteName}`;
    }
    return () => {
      // 离开页面时恢复默认标题（App.jsx 会在路由变化时重新设置）
    };
  }, [profile, siteSettingsData, lang, t]);

  if (loading) return <div className="container"><h2>{t('common.loading')}</h2></div>;
  if (!profile) return <div className="container"><h2>{t('creator.notFound')}</h2></div>;

  const socialLinks = profile.socialLinks
    ? (typeof profile.socialLinks === 'object' && !(profile.socialLinks instanceof Map)
      ? profile.socialLinks
      : Object.fromEntries(profile.socialLinks))
    : {};

  return (
    <div className="container" style={{paddingTop: '30px', paddingBottom: '60px'}}>
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{marginBottom: '20px'}}>
        {t('common.goBack')}
      </button>

      <div style={{
        background: 'var(--card)', borderRadius: '16px', padding: '30px',
        border: '1px solid var(--border)', marginBottom: '30px',
        display: 'flex', gap: '24px', alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.displayName}
            style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)'}}
          />
        ) : (
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '40px', color: 'var(--btn-text)', fontWeight: 'bold',
            border: '3px solid var(--border)'
          }}>
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{flex: 1, minWidth: '200px'}}>
          <h2 style={{margin: '0 0 8px 0', color: 'var(--foreground)'}}>{profile.displayName}</h2>
          {profile.bio && (
            <p style={{color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.6}}>{profile.bio}</p>
          )}
          {Object.keys(socialLinks).length > 0 && (
            <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              {Object.entries(socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                    background: 'var(--primary-bg-subtle)', color: 'var(--primary)',
                    border: '1px solid var(--primary-border-subtle)', textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-bg-strong)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--primary-bg-subtle)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 style={{marginBottom: '16px', color: 'var(--foreground)'}}>{t('creator.works')}</h3>
        {episodes.length === 0 ? (
          <p style={{color: 'var(--text-secondary)', textAlign: 'center', padding: '40px'}}>{t('creator.noWorks')}</p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '20px'
          }}>
            {episodes.map(ep => (
              <Link
                key={ep._id}
                to={`/episode/${ep._id}`}
                style={{
                  textDecoration: 'none', color: 'var(--foreground)',
                  background: 'var(--card)', borderRadius: '12px',
                  overflow: 'hidden', border: '1px solid var(--border)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px var(--shadow-modal)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <img
                  src={ep.coverImage}
                  alt={ep.title}
                  loading="lazy"
                  style={{width: '100%', aspectRatio: '3/4', objectFit: 'cover'}}
                />
                <div style={{padding: '12px'}}>
                  <h4 style={{margin: '0 0 6px 0', fontSize: '15px'}}>{getLocalizedTitle(ep)}</h4>
                  <p style={{margin: 0, fontSize: '13px', color: 'var(--text-secondary)'}}>
                    {ep.totalEpisodes === null
                      ? t('creator.episodeProgressUnknown', { current: ep.currentEpisodes })
                      : t('creator.episodeProgress', { current: ep.currentEpisodes, total: ep.totalEpisodes })}
                    <span style={{marginLeft: '8px'}}>
                      {ep.status === 'ongoing' ? t('home.statusOngoing') : ep.status === 'completed' ? t('home.statusCompleted') : t('home.statusUpcoming')}
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorPage;
