import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeColorPicker = () => {
  const { accentColor, setAccentColor, presetColors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={pickerRef} style={{
      position: 'fixed', bottom: '20px', left: '20px', zIndex: 50
    }}>
      {isOpen && (
        <div style={{
          position: 'absolute', bottom: '48px', left: 0,
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-backdrop)',
          border: '1px solid var(--glass-border)', borderRadius: '12px',
          padding: '16px', width: 'min(220px, calc(100vw - 40px))',
          boxShadow: '0 8px 32px var(--shadow-modal)',
          display: 'flex', flexDirection: 'column', gap: '12px'
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--foreground)' }}>
            Theme Color
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px'
          }}>
            {presetColors.map(color => (
              <button
                key={color}
                onClick={() => { setAccentColor(color); }}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: color,
                  border: accentColor === color ? '2px solid var(--foreground)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s',
                  outline: 'none', padding: 0, boxShadow: accentColor === color ? `0 0 0 2px var(--background), 0 0 0 4px ${color}` : 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
            ))}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            borderTop: '1px solid var(--border)', paddingTop: '12px'
          }}>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              style={{
                width: '28px', height: '28px', border: 'none',
                borderRadius: '6px', cursor: 'pointer', padding: 0,
                background: 'transparent'
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custom</span>
            <span style={{
              fontSize: '11px', color: 'var(--text-tertiary)',
              fontFamily: 'monospace', marginLeft: 'auto'
            }}>{accentColor}</span>
          </div>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'var(--glass-bg)', backdropFilter: 'var(--glass-backdrop)',
          border: '1px solid var(--glass-border)',
          cursor: 'pointer', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s', opacity: 0.6,
          color: 'var(--foreground)', padding: 0
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
      >
        🎨
      </button>
    </div>
  );
};

export default ThemeColorPicker;
