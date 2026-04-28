import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import CustomSelect from './CustomSelect';
import SearchInput from './SearchInput';

const Home = () => {
  const [episodes, setEpisodes] = useState([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [sort, setSort] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
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
    const fetchEpisodes = async () => {
      try {
        const response = await axios.get(`/api/episodes?category=${category}&sort=${sort}`);
        setEpisodes(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching episodes:', error);
        setLoading(false);
      }
    };
    fetchEpisodes();
  }, [category, sort]);

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
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                pointerEvents: 'none',
                transition: 'opacity 0.5s ease',
                opacity: isTransitioning ? 1 : 0
              }}>
                <h2 style={{color: '#fff', marginBottom: '8px', fontSize: '24px'}}>{previousBanner.title}</h2>
                {previousBanner.subtitle && <p style={{color: 'rgba(255,255,255,0.8)', fontSize: '15px'}}>{previousBanner.subtitle}</p>}
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
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              pointerEvents: 'none',
              transition: 'opacity 0.5s ease',
              opacity: isTransitioning ? 0 : 1
            }}>
              <h2 style={{color: '#fff', marginBottom: '8px', fontSize: '24px'}}>{banner.title}</h2>
              {banner.subtitle && <p style={{color: 'rgba(255,255,255,0.8)', fontSize: '15px'}}>{banner.subtitle}</p>}
            </div>
          </BannerWrapper>
        </div>

        {banners.length > 1 && (
          <>
            <button onClick={prevBanner} style={{
              position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
              fontSize: '18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s',
              zIndex: 3
            }} onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.7)'} onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}>
              ‹
            </button>
            <button onClick={nextBanner} style={{
              position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
              width: '40px', height: '40px', borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
              fontSize: '18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.3s',
              zIndex: 3
            }} onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.7)'} onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}>
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
                  background: idx === currentBanner ? '#fff' : 'rgba(255,255,255,0.4)',
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
        <div className="filters">
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
                  <div style={{fontSize: '12px', color: '#94a3b8'}}>{item.category?.join(', ')}</div>
                </div>
              </div>
            )}
            style={{flex: 1}}
          />
          <CustomSelect
            options={[
              { value: '', label: '全部分类' },
              ...categories.map(c => ({ value: c.name, label: c.name }))
            ]}
            value={category}
            onChange={setCategory}
            placeholder="选择分类"
          />
          <CustomSelect
            options={[
              { value: 'latest', label: '最新更新' },
              { value: 'views', label: '热门推荐' },
              { value: 'premiere', label: '最新首播' }
            ]}
            value={sort}
            onChange={setSort}
            placeholder="排序方式"
          />
        </div>
      </div>

      <h2>{searchQuery ? `搜索结果 (${filteredEpisodes.length})` : '剧集列表'}</h2>
      <div className="episode-grid">
        {filteredEpisodes.length === 0 ? (
          <div style={{textAlign: 'center', padding: '60px', color: '#94a3b8', gridColumn: '1 / -1'}}>
            {searchQuery ? '没有找到匹配的剧集' : '暂无剧集'}
          </div>
        ) : (
          filteredEpisodes.map(episode => (
            <Link key={episode._id} to={`/episode/${episode._id}`} className="episode-card" onClick={() => sessionStorage.setItem('homeScrollPosition', String(window.scrollY))}>
              <img src={episode.coverImage} alt={episode.title} />
              <div className="card-content">
                <h3>{episode.title}</h3>
                <p>{episode.description.substring(0, 120)}...</p>
                <div className="episode-meta">
                  <span>更新至第{episode.currentEpisodes}集，共{episode.totalEpisodes}集</span>
                  <span className={`status ${episode.status}`}>
                    {episode.status === 'ongoing' ? '连载中' : episode.status === 'completed' ? '已完结' : '即将上映'}
                  </span>
                </div>
                <div className="episode-meta">
                  <span>热度: {episode.views || 0}</span>
                  <span>{episode.category?.join(', ')}</span>
                </div>
                {episode.createdBy && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>作者:</span>
                    <Link
                      to={`/creator/${episode.createdBy._id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: '#818cf8', textDecoration: 'none' }}
                    >
                      {episode.createdBy.username}
                    </Link>
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
