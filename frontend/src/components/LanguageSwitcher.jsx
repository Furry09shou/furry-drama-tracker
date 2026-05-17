import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

const LanguageSwitcher = ({ style = {} }) => {
  const { lang, switchLang, supportedLanguages } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = supportedLanguages.find(l => l.code === lang) || supportedLanguages[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'var(--hover-bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: 'var(--foreground)',
          transition: 'all 0.2s',
        }}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden',
          minWidth: '140px',
        }}>
          {supportedLanguages.map(l => (
            <button
              key={l.code}
              onClick={() => { switchLang(l.code); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 14px',
                background: l.code === lang ? 'var(--primary-bg)' : 'transparent',
                color: l.code === lang ? 'var(--primary)' : 'var(--foreground)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: l.code === lang ? 600 : 400,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                if (l.code !== lang) e.currentTarget.style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                if (l.code !== lang) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === lang && <span style={{ marginLeft: 'auto', fontSize: '12px' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
