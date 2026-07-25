import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const generateColorShades = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const lr = Math.round(r + (255 - r) * 0.3);
  const lg = Math.round(g + (255 - g) * 0.3);
  const lb = Math.round(b + (255 - b) * 0.3);
  const dr = Math.round(r * 0.85);
  const dg = Math.round(g * 0.85);
  const db = Math.round(b * 0.85);
  return {
    primary: hex,
    primaryLight: `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`,
    primaryBg: `rgba(${r}, ${g}, ${b}, 0.15)`,
    primaryBorder: `rgba(${r}, ${g}, ${b}, 0.3)`,
    primaryHover: `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`,
  };
};

export const PRESET_COLORS = [
  '#4f46e5', '#7c3aed', '#be185d', '#dc2626', '#ea580c',
  '#ca8a04', '#15803d', '#0e7490', '#1d4ed8'
];

const themes = {
  dark: {
    '--primary': '#6366f1',
    '--primary-dark': '#4f46e5',
    '--primary-light': '#818cf8',
    '--primary-bg': 'rgba(99, 102, 241, 0.16)',
    '--primary-bg-subtle': 'rgba(99, 102, 241, 0.08)',
    '--primary-bg-strong': 'rgba(99, 102, 241, 0.22)',
    '--primary-border': 'rgba(99, 102, 241, 0.35)',
    '--primary-border-subtle': 'rgba(99, 102, 241, 0.22)',
    '--primary-hover': '#4f46e5',
    '--secondary': '#10b981',
    '--secondary-dark': '#059669',
    '--accent': '#f59e0b',
    '--background': '#070b18',
    '--background-rgb': '7,11,24',
    '--bg-secondary': '#0f1629',
    '--bg-tertiary': '#1a2440',
    '--foreground': '#f1f5f9',
    '--text-secondary': '#94a3b8',
    '--text-tertiary': '#64748b',
    '--text-light': '#e2e8f0',
    '--text-lighter': '#cbd5e1',
    '--card': 'rgba(15, 22, 41, 0.72)',
    '--card-foreground': '#f1f5f9',
    '--popover': 'rgba(15, 22, 41, 0.92)',
    '--popover-foreground': '#f1f5f9',
    '--border': 'rgba(255, 255, 255, 0.08)',
    '--input': 'rgba(255, 255, 255, 0.04)',
    '--ring': '#818cf8',
    '--muted': 'rgba(148, 163, 184, 0.1)',
    '--muted-foreground': '#94a3b8',
    '--destructive': '#ef4444',
    '--destructive-bg': 'rgba(239, 68, 68, 0.16)',
    '--destructive-bg-subtle': 'rgba(239, 68, 68, 0.08)',
    '--destructive-bg-strong': 'rgba(239, 68, 68, 0.22)',
    '--destructive-border': 'rgba(239, 68, 68, 0.35)',
    '--destructive-border-subtle': 'rgba(239, 68, 68, 0.22)',
    '--destructive-text': '#f87171',
    '--destructive-text-light': '#fca5a5',
    '--success': '#22c55e',
    '--success-bg': 'rgba(34, 197, 94, 0.16)',
    '--success-bg-subtle': 'rgba(34, 197, 94, 0.08)',
    '--success-bg-strong': 'rgba(34, 197, 94, 0.22)',
    '--success-border': 'rgba(34, 197, 94, 0.35)',
    '--success-text': '#4ade80',
    '--warning': '#f59e0b',
    '--warning-bg': 'rgba(245, 158, 11, 0.16)',
    '--warning-bg-subtle': 'rgba(245, 158, 11, 0.08)',
    '--warning-bg-strong': 'rgba(245, 158, 11, 0.22)',
    '--warning-border': 'rgba(245, 158, 11, 0.35)',
    '--warning-text': '#fbbf24',
    '--info': '#3b82f6',
    '--info-bg': 'rgba(59, 130, 246, 0.16)',
    '--info-border': 'rgba(59, 130, 246, 0.35)',
    '--info-text': '#60a5fa',
    '--purple': '#a855f7',
    '--purple-bg': 'rgba(168, 85, 247, 0.2)',
    '--purple-border': 'rgba(168, 85, 247, 0.35)',
    '--glass-bg': 'rgba(12, 18, 36, 0.62)',
    '--glass-border': 'rgba(255, 255, 255, 0.09)',
    '--glass-backdrop': 'blur(18px) saturate(160%)',
    '--hover-bg': 'rgba(255, 255, 255, 0.045)',
    '--hover-bg-strong': 'rgba(255, 255, 255, 0.08)',
    '--hover-bg-stronger': 'rgba(255, 255, 255, 0.14)',
    '--shadow-color': 'rgba(0, 0, 0, 0.4)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.6)',
    '--shadow-modal': 'rgba(0, 0, 0, 0.5)',
    '--overlay-bg': 'rgba(2, 6, 18, 0.72)',
    '--overlay-bg-strong': 'rgba(2, 6, 18, 0.85)',
    '--overlay-bg-light': 'rgba(2, 6, 18, 0.5)',
    '--overlay-bg-subtle': 'rgba(2, 6, 18, 0.62)',
    '--gradient-bg1': 'rgba(99, 102, 241, 0.08)',
    '--gradient-bg2': 'rgba(168, 85, 247, 0.05)',
    '--scrollbar-track': 'rgba(255, 255, 255, 0.025)',
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.14)',
    '--scrollbar-thumb-hover': 'rgba(99, 102, 241, 0.5)',
    '--selection-bg': 'rgba(99, 102, 241, 0.32)',
    '--badge-bg': '#ef4444',
    '--badge-text': '#fff',
    '--btn-gradient': '#6366f1',
    '--btn-gradient-primary': '#6366f1',
    '--btn-gradient-success': '#10b981',
    '--btn-gradient-purple': '#8b5cf6',
    '--btn-text': '#fff',
    '--indicator-active': '#fff',
    '--indicator-inactive': 'rgba(255, 255, 255, 0.4)',
    '--banner-overlay': 'rgba(0, 0, 0, 0.7)',
    '--banner-overlay-hover': 'rgba(0, 0, 0, 0.5)',
    '--banner-text': '#fff',
    '--banner-text-secondary': 'rgba(255, 255, 255, 0.8)',
    '--video-bg': '#000',
    '--crop-overlay': 'rgba(0, 0, 0, 0.55)',
    '--crop-border': '#fff',
    '--crop-grid': 'rgba(255, 255, 255, 0.3)',
    '--hover-bg-subtle': 'rgba(255, 255, 255, 0.025)',
    /* 2026 现代化增强 token */
    '--glow-primary': '0 0 32px rgba(99, 102, 241, 0.45)',
    '--glow-primary-strong': '0 0 48px rgba(99, 102, 241, 0.65)',
    '--glow-secondary': '0 0 28px rgba(16, 185, 129, 0.4)',
    '--glow-danger': '0 0 28px rgba(239, 68, 68, 0.4)',
    '--mesh-color-1': 'rgba(99, 102, 241, 0.18)',
    '--mesh-color-2': 'rgba(168, 85, 247, 0.14)',
    '--mesh-color-3': 'rgba(14, 116, 144, 0.12)',
    '--mesh-color-4': 'rgba(236, 72, 153, 0.1)',
    '--noise-opacity': '0.035',
    '--border-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
    '--border-gradient-primary': 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(168,85,247,0.3))',
    '--card-shadow': '0 8px 32px -8px rgba(0, 0, 0, 0.5), 0 2px 8px -4px rgba(0, 0, 0, 0.4)',
    '--card-shadow-hover': '0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 8px 16px -8px rgba(99, 102, 241, 0.25)',
    '--inner-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    '--text-gradient': 'linear-gradient(135deg, #f1f5f9 0%, #c7d2fe 50%, #a5b4fc 100%)',
    '--btn-gradient-hover': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    '--btn-sheen': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.25) 50%, transparent 75%)',
    '--surface-elevated': 'rgba(20, 28, 50, 0.6)',
  },
  light: {
    '--primary': '#4f46e5',
    '--primary-dark': '#4338ca',
    '--primary-light': '#6366f1',
    '--primary-bg': 'rgba(79, 70, 229, 0.1)',
    '--primary-bg-subtle': 'rgba(79, 70, 229, 0.05)',
    '--primary-bg-strong': 'rgba(79, 70, 229, 0.15)',
    '--primary-border': 'rgba(79, 70, 229, 0.25)',
    '--primary-border-subtle': 'rgba(79, 70, 229, 0.15)',
    '--primary-hover': '#4338ca',
    '--secondary': '#10b981',
    '--secondary-dark': '#059669',
    '--accent': '#f59e0b',
    '--background': '#f4f6fb',
    '--background-rgb': '244,246,251',
    '--bg-secondary': '#e8ecf3',
    '--bg-tertiary': '#d4dae6',
    '--foreground': '#0f172a',
    '--text-secondary': '#5b6779',
    '--text-tertiary': '#94a3b8',
    '--text-light': '#334155',
    '--text-lighter': '#475569',
    '--card': 'rgba(255, 255, 255, 0.78)',
    '--card-foreground': '#0f172a',
    '--popover': 'rgba(255, 255, 255, 0.96)',
    '--popover-foreground': '#0f172a',
    '--border': 'rgba(15, 23, 42, 0.08)',
    '--input': 'rgba(15, 23, 42, 0.03)',
    '--ring': '#6366f1',
    '--muted': 'rgba(100, 116, 139, 0.1)',
    '--muted-foreground': '#64748b',
    '--destructive': '#ef4444',
    '--destructive-bg': 'rgba(239, 68, 68, 0.1)',
    '--destructive-bg-subtle': 'rgba(239, 68, 68, 0.05)',
    '--destructive-bg-strong': 'rgba(239, 68, 68, 0.15)',
    '--destructive-border': 'rgba(239, 68, 68, 0.2)',
    '--destructive-border-subtle': 'rgba(239, 68, 68, 0.15)',
    '--destructive-text': '#dc2626',
    '--destructive-text-light': '#ef4444',
    '--success': '#16a34a',
    '--success-bg': 'rgba(34, 197, 94, 0.1)',
    '--success-bg-subtle': 'rgba(34, 197, 94, 0.05)',
    '--success-bg-strong': 'rgba(34, 197, 94, 0.15)',
    '--success-border': 'rgba(34, 197, 94, 0.2)',
    '--success-text': '#16a34a',
    '--warning': '#d97706',
    '--warning-bg': 'rgba(245, 158, 11, 0.1)',
    '--warning-bg-subtle': 'rgba(245, 158, 11, 0.05)',
    '--warning-bg-strong': 'rgba(245, 158, 11, 0.15)',
    '--warning-border': 'rgba(245, 158, 11, 0.2)',
    '--warning-text': '#d97706',
    '--info': '#3b82f6',
    '--info-bg': 'rgba(59, 130, 246, 0.1)',
    '--info-border': 'rgba(59, 130, 246, 0.2)',
    '--info-text': '#2563eb',
    '--purple': '#9333ea',
    '--purple-bg': 'rgba(168, 85, 247, 0.1)',
    '--purple-border': 'rgba(168, 85, 247, 0.2)',
    '--glass-bg': 'rgba(255, 255, 255, 0.68)',
    '--glass-border': 'rgba(255, 255, 255, 0.5)',
    '--glass-backdrop': 'blur(18px) saturate(160%)',
    '--hover-bg': 'rgba(15, 23, 42, 0.04)',
    '--hover-bg-strong': 'rgba(15, 23, 42, 0.06)',
    '--hover-bg-stronger': 'rgba(15, 23, 42, 0.1)',
    '--shadow-color': 'rgba(15, 23, 42, 0.1)',
    '--shadow-strong': 'rgba(15, 23, 42, 0.18)',
    '--shadow-modal': 'rgba(15, 23, 42, 0.18)',
    '--overlay-bg': 'rgba(15, 23, 42, 0.5)',
    '--overlay-bg-strong': 'rgba(15, 23, 42, 0.62)',
    '--overlay-bg-light': 'rgba(15, 23, 42, 0.3)',
    '--overlay-bg-subtle': 'rgba(15, 23, 42, 0.42)',
    '--gradient-bg1': 'rgba(99, 102, 241, 0.06)',
    '--gradient-bg2': 'rgba(168, 85, 247, 0.04)',
    '--scrollbar-track': 'rgba(15, 23, 42, 0.03)',
    '--scrollbar-thumb': 'rgba(15, 23, 42, 0.15)',
    '--scrollbar-thumb-hover': 'rgba(99, 102, 241, 0.45)',
    '--selection-bg': 'rgba(99, 102, 241, 0.2)',
    '--badge-bg': '#ef4444',
    '--badge-text': '#fff',
    '--btn-gradient': '#4f46e5',
    '--btn-gradient-primary': '#4f46e5',
    '--btn-gradient-success': '#10b981',
    '--btn-gradient-purple': '#8b5cf6',
    '--btn-text': '#fff',
    '--indicator-active': '#4f46e5',
    '--indicator-inactive': 'rgba(15, 23, 42, 0.2)',
    '--banner-overlay': 'rgba(0, 0, 0, 0.5)',
    '--banner-overlay-hover': 'rgba(0, 0, 0, 0.3)',
    '--banner-text': '#fff',
    '--banner-text-secondary': 'rgba(255, 255, 255, 0.9)',
    '--video-bg': '#000',
    '--crop-overlay': 'rgba(0, 0, 0, 0.55)',
    '--crop-border': '#fff',
    '--crop-grid': 'rgba(255, 255, 255, 0.3)',
    '--hover-bg-subtle': 'rgba(15, 23, 42, 0.02)',
    /* 2026 现代化增强 token */
    '--glow-primary': '0 0 28px rgba(99, 102, 241, 0.3)',
    '--glow-primary-strong': '0 0 44px rgba(99, 102, 241, 0.5)',
    '--glow-secondary': '0 0 24px rgba(16, 185, 129, 0.3)',
    '--glow-danger': '0 0 24px rgba(239, 68, 68, 0.3)',
    '--mesh-color-1': 'rgba(99, 102, 241, 0.14)',
    '--mesh-color-2': 'rgba(168, 85, 247, 0.1)',
    '--mesh-color-3': 'rgba(14, 116, 144, 0.1)',
    '--mesh-color-4': 'rgba(236, 72, 153, 0.08)',
    '--noise-opacity': '0.025',
    '--border-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.2))',
    '--border-gradient-primary': 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(168,85,247,0.25))',
    '--card-shadow': '0 8px 32px -8px rgba(15, 23, 42, 0.14), 0 2px 8px -4px rgba(15, 23, 42, 0.08)',
    '--card-shadow-hover': '0 24px 48px -12px rgba(15, 23, 42, 0.2), 0 8px 16px -8px rgba(99, 102, 241, 0.18)',
    '--inner-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
    '--text-gradient': 'linear-gradient(135deg, #0f172a 0%, #4338ca 50%, #7c3aed 100%)',
    '--btn-gradient-hover': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    '--btn-sheen': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.4) 50%, transparent 75%)',
    '--surface-elevated': 'rgba(255, 255, 255, 0.65)',
  }
};

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

