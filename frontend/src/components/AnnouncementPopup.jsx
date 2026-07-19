import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, Wrench, Sparkles, X } from 'lucide-react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const STORAGE_KEY = 'fdt_dismissed_announcements';

const getDismissed = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const markDismissed = (id) => {
  try {
    const list = getDismissed();
    if (!list.includes(id)) {
      list.push(id);
      // 只保留最近 50 条，避免无限增长
      const trimmed = list.slice(-50);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch {}
};

const typeIcon = { info: Megaphone, warning: AlertTriangle, maintenance: Wrench, update: Sparkles };
const typeColor = {
  info: 'var(--primary)',
  warning: 'var(--warning-text, #f59e0b)',
  maintenance: 'var(--warning-text, #f59e0b)',
  update: 'var(--success-text, #10b981)'
};

const AnnouncementPopup = () => {
  const { t, lang } = useI18n();
  const [announcements, setAnnouncements] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    axios.get('/api/announcements/active?channel=popup', { signal: controller.signal })
      .then(res => {
        const dismissed = getDismissed();
        const visible = (res.data || []).filter(a => !dismissed.includes(a._id));
        if (visible.length > 0) {
          setAnnouncements(visible);
          setCurrentIdx(0);
          setOpen(true);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!open || announcements.length === 0) return null;
  const current = announcements[currentIdx];
  if (!current) return null;

  const title = lang === 'en' ? (current.titleEn || current.title) : current.title;
  const content = lang === 'en' ? (current.contentEn || current.content) : current.content;
  const accent = typeColor[current.type] || typeColor.info;
  const IconComp = typeIcon[current.type] || Megaphone;

  const handleDismiss = (dontShowAgain) => {
    if (dontShowAgain || !current.dismissible) {
      markDismissed(current._id);
    }
    if (currentIdx + 1 < announcements.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setOpen(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => { if (current.dismissible) handleDismiss(false); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.55)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: '16px',
          maxWidth: '520px', width: '100%', maxHeight: '85vh', overflow: 'auto',
          border: `1px solid ${accent}`, boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ color: accent }} aria-hidden="true"><IconComp size={24} strokeWidth={2} /></span>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--foreground)', flex: 1 }}>{title}</h3>
          {current.dismissible && (
            <button
              onClick={() => handleDismiss(false)}
              aria-label={t('common.close')}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', padding: '4px', lineHeight: 1, display: 'inline-flex', alignItems: 'center'
              }}
            ><X size={20} strokeWidth={2} /></button>
          )}
        </div>
        <div style={{ padding: '18px 24px' }}>
          <div style={{
            whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '14px',
            color: 'var(--foreground)', maxHeight: '50vh', overflowY: 'auto'
          }}>{content}</div>
          {current.link && (
            <a
              href={current.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', marginTop: '16px', padding: '8px 18px',
                background: accent, color: '#fff', textDecoration: 'none',
                borderRadius: '8px', fontSize: '13px', fontWeight: 600
              }}
            >{t('announcement.viewDetails')}</a>
          )}
        </div>
        <div style={{
          padding: '12px 24px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
        }}>
          {announcements.length > 1 && (
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {t('announcement.remainingCount', { current: currentIdx + 1, total: announcements.length })}
            </span>
          )}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            {current.dismissible && (
              <button
                onClick={() => handleDismiss(true)}
                style={{
                  background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                  padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                }}
              >{t('announcement.dontShowAgain')}</button>
            )}
            <button
              onClick={() => handleDismiss(false)}
              style={{
                background: 'var(--primary)', border: 'none', color: '#fff',
                padding: '7px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
              }}
            >{t('announcement.gotIt')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
