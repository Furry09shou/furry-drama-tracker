import React from 'react';

const skeletonKeyframes = `
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

const styleInjected = typeof document !== 'undefined' && (() => {
  if (!document.getElementById('skeleton-styles')) {
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = skeletonKeyframes;
    document.head.appendChild(style);
  }
  return true;
})();

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', count = 1 }) => {
  const baseStyle = {
    width,
    height,
    borderRadius,
    background: 'linear-gradient(90deg, var(--hover-bg) 25%, var(--hover-bg-strong) 50%, var(--hover-bg) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
  };

  if (count === 1) {
    return <div style={baseStyle} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={baseStyle} />
      ))}
    </div>
  );
};

export const EpisodeCardSkeleton = () => (
  <div style={{
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    overflow: 'hidden',
  }}>
    <Skeleton width="100%" height="0" borderRadius="0" style={{ aspectRatio: '2/3' }} />
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Skeleton width="80%" height="18px" />
      <Skeleton width="100%" height="14px" />
      <Skeleton width="60%" height="14px" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <Skeleton width="40%" height="12px" />
        <Skeleton width="30%" height="12px" />
      </div>
    </div>
  </div>
);

// 修复：给Skeleton添加style支持
const SkeletonWithStyle = ({ width, height, borderRadius, style }) => (
  <div style={{
    width: width || '100%',
    height: height || '20px',
    borderRadius: borderRadius || '8px',
    background: 'linear-gradient(90deg, var(--hover-bg) 25%, var(--hover-bg-strong) 50%, var(--hover-bg) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
    ...style,
  }} />
);

export const EpisodeCardSkeletonFixed = () => (
  <div style={{
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '12px',
    overflow: 'hidden',
  }}>
    <SkeletonWithStyle width="100%" borderRadius="0" style={{ aspectRatio: '2/3' }} />
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Skeleton width="80%" height="18px" />
      <Skeleton width="100%" height="14px" />
      <Skeleton width="60%" height="14px" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <Skeleton width="40%" height="12px" />
        <Skeleton width="30%" height="12px" />
      </div>
    </div>
  </div>
);

export const ListSkeleton = ({ count = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px', background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)', borderRadius: '12px',
      }}>
        <Skeleton width="60px" height="60px" borderRadius="8px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="60%" height="16px" />
          <Skeleton width="40%" height="12px" />
          <Skeleton width="80%" height="12px" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;