const applyAccentColor = (hex, currentTheme) => {
  const shades = generateColorShades(hex);
  if (!shades) return;
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const root = document.documentElement;
  const isDark = currentTheme === 'dark';

  root.style.setProperty('--primary', shades.primary);
  root.style.setProperty('--primary-light', shades.primaryLight);
  root.style.setProperty('--primary-dark', shades.primaryHover);
  root.style.setProperty('--primary-hover', shades.primaryHover);
  root.style.setProperty('--primary-bg', isDark ? shades.primaryBg : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
  root.style.setProperty('--primary-bg-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.08 : 0.05})`);
  root.style.setProperty('--primary-bg-strong', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.2 : 0.15})`);
  root.style.setProperty('--primary-border', isDark ? shades.primaryBorder : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
  root.style.setProperty('--primary-border-subtle', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.2 : 0.15})`);
  root.style.setProperty('--ring', hex);
  root.style.setProperty('--selection-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.32 : 0.2})`);
  root.style.setProperty('--gradient-bg1', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.08 : 0.06})`);
  root.style.setProperty('--gradient-bg2', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.05 : 0.04})`);
  root.style.setProperty('--btn-gradient', hex);
  root.style.setProperty('--btn-gradient-primary', hex);
  root.style.setProperty('--btn-gradient-purple', hex);
  /* 同步 2026 增强 token 到当前 accent 色 */
  root.style.setProperty('--glow-primary', `0 0 32px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.45 : 0.3})`);
  root.style.setProperty('--glow-primary-strong', `0 0 48px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.65 : 0.5})`);
  root.style.setProperty('--mesh-color-1', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.18 : 0.14})`);
  root.style.setProperty('--mesh-color-2', `rgba(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 20)}, ${Math.max(0, rgb.b - 20)}, ${isDark ? 0.14 : 0.1})`);
  root.style.setProperty('--border-gradient-primary', `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.5 : 0.4}), rgba(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 20)}, ${Math.max(0, rgb.b - 20)}, ${isDark ? 0.3 : 0.25}))`);
  root.style.setProperty('--scrollbar-thumb-hover', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.5 : 0.45})`);
  root.style.setProperty('--card-shadow-hover', `0 24px 48px -12px ${isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.2)'}, 0 8px 16px -8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.25 : 0.18})`);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'system') return getSystemTheme();
    if (saved === 'light' || saved === 'dark') return saved;
    return getSystemTheme();
  });
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });
  const [accentColor, setAccentColorState] = useState(() => {
    const saved = localStorage.getItem('accent_color');
    if (saved && /^#[0-9a-fA-F]{6}$/.test(saved)) return saved;
    return '#6366f1';
  });

  useEffect(() => {
    const root = document.documentElement;
    const vars = themes[theme];
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(key, value);
    }
    root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    applyAccentColor(accentColor, theme);
  }, [accentColor, theme]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => {
      const modes = ['dark', 'light', 'system'];
      const idx = modes.indexOf(prev);
      const next = modes[(idx + 1) % modes.length];
      localStorage.setItem('theme', next);
      if (next === 'system') {
        setTheme(getSystemTheme());
      } else {
        setTheme(next);
      }
      return next;
    });
  };

  const setAccentColor = (color) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;
    setAccentColorState(color);
    localStorage.setItem('accent_color', color);
  };

  const setThemeModeTo = (mode) => {
    if (!['dark', 'light', 'system'].includes(mode)) return;
    setThemeMode(mode);
    localStorage.setItem('theme', mode);
    if (mode === 'system') {
      setTheme(getSystemTheme());
    } else {
      setTheme(mode);
    }
  };

  const themeIcon = themeMode === 'dark' ? '☀️' : themeMode === 'light' ? '🌙' : '💻';
  const themeTitle = themeMode === 'dark' ? 'Switch to light' : themeMode === 'light' ? 'Follow system' : 'Switch to dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, themeMode, setThemeModeTo, themeIcon, themeTitle, accentColor, setAccentColor, presetColors: PRESET_COLORS }}>
      {children}
    </ThemeContext.Provider>
  );
};
