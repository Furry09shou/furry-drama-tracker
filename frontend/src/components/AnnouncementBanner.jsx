import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const STORAGE_KEY = 'fdt_dismissed_banners';

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-50)));
    }
  } catch {}
};

const typeIcon = { info: '📢', warning: '⚠️', maintenance: '🔧', update: '✨' };
const typeBg = {
  info: 'var(--primary-bg, #eef2ff)',
  warning: 'var(--warning-bg, #fef3c7)',
  maintenance: 'var(--warning-bg, #fef3c7)',
  update: 'var(--success-bg, #d1fae5)'
};
const typeAccent = {
  info: 'var(--primary, #6366f1)',
  warning: 'var(--warning-text, #f59e0b)',
  maintenance: 'var(--warning-text, #f59e0b)',
  update: 'var(--success-text, #10b981)'
};

const AnnouncementBanner = () => {
  const { t, lang } = useI18n();
  const [announcements, setAnnouncements] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    axios.get('/api/announcements/active?channel=banner', { signal: controller.signal })
      .then(res => {
        const dismissed = getDismissed();
        const visible = (res.data || []).filter(a => !dismissed.includes(a._id));
        setAnnouncements(visible);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (announcements.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {announcements.map(a => {
        const title = lang === 'en' ? (a.titleEn || a.title) : a.title;
        const content = lang === 'en' ? (a.contentEn || a.content) : a.content;
        const isExpanded = expandedId === a._id;
        const accent = typeAccent[a.type] || typeAccent.info;
        return (
          <div
            key={a._id}
            style={{
              background: typeBg[a.type] || typeBg.info,
              borderBottom: '1px solid var(--border)',
              fontSize: '13px'
            }}
          >
            <div style={{
              maxWidth: '1200px', margin: '0 auto', padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <span aria-hidden="true" style={{ fontSize: '15px', flexShrink: 0 }}>{typeIcon[a.type] || '📢'}</span>
              <span
                onClick={() => a.content && setExpandedId(isExpanded ? null : a._id)}
                style={{
                  flex: 1, minWidth: 0, cursor: a.content ? 'pointer' : 'default',
                  color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontWeight: 600
                }}
                role={a.content ? 'button' : undefined}
                tabIndex={a.content ? 0 : undefined}
                onKeyDown={(e) => { if (a.content && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpandedId(isExpanded ? null : a._id); } }}
                aria-expanded={isExpanded}
              >
                <span style={{ color: accent, marginRight: '6px', fontWeight: 700 }}>{title}</span>
                {a.content && !isExpanded && (
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                    {content.length > 60 ? content.slice(0, 60) + '…' : content}
                  </span>
                )}
                {a.content && (
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', marginLeft: '6px' }}>
                    {isExpanded ? t('announcement.collapse') : t('announcement.expand')}
                  </span>
                )}
              </span>
              {a.link && (
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: accent, textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                    flexShrink: 0, whiteSpace: 'nowrap'
                  }}
                >{t('announcement.viewDetails')} →</a>
              )}
              <button
                onClick={() => {
                  markDismissed(a._id);
                  setAnnouncements(prev => prev.filter(x => x._id !== a._id));
                }}
                aria-label={t('common.close')}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)',
                  cursor: 'pointer', padding: '0 4px', fontSize: '16px', lineHeight: 1, flexShrink: 0
                }}
              >✕</button>
            </div>
            {isExpanded && a.content && (
              <div style={{
                maxWidth: '1200px', margin: '0 auto', padding: '4px 16px 12px 42px',
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6
              }}>{content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
