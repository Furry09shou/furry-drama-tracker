import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { EpisodeCardSkeletonFixed as EpisodeCardSkeleton } from './Skeleton';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';
import useTranslation from '../hooks/useTranslation';
import BannerCarousel from './BannerCarousel';
import EpisodeFilters from './EpisodeFilters';
import TagCloud from './TagCloud';
import EpisodeCard from './EpisodeCard';

const Home = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getLocalizedTitle, getLocalizedSubtitle, getLocalizedName, getLocalizedDescription, getLocalizedContent } = useTranslation();
  const { settings: siteSettingsData, loading: siteSettingsLoading } = useSiteSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [continueWatching, setContinueWatching] = useState([]);
  const [cwLoading, setCwLoading] = useState(false);

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

  const scrollRestoredRef = useRef(false);

  const welcomeTitle = siteSettingsLoading ? '' : (getLocalizedContent(siteSettingsData || {}, 'welcomeTitle') || t('home.welcomeTitle'));
  const welcomeSubtitle = siteSettingsLoading ? '' : (getLocalizedContent(siteSettingsData || {}, 'welcomeSubtitle') || t('home.welcomeSubtitle'));

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
  }, []);

  useEffect(() => {
    if (!user) {
      setRecommendations([]);
      setContinueWatching([]);
      return;
    }
    setRecLoading(true);
    setCwLoading(true);
    axios.get('/api/stats/recommendations/personalized')
      .then(res => setRecommendations(res.data))
      .catch(() => setRecommendations([]))
      .finally(() => setRecLoading(false));
    axios.get('/api/histories/continue-watching')
      .then(res => setContinueWatching(res.data || []))
      .catch(() => setContinueWatching([]))
      .finally(() => setCwLoading(false));
  }, [user]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.status) params.set('status', filters.status);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.rating) params.set('minRating', filters.rating);
    if (filters.year) params.set('year', filters.year);
    if (sortOrder) params.set('order', sortOrder);
    params.set('page', '1');
    params.set('limit', '24');

    axios.get(`/api/episodes?${params.toString()}`)
      .then(res => {
        const data = res.data;
        if (data.episodes) {
          setEpisodes(data.episodes);
          setTotal(data.total || 0);
          setHasMore(data.episodes.length < (data.total || 0));
        } else if (Array.isArray(data)) {
          setEpisodes(data);
          setTotal(data.length);
          setHasMore(false);
        }
      })
      .catch(() => {
        setEpisodes([]);
        setTotal(0);
        setHasMore(false);
      })
      .finally(() => setLoading(false));
  }, [searchQuery, filters, sortOrder]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.status) params.set('status', filters.status);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.rating) params.set('minRating', filters.rating);
    if (filters.year) params.set('year', filters.year);
    if (sortOrder) params.set('order', sortOrder);
    params.set('page', String(nextPage));
    params.set('limit', '24');

    axios.get(`/api/episodes?${params.toString()}`)
      .then(res => {
        const data = res.data;
        if (data.episodes) {
          setEpisodes(prev => [...prev, ...data.episodes]);
          setTotal(data.total || 0);
          setHasMore(data.episodes.length >= 24);
        }
        setPage(nextPage);
      })
      .catch(() => {
        setHasMore(false);
      })
      .finally(() => setLoadingMore(false));
  }, [page, loadingMore, hasMore, searchQuery, filters, sortOrder]);

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
      const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      setSortOrder(newOrder);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('order', newOrder);
      setSearchParams(newParams);
    } else {
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

  return (
    <div>
      <BannerCarousel
        bannerImages={banners}
        welcomeTitle={welcomeTitle}
        welcomeSubtitle={welcomeSubtitle}
        t={t}
        getLocalizedTitle={getLocalizedTitle}
        getLocalizedSubtitle={getLocalizedSubtitle}
      />
      <EpisodeFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        categories={categories}
        t={t}
        onSortClick={handleSortClick}
        sortOrder={sortOrder}
        getLocalizedName={getLocalizedName}
      />
      <TagCloud />

      {user && continueWatching.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              ▶️ {t('home.continueWatching')}
            </h2>
          </div>
          <div style={{
            display: 'flex',
            gap: '12px',
            overflowX: 'auto',
            paddingBottom: '8px',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
          }}>
            {continueWatching.map(item => {
              const ep = item.episodeId;
              if (!ep) return null;
              return (
                <Link
                  key={item._id}
                  to={`/episode/${ep._id}`}
                  style={{
                    minWidth: '200px',
                    maxWidth: '200px',
                    textDecoration: 'none',
                    color: 'inherit',
                    flexShrink: 0,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={ep.coverImage}
                      alt={ep.title}
                      style={{
                        width: '100%',
                        height: '110px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'var(--hover-bg)',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${ep.totalEpisodes > 0 ? (item.watchedEpisodes.length / ep.totalEpisodes) * 100 : 0}%`,
                        background: 'var(--primary)',
                        borderRadius: '0 2px 2px 0',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {getLocalizedTitle(ep)}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--primary)',
                      marginTop: '4px',
                      fontWeight: 500,
                    }}>
                      {item.lastWatchedEpisodeNumber
                        ? t('home.continueFromEp', { n: item.lastWatchedEpisodeNumber })
                        : t('home.watchedCount', { n: item.watchedEpisodes.length, total: ep.totalEpisodes })
                      }
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {user && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: 'var(--foreground)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🎯 {t('home.guessYouLike')}
            </h2>
          </div>
          {recLoading ? (
            <div style={{
              display: 'flex',
              gap: '12px',
              overflow: 'hidden',
            }}>
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} style={{
                  minWidth: '160px',
                  height: '200px',
                  borderRadius: '8px',
                  background: 'var(--hover-bg)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '8px',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin',
            }}>
              {recommendations.map(rec => (
                <Link
                  key={rec._id}
                  to={`/episode/${rec._id}`}
                  style={{
                    minWidth: '160px',
                    maxWidth: '160px',
                    textDecoration: 'none',
                    color: 'inherit',
                    flexShrink: 0,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={rec.coverImage}
                      alt={rec.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '120px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {rec.averageRating > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.6)',
                        color: '#f59e0b',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        ⭐ {rec.averageRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '8px' }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {getLocalizedTitle(rec)}
                    </div>
                    {rec.reason && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        padding: '1px 8px',
                        borderRadius: '10px',
                        background: 'var(--primary-bg, rgba(99, 102, 241, 0.15))',
                        color: 'var(--primary)',
                        fontSize: '10px',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}>
                        {rec.reason === 'becauseYouFollow'
                          ? t('home.becauseYouFollow', { name: rec.reasonName })
                          : rec.reason === 'popularInCategory'
                            ? t('home.popularInCategory')
                            : t('home.similarUsersLiked')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '24px',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              background: 'var(--hover-bg)',
              borderRadius: '8px',
            }}>
              {t('home.noRecommendations')}
            </div>
          )}
        </div>
      )}

      {!user && (
        <div style={{
          marginBottom: '24px',
          textAlign: 'center',
          padding: '20px',
          background: 'var(--primary-bg, rgba(99, 102, 241, 0.1))',
          borderRadius: '8px',
          border: '1px solid var(--primary-border, rgba(99, 102, 241, 0.2))',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/login')}
        >
          <span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: 500 }}>
            🎯 {t('home.loginForRecommendations')}
          </span>
        </div>
      )}

      {searchQuery && (
        <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          {t('home.searchResult', { query: searchQuery, count: total })}
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
            {searchQuery ? `${t('home.noResults')}` : t('home.noResults')}
          </p>
        </div>
      ) : (
        <div className="episode-grid">
          {episodes.map(episode => (
            <EpisodeCard
              key={episode._id}
              episode={episode}
              t={t}
              getLocalizedTitle={getLocalizedTitle}
              getLocalizedDescription={getLocalizedDescription}
              onTagClick={handleTagClick}
            />
          ))}
        </div>
      )}

      {hasMore && !loading && episodes.length > 0 && (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{
              padding: '10px 32px',
              borderRadius: '8px',
              background: 'var(--btn-gradient)',
              color: 'var(--btn-text)',
              border: 'none',
              cursor: loadingMore ? 'wait' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: loadingMore ? 0.7 : 1,
            }}
          >
            {loadingMore ? t('common.loading') : t('home.loadMore')}
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
