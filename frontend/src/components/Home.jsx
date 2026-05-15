import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SearchInput from './SearchInput';
import { EpisodeCardSkeletonFixed as EpisodeCardSkeleton } from './Skeleton';

const STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'ongoing', label: '连载中' },
  { value: 'completed', label: '已完结' },
  { value: 'upcoming', label: '即将上映' },
];

const RATING_OPTIONS = [
  { value: '', label: '全部' },
  { value: '4', label: '4+' },
  { value: '3', label: '3+' },
  { value: '2', label: '2+' },
  { value: '1', label: '1+' },
];

const YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  const options = [{ value: '', label: '全部' }, { value: 'recent5', label: '近5年' }];
  for (let y = currentYear; y >= currentYear - 10; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
})();

const SORT_OPTIONS = [
  { value: 'latest', label: '最新更新' },
  { value: 'views', label: '热门推荐' },
  { value: 'premiere', label: '最新首播' },
  { value: 'rating', label: '最高评分' },
];

const STATUS_MAP = {
  ongoing: { text: '连载中', cls: 'ongoing' },
  completed: { text: '已完结', cls: 'completed' },
  upcoming: { text: '即将上映', cls: 'upcoming' },
};

const capsuleBtnStyle = (active) => ({
  padding: '6px 16px',
  borderRadius: '20px',
  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
  background: active ? 'var(--primary)' : 'var(--input)',
  color: active ? '#fff' : 'var(--foreground)',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
  fontWeight: active ? 600 : 400,
  outline: 'none',
});

const filterRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  alignItems: 'center',
  marginBottom: '12px',
};

