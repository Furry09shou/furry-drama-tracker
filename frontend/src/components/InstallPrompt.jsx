import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

const DISMISSED_KEY = 'pwa-install-dismissed';

export default function InstallPrompt() {
  const { t } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [neverRemind, setNeverRemind] = useState(false);

  useEffect(() => {
    // "不再提醒" 永久关闭
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

    // 检查全局是否已捕获 beforeinstallprompt（可能在 React 挂载前就已触发）
    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
      setShow(true);
    }

    // 监听后续的 pwa-install-available 自定义事件
    const handleAvailable = () => {
      if (window.__pwaDeferredPrompt) {
        setDeferredPrompt(window.__pwaDeferredPrompt);
        setShow(true);
      }
    };

    window.addEventListener('pwa-install-available', handleAvailable);

    return () => {
      window.removeEventListener('pwa-install-available', handleAvailable);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    window.__pwaDeferredPrompt = null;
    if (outcome === 'accepted') {
      setShow(false);
    }
  };

  // 关闭：如果勾选了不再提醒则永久关闭，否则仅隐藏当前提示（刷新页面会重新弹出）
  const handleClose = () => {
    if (neverRemind) {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="pwa-prompt-wrapper">
      <div className="pwa-prompt-card">
        <span className="pwa-prompt-icon">📲</span>
        <div className="pwa-prompt-text">
          <div className="pwa-prompt-title">{t('pwa.install')}</div>
          <div className="pwa-prompt-desc">{t('pwa.installDesc')}</div>
        </div>
        <div className="pwa-prompt-actions">
          <div className="pwa-prompt-buttons">
            <button className="pwa-prompt-btn-install" onClick={handleInstall}>
              {t('pwa.installBtn')}
            </button>
            <button className="pwa-prompt-btn-close" onClick={handleClose}>
              {t('pwa.close')}
            </button>
          </div>
          <label className="pwa-prompt-never">
            <input
              type="checkbox"
              checked={neverRemind}
              onChange={(e) => setNeverRemind(e.target.checked)}
            />
            {t('pwa.neverRemind')}
          </label>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }

        /* === wrapper === */
        .pwa-prompt-wrapper {
          position: fixed;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9998;
          animation: slideUp 0.3s ease;
          width: calc(100vw - 16px);
          max-width: 380px;
        }

        /* === card === */
        .pwa-prompt-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          background: var(--card);
          border: 1px solid var(--border);
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
          line-height: 1;
        }

        /* === icon === */
        .pwa-prompt-icon { font-size: 24px; flex-shrink: 0; line-height: 1; }

        /* === text === */
        .pwa-prompt-text { flex: 1; min-width: 0; }
        .pwa-prompt-title {
          font-weight: 600; font-size: 13px;
          color: var(--foreground); line-height: 1.3;
        }
        .pwa-prompt-desc {
          font-size: 11px; color: var(--text-secondary);
          margin-top: 1px; line-height: 1.35;
        }

        /* === actions === */
        .pwa-prompt-actions {
          display: flex; flex-direction: column;
          gap: 4px; flex-shrink: 0;
        }
        .pwa-prompt-buttons { display: flex; gap: 6px; }

        .pwa-prompt-btn-install {
          padding: 5px 12px; border-radius: 6px; border: none;
          background: var(--primary); color: #fff;
          font-size: 11px; font-weight: 600; line-height: 1.2;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
          -webkit-appearance: none; appearance: none;
          box-sizing: border-box; min-height: 0;
        }
        .pwa-prompt-btn-install:hover { opacity: 0.9; }

        .pwa-prompt-btn-close {
          padding: 5px 12px; border-radius: 6px;
          border: 1px solid var(--border); background: transparent;
          color: var(--text-secondary); font-size: 11px; line-height: 1.2;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
          -webkit-appearance: none; appearance: none;
          box-sizing: border-box; min-height: 0;
        }
        .pwa-prompt-btn-close:hover {
          border-color: var(--primary); color: var(--primary);
        }

        .pwa-prompt-never {
          display: flex; align-items: center; gap: 4px;
          font-size: 10px; color: var(--text-tertiary);
          cursor: pointer; user-select: none;
        }
        .pwa-prompt-never input {
          margin: 0; cursor: pointer; accent-color: var(--primary);
          width: 12px; height: 12px;
        }

        /* === ≤768px：平板及大屏手机，适度缩小 === */
        @media (max-width: 768px) {
          .pwa-prompt-wrapper { bottom: 10px; width: calc(100vw - 12px); max-width: 340px; }
          .pwa-prompt-card { padding: 6px 12px; gap: 7px; border-radius: 10px; }
          .pwa-prompt-icon { font-size: 20px; }
          .pwa-prompt-title { font-size: 12px; line-height: 1; }
          .pwa-prompt-desc { font-size: 10px; line-height: 1; margin-top: 0; }
          .pwa-prompt-btn-install,
          .pwa-prompt-btn-close { padding: 1px 10px; font-size: 10px; line-height: 1; }
          .pwa-prompt-actions { gap: 2px; }
          .pwa-prompt-never { font-size: 9px; line-height: 1; }
        }

        /* === ≤480px：手机，紧凑显示 === */
        @media (max-width: 480px) {
          .pwa-prompt-wrapper { bottom: 8px; width: calc(100vw - 10px); max-width: 320px; }
          .pwa-prompt-card { padding: 5px 10px; gap: 6px; border-radius: 9px; }
          .pwa-prompt-icon { font-size: 18px; }
          .pwa-prompt-title { font-size: 11px; line-height: 1; }
          .pwa-prompt-desc { font-size: 10px; line-height: 1; margin-top: 0; }
          .pwa-prompt-btn-install,
          .pwa-prompt-btn-close { padding: 1px 9px; font-size: 10px; line-height: 1; }
          .pwa-prompt-actions { gap: 2px; }
          .pwa-prompt-never { font-size: 9px; line-height: 1; }
          .pwa-prompt-never input { width: 10px; height: 10px; }
        }

        /* === ≤360px：极小屏，最紧凑 === */
        @media (max-width: 360px) {
          .pwa-prompt-wrapper { bottom: 6px; width: calc(100vw - 8px); max-width: 300px; }
          .pwa-prompt-card { padding: 4px 8px; gap: 5px; border-radius: 8px; }
          .pwa-prompt-icon { font-size: 16px; }
          .pwa-prompt-title { font-size: 11px; line-height: 1; }
          .pwa-prompt-desc { font-size: 9px; line-height: 1; }
          .pwa-prompt-btn-install,
          .pwa-prompt-btn-close { padding: 0 8px; font-size: 9px; line-height: 1; border-radius: 5px; }
          .pwa-prompt-actions { gap: 1px; }
          .pwa-prompt-never { font-size: 8px; line-height: 1; }
        }
      `}</style>
    </div>
  );
}
