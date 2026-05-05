import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import SearchInput from './SearchInput';

const Home = () => {
  const [episodes, setEpisodes] = useState([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [sort, setSort] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousBanner, setPreviousBanner] = useState(null);
  const [siteSettings, setSiteSettings] = useState({ welcomeTitle: '欢迎来到兽剧聚合平台', welcomeSubtitle: '发现和追踪你喜爱的兽剧内容' });

  useEffect(() => {
    if (!loading) {
      const savedScroll = sessionStorage.getItem('homeScrollPosition');
      if (savedScroll) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedScroll, 10));
          sessionStorage.removeItem('homeScrollPosition');
        });
      }
    }
  }, [loading]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get('/api/categories');
        setCategories(res.data);
      } catch (err) {
        console.error('获取分类失败', err);
      }
    };
    const fetchBanners = async () => {
      try {
        const res = await axios.get('/api/banners');
        setBanners(res.data);
      } catch (err) {
        console.error('获取轮播图失败', err);
      }
    };
    fetchCategories();
    fetchBanners();
    axios.get('/api/site-content/settings')
      .then(res => {
        try {
          const data = JSON.parse(res.data.content);
          setSiteSettings({
            welcomeTitle: data.welcomeTitle || '欢迎来到兽剧聚合平台',
            welcomeSubtitle: data.welcomeSubtitle || '发现和追踪你喜爱的兽剧内容'
          });
        } catch (e) {}
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const welcomeTimer = setTimeout(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setShowWelcome(false);
        setIsTransitioning(false);
      }, 500);
    }, 3000);
    return () => clearTimeout(welcomeTimer);
  }, [banners]);

  const nextBanner = useCallback(() => {
    if (banners.length <= 1) return;
    setPreviousBanner(banners[currentBanner]);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
      setIsTransitioning(false);
      setPreviousBanner(null);
    }, 500);
  }, [banners, currentBanner]);

  const prevBanner = useCallback(() => {
    if (banners.length <= 1) return;
    setPreviousBanner(banners[currentBanner]);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length);
      setIsTransitioning(false);
      setPreviousBanner(null);
    }, 500);
  }, [banners, currentBanner]);

  useEffect(() => {
    if (showWelcome || banners.length <= 1) return;
    const timer = setInterval(nextBanner, 3000);
    return () => clearInterval(timer);
  }, [showWelcome, banners.length, nextBanner]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tagParam = params.get('tag');
    if (tagParam) setTagFilter(tagParam);
  }, []);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (sort) params.set('sort', sort);
        if (statusFilter) params.set('status', statusFilter);
        if (tagFilter) params.set('tag', tagFilter);
        if (ratingFilter) params.set('minRating', ratingFilter);
        if (yearFilter) params.set('year', yearFilter);
        const response = await axios.get(`/api/episodes?${params.toString()}`);
        setEpisodes(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching episodes:', error);
        setLoading(false);
      }
    };
    fetchEpisodes();
  }, [category, sort, statusFilter, tagFilter, ratingFilter, yearFilter]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEpisodes(episodes);
      return;
    }
    const keyword = searchQuery.toLowerCase();
    const results = episodes.filter(ep =>
      ep.title.toLowerCase().includes(keyword) ||
      ep.description.toLowerCase().includes(keyword) ||
      (ep.category && ep.category.some(c => c.toLowerCase().includes(keyword)))
    );
    setFilteredEpisodes(results);
  }, [searchQuery, episodes]);

  if (loading) {
    return <div className="container"><h2>加载中...</h2></div>;
  }

  const renderHero = () => {
    if (showWelcome) {
      return (
        <div className="hero" style={{
          transition: 'opacity 0.5s ease',
          opacity: isTransitioning ? 0 : 1
        }}>
          <h2>{siteSettings.welcomeTitle}</h2>
          <p>{siteSettings.welcomeSubtitle}</p>
        </div>
      );
    }

    if (banners.length === 0) {
      return (
        <div className="hero">
          <h2>{siteSettings.welcomeTitle}</h2>
          <p>{siteSettings.welcomeSubtitle}</p>
        </div>
      );
    }

    const banner = banners[currentBanner];
    const BannerWrapper = banner.link ? 'a' : 'div';
    const wrapperProps = banner.link ? { href: banner.link, target: '_blank', rel: 'noopener noreferrer' } : {};

    return (
      <div style={{
        position: 'relative',
        width: '100%',
        height: '280px',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '30px'
      }}>
        {/* 上一张图片（背景） */}
        {previousBanner && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 1
          }}>
            <BannerWrapper {...(previousBanner.link ? { href: previousBanner.link, target: '_blank', rel: 'noopener noreferrer' } : {})} style={{
              display: 'block', width: '100%', height: '100%',
              textDecoration: 'none', color: 'inherit'
            }}>
              <img
                src={previousBanner.image}
                alt={previousBanner.title}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transition: 'opacity 0.5s ease',
                  opacity: isTransitioning ? 1 : 0
                }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '40px 30px 30px',
                background: 'linear-gradient(transparent, var(--banner-overlay))',
                pointerEvents: 'none',
                transition: 'opacity 0.5s ease',
                opacity: isTransitioning ? 1 : 0
              }}>
                <h2 style={{color: 'var(--banner-text)', marginBottom: '8px', fontSize: '24px'}}>{previousBanner.title}</h2>
                {previousBanner.subtitle && <p style={{color: 'var(--banner-text-secondary)', fontSize: '15px'}}>{previousBanner.subtitle}</p>}
              </div>
            </BannerWrapper>
          </div>
        )}

        {/* 当前图片（前景） */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 2
        }}>
          <BannerWrapper {...wrapperProps} style={{
            display: 'block', width: '100%', height: '100%',
            textDecoration: 'none', color: 'inherit'
          }}>
            <img
              src={banner.image}
              alt={banner.title}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transition: 'opacity 0.5s ease',
                opacity: isTransitioning ? 0 : 1
              }}
            />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '40px 30px 30px',
              background: 'linear-gradient(transparent, var(--banner-overlay))',
              pointerEvents: 'none',
              transition: 'opacity 0.5s ease',
              opacity: isTransitioning ? 0 : 1
            }}>
              <h2 style={{color: 'var(--banner-text)', marginBottom: '8px', fontSize: '24px'}}>{banner.title}</h2>
              {banner.subtitle && <p style={{color: 'var(--banner-text-secondary)', fontSize: '15px'}}>{banner.subtitle}</p>}
            </div>
          </BannerWrapper>
        </div>

        {banners.length > 1 && (
          <>
            <button onClick={prevBanner} style={{
              position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'var(--banner-overlay-hover)', border: 'none', color: 'var(--banner-text)',
              fontSize: '18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s',
              zIndex: 3
            }} onMouseEnter={(e) => e.target.style.background = 'var(--banner-overlay)'} onMouseLeave={(e) => e.target.style.background = 'var(--banner-overlay-hover)'}>
              ‹
            </button>
            <button onClick={nextBanner} style={{
              position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'var(--banner-overlay-hover)', border: 'none', color: 'var(--banner-text)',
              fontSize: '18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s',
              zIndex: 3
            }} onMouseEnter={(e) => e.target.style.background = 'var(--banner-overlay)'} onMouseLeave={(e) => e.target.style.background = 'var(--banner-overlay-hover)'}>
              ›
            </button>
            <div style={{
              position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: '8px',
              zIndex: 3
            }}>
              {banners.map((_, idx) => (
                <span key={idx} onClick={() => { setPreviousBanner(banners[currentBanner]); setIsTransitioning(true); setTimeout(() => { setCurrentBanner(idx); setIsTransitioning(false); setPreviousBanner(null); }, 500); }} style={{
                  width: idx === currentBanner ? '24px' : '8px',
                  height: '8px', borderRadius: '4px',
                  background: idx === currentBanner ? 'var(--indicator-active)' : 'var(--indicator-inactive)',
                  cursor: 'pointer', transition: 'all 0.3s ease'
                }} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderHero()}

      <div className="filter-section">
        <h3>筛选剧集</h3>
        <div style={{marginBottom: '16px'}}>
          <SearchInput
            data={episodes}
            searchKey={['title', 'description']}
            placeholder="搜索剧集名称、描述..."
            onSearch={setSearchQuery}
            onSelect={(item) => setSearchQuery(item.title)}
            displayRender={(item) => (
              <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {item.coverImage && (
                  <img src={item.coverImage} alt="" style={{width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover'}} />
                )}
                <div>
                  <div style={{fontWeight: '500'}}>{item.title}</div>
                  <div style={{fontSize: '12px', color: 'var(--text-secondary)'}}>{item.category?.join(', ')}</div>
                </div>
              </div>
            )}
          />
        </div>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: 'var(--foreground)', fontWeight: 500, marginRight: '4px'}}>分类：</span>
          <button
            onClick={() => setCategory('')}
            style={{
              padding: '8px 20px',
              borderRadius: '20px',
              border: category === '' ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
              background: category === '' ? 'var(--primary-bg)' : 'var(--hover-bg)',
              color: category === '' ? 'var(--primary)' : 'var(--foreground)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: category === '' ? '600' : '400',
              transition: 'all 0.2s ease',
              opacity: category === '' ? 1 : 0.85
            }}
          >全部</button>
          {categories.map(c => (
            <button
              key={c.name}
              onClick={() => setCategory(c.name === category ? '' : c.name)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: category === c.name ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                background: category === c.name ? 'var(--primary-bg)' : 'var(--hover-bg)',
                color: category === c.name ? 'var(--primary)' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: category === c.name ? '600' : '400',
                transition: 'all 0.2s ease',
                opacity: category === c.name ? 1 : 0.85
              }}
            >{c.name}</button>
          ))}
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: 'var(--foreground)', fontWeight: 500, marginRight: '4px'}}>状态：</span>
          {[
            { value: '', label: '全部' },
            { value: 'ongoing', label: '连载中' },
            { value: 'completed', label: '已完结' },
            { value: 'upcoming', label: '即将上映' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: statusFilter === opt.value ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                background: statusFilter === opt.value ? 'var(--primary-bg)' : 'var(--hover-bg)',
                color: statusFilter === opt.value ? 'var(--primary)' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: statusFilter === opt.value ? '600' : '400',
                transition: 'all 0.2s ease',
                opacity: statusFilter === opt.value ? 1 : 0.85
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: 'var(--foreground)', fontWeight: 500, marginRight: '4px'}}>排序：</span>
          {[
            { value: 'latest', label: '最新更新' },
            { value: 'views', label: '热门推荐' },
            { value: 'premiere', label: '最新首播' },
            { value: 'rating', label: '最高评分' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: sort === opt.value ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                background: sort === opt.value ? 'var(--primary-bg)' : 'var(--hover-bg)',
                color: sort === opt.value ? 'var(--primary)' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: sort === opt.value ? '600' : '400',
                transition: 'all 0.2s ease',
                opacity: sort === opt.value ? 1 : 0.85
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: 'var(--foreground)', fontWeight: 500, marginRight: '4px'}}>评分：</span>
          {[
            { value: '', label: '全部' },
            { value: '9', label: '9+' },
            { value: '8', label: '8+' },
            { value: '7', label: '7+' },
            { value: '6', label: '6+' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setRatingFilter(opt.value)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: ratingFilter === opt.value ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                background: ratingFilter === opt.value ? 'var(--primary-bg)' : 'var(--hover-bg)',
                color: ratingFilter === opt.value ? 'var(--primary)' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: ratingFilter === opt.value ? '600' : '400',
                transition: 'all 0.2s ease',
                opacity: ratingFilter === opt.value ? 1 : 0.85
              }}
            >{opt.label}</button>
          ))}
        </div>
        <div style={{display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
          <span style={{fontSize: '14px', color: 'var(--foreground)', fontWeight: 500, marginRight: '4px'}}>年份：</span>
          {[
            { value: '', label: '全部' },
            { value: '2026', label: '2026' },
            { value: '2025', label: '2025' },
            { value: '2024', label: '2024' },
            { value: '2023', label: '2023' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setYearFilter(opt.value)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: yearFilter === opt.value ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                background: yearFilter === opt.value ? 'var(--primary-bg)' : 'var(--hover-bg)',
                color: yearFilter === opt.value ? 'var(--primary)' : 'var(--foreground)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: yearFilter === opt.value ? '600' : '400',
                transition: 'all 0.2s ease',
                opacity: yearFilter === opt.value ? 1 : 0.85
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      <h2>{searchQuery ? `搜索结果 (${filteredEpisodes.length})` : '剧集列表'}</h2>
      {tagFilter && (
        <div style={{marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <span style={{color: 'var(--text-secondary)', fontSize: '14px'}}>标签筛选：</span>
          <span style={{
            padding: '4px 12px', borderRadius: '12px', fontSize: '13px',
            background: 'var(--primary-bg)', color: 'var(--primary-light)',
            border: '1px solid var(--primary-border)', display: 'inline-flex',
            alignItems: 'center', gap: '6px'
          }}>
            {tagFilter}
            <button onClick={() => setTagFilter('')} style={{
              background: 'none', border: 'none', color: 'var(--primary-light)',
              cursor: 'pointer', fontSize: '14px', padding: 0, lineHeight: 1
            }}>✕</button>
          </span>
        </div>
      )}
      <div className="episode-grid">
        {filteredEpisodes.length === 0 ? (
          <div style={{textAlign: 'center', padding: '60px', color: 'var(--text-secondary)', gridColumn: '1 / -1'}}>
            {searchQuery ? '没有找到匹配的剧集' : '暂无剧集'}
          </div>
        ) : (
          filteredEpisodes.map(episode => (
            <Link key={episode._id} to={`/episode/${episode._id}`} className="episode-card" onClick={() => sessionStorage.setItem('homeScrollPosition', String(window.scrollY))}>
              <img src={episode.coverImage} alt={episode.title} />
              <div className="card-content">
                <h3>{episode.title}</h3>
                <p>{episode.description.length > 50 ? episode.description.substring(0, 50) + '...' : episode.description}</p>
                <div className="episode-meta">
                  <span>第{episode.currentEpisodes}/{episode.totalEpisodes}集</span>
                  <span className={`status ${episode.status}`}>
                    {episode.status === 'ongoing' ? '连载中' : episode.status === 'completed' ? '已完结' : '即将上映'}
                  </span>
                </div>
                <div className="episode-meta">
                  <span>🔥 {episode.views || 0}</span>
                  <span style={{color: 'var(--warning-text)'}}>⭐ {episode.averageRating > 0 ? episode.averageRating.toFixed(1) : '暂无'}{episode.ratingCount > 0 && <span style={{color: 'var(--text-tertiary)', fontSize: '11px'}}>({episode.ratingCount}人)</span>}</span>
                  <span>{episode.category?.join(', ')}</span>
                </div>
                {episode.tags && episode.tags.length > 0 && (
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px'}}>
                    {episode.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTagFilter(tag); }}
                        style={{
                          padding: '1px 6px', borderRadius: '10px', fontSize: '10px',
                          background: 'var(--primary-bg)', color: 'var(--primary-light)',
                          cursor: 'pointer', border: '1px solid var(--primary-border-subtle)'
                        }}>{tag}</span>
                    ))}
                  </div>
                )}
                {episode.createdBy && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>作者:</span>
                    <span
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/creator/${episode.createdBy._id}`; }}
                      style={{ color: 'var(--primary-light)', textDecoration: 'none', cursor: 'pointer' }}
                    >
                      {episode.createdBy.username}
                    </span>
                  </div>
                )}
                <div className="btn-container">
                  <span className="btn">查看详情</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