const filterLabelStyle = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  fontWeight: 500,
  minWidth: '48px',
  flexShrink: 0,
};

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [total, setTotal] = useState(0);
  const [siteSettings, setSiteSettings] = useState({ welcomeTitle: '', welcomeSubtitle: '' });

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    sort: searchParams.get('sort') || 'latest',
    status: searchParams.get('status') || '',
    tag: searchParams.get('tag') || '',
    rating: searchParams.get('rating') || '',
    year: searchParams.get('year') || '',
  });
  const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'desc');

  const searchQuery = searchParams.get('search') || '';

  // 轮播图状态
  const [showWelcome, setShowWelcome] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimerRef = useRef(null);
  const welcomeTimerRef = useRef(null);

  const scrollRestoredRef = useRef(false);

  useEffect(() => {
    if (!loading && !scrollRestoredRef.current) {
      const saved = sessionStorage.getItem('home_scroll_pos');
      if (saved) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(saved, 10));
        });
      }
      scrollRestoredRef.current = true;
    }
  }, [loading]);

  useEffect(() => {
    let timer = null;
    const handleScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem('home_scroll_pos', String(window.scrollY));
      }, 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    axios.get('/api/categories').then(res => setCategories(res.data)).catch(() => {});
    axios.get('/api/banners').then(res => setBanners(res.data)).catch(() => {});
    axios.get('/api/site-content/settings').then(res => {
      try {
        const data = JSON.parse(res.data.content);
        setSiteSettings({ welcomeTitle: data.welcomeTitle || '', welcomeSubtitle: data.welcomeSubtitle || '' });
      } catch (e) {}
    }).catch(() => {});
  }, []);

  // 轮播图逻辑
  useEffect(() => {
    if (banners.length === 0) return;

    // 先显示3秒欢迎文字
    welcomeTimerRef.current = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);

    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, [banners.length]);

  // 欢迎文字消失后启动轮播
  useEffect(() => {
    if (showWelcome || banners.length <= 1) return;

    bannerTimerRef.current = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % banners.length);
    }, 4000);

    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [showWelcome, banners.length]);

  // 加载剧集数据（不分页）
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.status) params.set('status', filters.status);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.rating) params.set('minRating', filters.rating);
    if (filters.year) params.set('year', filters.year);
    if (sortOrder) params.set('order', sortOrder);

    axios.get(`/api/episodes?${params.toString()}`)
      .then(res => {
        const data = res.data;
        if (data.episodes) {
          setEpisodes(data.episodes);
          setTotal(data.total || 0);
        } else if (Array.isArray(data)) {
          setEpisodes(data);
          setTotal(data.length);
        }
      })
      .catch(() => {
        setEpisodes([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [searchQuery, filters, sortOrder]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  const handleSortClick = useCallback((sortValue) => {
    if (filters.sort === sortValue) {
      // 点击已选中的排序按钮，切换升序降序
      const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      setSortOrder(newOrder);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('order', newOrder);
      setSearchParams(newParams);
    } else {
      // 点击未选中的排序按钮，设为该排序，默认降序
      setFilters(prev => ({ ...prev, sort: sortValue }));
      setSortOrder('desc');
      const newParams = new URLSearchParams(searchParams);
      newParams.set('sort', sortValue);
      newParams.set('order', 'desc');
      setSearchParams(newParams);
    }
  }, [filters.sort, sortOrder, searchParams, setSearchParams]);

  const handleTagClick = useCallback((tag) => {
    handleFilterChange('tag', tag);
  }, [handleFilterChange]);

  const handleBannerPrev = () => {
    if (banners.length <= 1) return;
    setBannerIndex(prev => (prev - 1 + banners.length) % banners.length);
  };

  const handleBannerNext = () => {
    if (banners.length <= 1) return;
    setBannerIndex(prev => (prev + 1) % banners.length);
  };

  const handleBannerIndicator = (idx) => {
    setBannerIndex(idx);
  };

  // 格式化热度
  const formatViews = (views) => {
    if (!views && views !== 0) return '0';
    if (views >= 10000) return (views / 10000).toFixed(1) + '万';
    return String(views);
  };

  // 截断描述
  const truncateDesc = (desc, maxLen = 50) => {
    if (!desc) return '暂无简介';
    return desc.length > maxLen ? desc.slice(0, maxLen) + '...' : desc;
  };

  // 渲染轮播图
  const renderBanner = () => {
    if (banners.length === 0) {
      return (
        <div style={{
          position: 'relative',
          marginBottom: '24px',
          borderRadius: '16px',
          overflow: 'hidden',
          aspectRatio: '3/1',
          maxHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          color: '#fff',
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 700,
            margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {siteSettings?.welcomeTitle || '欢迎来到追剧平台'}
          </h2>
          <p style={{
            fontSize: '1rem',
            marginTop: '8px',
            opacity: 0.9,
          }}>
            {siteSettings?.welcomeSubtitle || '发现精彩剧集，追番不迷路'}
          </p>
        </div>
      );
    }

    return (
      <div style={{
        position: 'relative',
        marginBottom: '24px',
        borderRadius: '16px',
        overflow: 'hidden',
        aspectRatio: '3/1',
        maxHeight: '300px',
        margin: '0 auto',
        maxWidth: '100%',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          color: '#fff',
          transition: 'opacity 0.8s ease',
          opacity: showWelcome ? 1 : 0,
          pointerEvents: showWelcome ? 'auto' : 'none',
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 700,
            margin: 0,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}>
            {siteSettings?.welcomeTitle || '欢迎来到追剧平台'}
          </h2>
          <p style={{
            fontSize: '1rem',
            marginTop: '8px',
            opacity: 0.9,
          }}>
            {siteSettings?.welcomeSubtitle || '发现精彩剧集，追番不迷路'}
          </p>
        </div>

        {banners.map((banner, idx) => (
          <div
            key={banner._id || idx}
            onClick={() => {
              if (banner.link) {
                if (banner.link.startsWith('/')) {
                  navigate(banner.link);
                } else {
                  window.open(banner.link, '_blank');
                }
              }
            }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (!showWelcome && idx === bannerIndex) ? 1 : 0,
              transition: 'opacity 0.8s ease',
              cursor: banner.link ? 'pointer' : 'default',
              pointerEvents: (!showWelcome && idx === bannerIndex) ? 'auto' : 'none',
            }}
          >
            <img
              src={banner.image}
              alt={banner.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '20px 24px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              color: '#fff',
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                {banner.title}
              </h3>
              {banner.subtitle && (
                <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {banner.subtitle}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* 前后翻页按钮 */}
        {!showWelcome && banners.length > 1 && (
          <>
            <button
              onClick={handleBannerPrev}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
            >
              ‹
            </button>
            <button
              onClick={handleBannerNext}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 20,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
            >
              ›
            </button>
          </>
        )}

        {/* 指示器 */}
        {!showWelcome && banners.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            gap: '8px',
          }}>
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleBannerIndicator(idx)}
                style={{
                  width: idx === bannerIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: idx === bannerIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染筛选区域
  const renderFilters = () => (
    <div className="filter-section">
      {/* 搜索框 */}
      <div style={{ marginBottom: '16px' }}>
        <SearchInput />
      </div>

      {/* 分类 */}
      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>分类</span>
        <button
          style={capsuleBtnStyle(filters.category === '')}
          onClick={() => handleFilterChange('category', '')}
        >
          全部
        </button>
        {categories.map(c => {
          const name = c.name || c;
          return (
            <button
              key={c._id || name}
              style={capsuleBtnStyle(filters.category === name)}
              onClick={() => handleFilterChange('category', name)}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* 状态 */}
      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>状态</span>
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={capsuleBtnStyle(filters.status === opt.value)}
            onClick={() => handleFilterChange('status', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 评分 */}
      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>评分</span>
        {RATING_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={capsuleBtnStyle(filters.rating === opt.value)}
            onClick={() => handleFilterChange('rating', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 年份 */}
      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>年份</span>
        {YEAR_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={capsuleBtnStyle(filters.year === opt.value)}
            onClick={() => handleFilterChange('year', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 排序 */}
      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>排序</span>
        {SORT_OPTIONS.map(opt => {
          const isActive = filters.sort === opt.value;
          return (
            <button
              key={opt.value}
              style={{
                ...capsuleBtnStyle(isActive),
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => handleSortClick(opt.value)}
            >
              {opt.label}
              {isActive && (
                <span style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  lineHeight: 1,
                  gap: '0px',
                  marginLeft: '2px',
                }}>
                  <span style={{ fontSize: '10px', opacity: sortOrder === 'asc' ? 1 : 0.3, transition: 'opacity 0.2s' }}>▲</span>
                  <span style={{ fontSize: '10px', opacity: sortOrder === 'desc' ? 1 : 0.3, transition: 'opacity 0.2s', marginTop: '-2px' }}>▼</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  // 渲染剧集卡片
  const renderEpisodeCard = (episode) => {
    const statusInfo = STATUS_MAP[episode.status] || STATUS_MAP.ongoing;
    const authorName = episode.createdBy?.username || '';
    const avgRating = episode.averageRating != null ? episode.averageRating.toFixed(1) : '暂无';
    const ratingCount = episode.ratingCount || 0;

    return (
      <Link key={episode._id} to={`/episode/${episode._id}`} className="episode-card">
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img src={episode.coverImage} alt={episode.title} />
          {/* 状态标签 */}
          <span className={`status ${statusInfo.cls}`} style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
          }}>
            {statusInfo.text}
          </span>
          {/* 集数进度 */}
          {(episode.currentEpisodes != null && episode.totalEpisodes != null) && (
            <span style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 500,
            }}>
              第{episode.currentEpisodes}/{episode.totalEpisodes}集
            </span>
          )}
        </div>
        <div className="card-content">
          <h3>{episode.title}</h3>
          <p>{truncateDesc(episode.description)}</p>

          {/* 热度 + 评分 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            marginTop: '4px',
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              🔥 {formatViews(episode.views)}
            </span>
            <span style={{ color: 'var(--warning-text, #f59e0b)' }}>
              ⭐ {avgRating}{ratingCount > 0 ? ` (${ratingCount}人)` : ''}
            </span>
          </div>

          {/* 分类标签 */}
          {episode.category && episode.category.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginTop: '6px',
            }}>
              {episode.category.slice(0, 2).map((cat, i) => (
                <span
                  key={i}
                  style={{
                    padding: '1px 8px',
                    borderRadius: '10px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--primary)',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* 标签（最多3个） */}
          {episode.tags && episode.tags.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginTop: '4px',
            }}>
              {episode.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTagClick(tag);
                  }}
                  style={{
                    padding: '1px 8px',
                    borderRadius: '10px',
                    background: 'var(--hover-bg-stronger, var(--hover-bg))',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* 作者 */}
          {authorName && (
            <div style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}>
              作者: {authorName}
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div>
      {renderBanner()}
      {renderFilters()}

      {searchQuery && (
        <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          搜索 "<strong style={{ color: 'var(--foreground)' }}>{searchQuery}</strong>" 的结果，共 {total} 部
        </div>
      )}

      {loading ? (
        <div className="episode-grid">
          {Array.from({ length: 8 }, (_, i) => (
            <EpisodeCardSkeleton key={i} />
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '16px', margin: 0 }}>
            {searchQuery ? `没有找到与 "${searchQuery}" 相关的剧集` : '暂无剧集'}
          </p>
        </div>
      ) : (
        <div className="episode-grid">
          {episodes.map(episode => renderEpisodeCard(episode))}
        </div>
      )}
    </div>
  );
};

export default Home;
