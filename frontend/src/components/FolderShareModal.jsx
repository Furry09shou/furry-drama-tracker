import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import QRCode from 'qrcode';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import API from '../utils/apiEndpoints';

const FolderShareModal = ({ show, onClose, folder }) => {
  const [shareToken, setShareToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();
  const { getAuthHeaders } = useAuth();
  const dialogRef = useRef(null);

  const shareUrl = shareToken ? `${window.location.origin}/shared-folder/${shareToken}` : '';
  const shareText = shareToken ? t('share.folderShareText', { name: folder?.name }) : '';

  useEffect(() => {
    if (!show) {
      setShareToken(null);
      setShowQR(false);
      setQrDataUrl('');
      setCopied(false);
      setLoading(false);
      dialogRef.current?.close();
    } else {
      dialogRef.current?.showModal();
      generateShareLink();
    }
  }, [show]);

  useEffect(() => {
    if (showQR && shareUrl) {
      QRCode.toDataURL(shareUrl, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    }
  }, [showQR, shareUrl]);

  const generateShareLink = async () => {
    if (!folder) return;
    setLoading(true);
    try {
      const endpoint = folder.isUnclassified
        ? `${API.FOLDERS}/share-unclassified`
        : `${API.FOLDERS}/${folder._id}/share`;
      const res = await axios.post(endpoint, {}, getAuthHeaders());
      setShareToken(res.data.shareToken);
    } catch (err) {
      console.error('Failed to generate share link:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => fallbackCopy());
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
      navigator.share({ title: folder?.name, text: shareText, url: shareUrl }).catch(() => {});
    }
  };

  const handleWechatShare = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const weixinUrl = `weixin://dl/business/?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`;
      window.location.href = weixinUrl;
      setTimeout(() => setShowQR(true), 500);
    } else {
      setShowQR(true);
    }
  };

  const handleQQShare = () => {
    const qqShareUrl = `https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`;
    window.open(qqShareUrl, '_blank', 'width=600,height=500');
  };

  const platforms = [
    { name: t('share.wechat'), icon: '💬', color: '#07c160', action: handleWechatShare },
    { name: 'QQ', icon: '🐧', color: '#12b7f5', action: handleQQShare },
    { name: t('share.weibo'), icon: '📢', color: '#e6162d', url: `https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) handleClose(); }}
      style={{
        border: 'none', borderRadius: '16px', padding: 0,
        maxWidth: '400px', width: '90%',
        background: 'var(--card)', color: 'var(--foreground)',
        boxShadow: '0 25px 50px var(--shadow-strong)',
        margin: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0 }}>🔗 {t('share.shareFolder')}</h3>
        <button onClick={handleClose} style={{ background: 'none', border: 'none', color: 'var(--foreground)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ padding: '20px 24px' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>📂 {folder?.name}</p>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>{t('common.loading')}</p>
        ) : shareUrl ? (
          <>
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
                  <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'var(--foreground)', fontSize: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{p.icon}</div>
                    {p.name}
                  </a>
                ) : (
                  <button key={p.name} onClick={p.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)', fontSize: '12px', padding: 0 }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{p.icon}</div>
                    {p.name}
                  </button>
                )
              ))}
            </div>
            {navigator.share && (
              <button className="btn" style={{ width: '100%', fontSize: '13px' }} onClick={handleNativeShare}>📱 {t('share.systemShare')}</button>
            )}
          </>
        ) : (
          <p style={{ color: 'var(--destructive-text)', fontSize: '13px', textAlign: 'center' }}>{t('share.shareFailed')}</p>
        )}
      </div>
    </dialog>
  );
};

export default FolderShareModal;
