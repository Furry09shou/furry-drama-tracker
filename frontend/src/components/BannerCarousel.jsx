import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BannerCarousel = React.memo(({ bannerImages, welcomeTitle, welcomeSubtitle, t, getLocalizedTitle, getLocalizedSubtitle }) => {
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerTimerRef = useRef(null);
  const welcomeTimerRef = useRef(null);

  useEffect(() => {
    if (bannerImages.length === 0) return;
    welcomeTimerRef.current = setTimeout(() => {
      setShowWelcome(false);
    }, 3000);
    return () => {
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, [bannerImages.length]);

  useEffect(() => {
    if (showWelcome || bannerImages.length <= 1) return;
    bannerTimerRef.current = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % bannerImages.length);
    }, 4000);
    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [showWelcome, bannerImages.length]);

  const handleBannerPrev = () => {
    if (bannerImages.length <= 1) return;
    setBannerIndex(prev => (prev - 1 + bannerImages.length) % bannerImages.length);
  };

  const handleBannerNext = () => {
    if (bannerImages.length <= 1) return;
    setBannerIndex(prev => (prev + 1) % bannerImages.length);
  };

  const handleBannerIndicator = (idx) => {
    setBannerIndex(idx);
  };

  if (bannerImages.length === 0) {
    return (
      <div style={{
        position: 'relative',
        marginBottom: '24px',
        borderRadius: '16px',
        overflow: 'hidden',
        aspectRatio: '3/1',
        maxHeight: '300px',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
        color: '#fff',
        textAlign: 'center',
        padding: '0 24px',
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 700,
          margin: 0,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {welcomeTitle}
        </h2>
        <p style={{
          fontSize: '1rem',
          marginTop: '8px',
          opacity: 0.9,
        }}>
          {welcomeSubtitle}
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
        textAlign: 'center',
        padding: '0 24px',
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: 700,
          margin: 0,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {welcomeTitle}
        </h2>
        <p style={{
          fontSize: '1rem',
          marginTop: '8px',
          opacity: 0.9,
        }}>
          {welcomeSubtitle}
        </p>
      </div>

      {bannerImages.map((banner, idx) => {
        const prevIdx = (bannerIndex - 1 + bannerImages.length) % bannerImages.length;
        const nextIdx = (bannerIndex + 1) % bannerImages.length;
        if (idx !== bannerIndex && idx !== prevIdx && idx !== nextIdx) return null;
        return (
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
                {getLocalizedTitle(banner)}
              </h3>
              {banner.subtitle && (
                <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>
                  {getLocalizedSubtitle(banner)}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {!showWelcome && bannerImages.length > 1 && (
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

      {!showWelcome && bannerImages.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          gap: '8px',
        }}>
          {bannerImages.map((_, idx) => (
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
});

export default BannerCarousel;
