import React, { useState } from 'react';

const ShareModal = ({ show, onClose, title, episodeId }) => {
  const [copied, setCopied] = useState(false);

  if (!show) return null;

  const shareUrl = `${window.location.origin}/episode/${episodeId}`;
  const shareText = `推荐《${title}》- 兽剧聚合平台`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: shareText, url: shareUrl }).catch(() => {});
    }
  };

  const platforms = [
    { name: '微信', icon: '💬', color: '#07c160', url: `https://cli.im/api/qrcode/text?text=${encodeURIComponent(shareUrl)}` },
    { name: '微博', icon: '📢', color: '#e6162d', url: `https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'QQ', icon: '🐧', color: '#12b7f5', url: `https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'Twitter', icon: '🐦', color: '#1da1f2', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: '16px', maxWidth: '400px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 25px 50px var(--shadow-strong)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, color: 'var(--foreground)' }}>🔗 分享</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--foreground)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--foreground)', fontWeight: 600 }}>{title}</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <input readOnly value={shareUrl} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px' }} />
            <button className="btn" style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }} onClick={handleCopy}>{copied ? '✓ 已复制' : '复制'}</button>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: navigator.share ? '12px' : '0' }}>
            {platforms.map(p => (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                textDecoration: 'none', color: 'var(--foreground)', fontSize: '12px'
              }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{p.icon}</div>
                {p.name}
              </a>
            ))}
          </div>
          {navigator.share && (
            <button className="btn" style={{ width: '100%', fontSize: '13px' }} onClick={handleNativeShare}>📱 系统分享</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
