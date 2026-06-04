import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '../contexts/I18nContext';

const ShareModal = ({ show, onClose, title, episodeId }) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const { t } = useI18n();
  const qrRef = useRef(null);

  const shareUrl = `${window.location.origin}/episode/${episodeId}`;
  const shareText = t('share.title', { title });

  useEffect(() => {
    if (showQR && shareUrl) {
      QRCode.toDataURL(shareUrl, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [showQR, shareUrl]);

  // 重置状态当弹窗关闭
  useEffect(() => {
    if (!show) {
      setShowQR(false);
      setQrDataUrl('');
      setCopied(false);
    }
  }, [show]);

  if (!show) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = shareUrl;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {}
    document.body.removeChild(ta);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ title, text: shareText, url: shareUrl }).catch(() => {});
    }
  };

  const platforms = [
    { name: t('share.wechat'), icon: '💬', color: '#07c160', action: () => setShowQR(true) },
    { name: 'QQ', icon: '🐧', color: '#12b7f5', action: () => setShowQR(true) },
    { name: t('share.weibo'), icon: '📢', color: '#e6162d', url: `https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { name: 'Twitter', icon: '🐦', color: '#1da1f2', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` }
  ];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--overlay-bg)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'var(--card)', borderRadius: '16px', maxWidth: '400px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 25px 50px var(--shadow-strong)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, color: 'var(--foreground)' }}>🔗 {t('share.share')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--foreground)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--foreground)', fontWeight: 600 }}>{title}</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
            <input readOnly value={shareUrl} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--foreground)', fontSize: '13px' }} />
            <button className="btn" style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }} onClick={handleCopy}>{copied ? t('share.copied') : t('share.copy')}</button>
          </div>

          {showQR && (
            <div style={{ textAlign: 'center', marginBottom: '16px', padding: '16px', background: 'var(--hover-bg)', borderRadius: '12px' }}>
              {qrDataUrl ? (
                <>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: '200px', height: '200px', borderRadius: '8px' }} />
                  <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{t('share.scanTip')}</p>
                </>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t('common.loading')}</p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: navigator.share ? '12px' : '0' }}>
            {platforms.map(p => (
              p.url ? (
                <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  textDecoration: 'none', color: 'var(--foreground)', fontSize: '12px'
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{p.icon}</div>
                  {p.name}
                </a>
              ) : (
                <button key={p.name} onClick={p.action} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', fontSize: '12px', padding: 0
                }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{p.icon}</div>
                  {p.name}
                </button>
              )
            ))}
          </div>
          {navigator.share && (
            <button className="btn" style={{ width: '100%', fontSize: '13px' }} onClick={handleNativeShare}>📱 {t('share.systemShare')}</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
