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
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6'
];

const themes = {
  dark: {
    '--primary': '#6366f1',
    '--primary-dark': '#4f46e5',
    '--primary-light': '#818cf8',
    '--primary-bg': 'rgba(99, 102, 241, 0.15)',
    '--primary-bg-subtle': 'rgba(99, 102, 241, 0.08)',
    '--primary-bg-strong': 'rgba(99, 102, 241, 0.2)',
    '--primary-border': 'rgba(99, 102, 241, 0.3)',
    '--primary-border-subtle': 'rgba(99, 102, 241, 0.2)',
    '--primary-hover': '#4f46e5',
    '--secondary': '#10b981',
    '--secondary-dark': '#059669',
    '--accent': '#f59e0b',
    '--background': '#0f172a',
    '--bg-secondary': '#1e293b',
    '--bg-tertiary': '#334155',
    '--foreground': '#f1f5f9',
    '--text-secondary': '#94a3b8',
    '--text-tertiary': '#64748b',
    '--text-light': '#e2e8f0',
    '--text-lighter': '#cbd5e1',
    '--card': 'rgba(15, 23, 42, 0.8)',
    '--card-foreground': '#f1f5f9',
    '--popover': 'rgba(15, 23, 42, 0.9)',
    '--popover-foreground': '#f1f5f9',
    '--border': 'rgba(255, 255, 255, 0.1)',
    '--input': 'rgba(255, 255, 255, 0.05)',
    '--ring': '#6366f1',
    '--muted': 'rgba(148, 163, 184, 0.1)',
    '--muted-foreground': '#94a3b8',
    '--destructive': '#ef4444',
    '--destructive-bg': 'rgba(239, 68, 68, 0.15)',
    '--destructive-bg-subtle': 'rgba(239, 68, 68, 0.08)',
    '--destructive-bg-strong': 'rgba(239, 68, 68, 0.2)',
    '--destructive-border': 'rgba(239, 68, 68, 0.3)',
    '--destructive-border-subtle': 'rgba(239, 68, 68, 0.2)',
    '--destructive-text': '#ef4444',
    '--destructive-text-light': '#f87171',
    '--success': '#22c55e',
    '--success-bg': 'rgba(34, 197, 94, 0.15)',
    '--success-bg-subtle': 'rgba(34, 197, 94, 0.08)',
    '--success-bg-strong': 'rgba(34, 197, 94, 0.2)',
    '--success-border': 'rgba(34, 197, 94, 0.3)',
    '--success-text': '#22c55e',
    '--warning': '#f59e0b',
    '--warning-bg': 'rgba(245, 158, 11, 0.15)',
    '--warning-bg-subtle': 'rgba(245, 158, 11, 0.08)',
    '--warning-bg-strong': 'rgba(245, 158, 11, 0.2)',
    '--warning-border': 'rgba(245, 158, 11, 0.3)',
    '--warning-text': '#f59e0b',
    '--info': '#3b82f6',
    '--info-bg': 'rgba(59, 130, 246, 0.15)',
    '--info-border': 'rgba(59, 130, 246, 0.3)',
    '--info-text': '#60a5fa',
    '--purple': '#a855f7',
    '--purple-bg': 'rgba(168, 85, 247, 0.2)',
    '--purple-border': 'rgba(168, 85, 247, 0.3)',
    '--glass-bg': 'rgba(15, 23, 42, 0.7)',
    '--glass-border': 'rgba(255, 255, 255, 0.1)',
    '--glass-backdrop': 'blur(10px)',
    '--hover-bg': 'rgba(255, 255, 255, 0.05)',
    '--hover-bg-strong': 'rgba(255, 255, 255, 0.08)',
    '--hover-bg-stronger': 'rgba(255, 255, 255, 0.15)',
    '--shadow-color': 'rgba(0, 0, 0, 0.3)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.5)',
    '--shadow-modal': 'rgba(0, 0, 0, 0.3)',
    '--overlay-bg': 'rgba(0, 0, 0, 0.7)',
    '--overlay-bg-strong': 'rgba(0, 0, 0, 0.8)',
    '--overlay-bg-light': 'rgba(0, 0, 0, 0.5)',
    '--overlay-bg-subtle': 'rgba(0, 0, 0, 0.6)',
    '--gradient-bg1': 'rgba(99, 102, 241, 0.1)',
    '--gradient-bg2': 'rgba(16, 185, 129, 0.1)',
    '--scrollbar-track': 'rgba(255, 255, 255, 0.03)',
    '--scrollbar-thumb': 'rgba(255, 255, 255, 0.15)',
    '--scrollbar-thumb-hover': 'rgba(255, 255, 255, 0.25)',
    '--selection-bg': 'rgba(99, 102, 241, 0.3)',
    '--badge-bg': '#ef4444',
    '--badge-text': '#fff',
    '--btn-gradient': 'linear-gradient(135deg, #6366f1, #10b981)',
    '--btn-gradient-primary': 'linear-gradient(135deg, #6366f1, #4f46e5)',
    '--btn-gradient-success': 'linear-gradient(135deg, #10b981, #059669)',
    '--btn-gradient-purple': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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
    '--hover-bg-subtle': 'rgba(255, 255, 255, 0.03)',
  },
  light: {
    '--primary': '#6366f1',
    '--primary-dark': '#4f46e5',
    '--primary-light': '#4f46e5',
    '--primary-bg': 'rgba(99, 102, 241, 0.1)',
    '--primary-bg-subtle': 'rgba(99, 102, 241, 0.05)',
    '--primary-bg-strong': 'rgba(99, 102, 241, 0.15)',
    '--primary-border': 'rgba(99, 102, 241, 0.25)',
    '--primary-border-subtle': 'rgba(99, 102, 241, 0.15)',
    '--primary-hover': '#4f46e5',
    '--secondary': '#10b981',
    '--secondary-dark': '#059669',
    '--accent': '#f59e0b',
    '--background': '#f0f4f8',
    '--bg-secondary': '#e2e8f0',
    '--bg-tertiary': '#cbd5e1',
    '--foreground': '#1e293b',
    '--text-secondary': '#64748b',
    '--text-tertiary': '#94a3b8',
    '--text-light': '#334155',
    '--text-lighter': '#475569',
    '--card': 'rgba(255, 255, 255, 0.85)',
    '--card-foreground': '#1e293b',
    '--popover': 'rgba(255, 255, 255, 0.95)',
    '--popover-foreground': '#1e293b',
    '--border': 'rgba(0, 0, 0, 0.08)',
    '--input': 'rgba(0, 0, 0, 0.04)',
    '--ring': '#6366f1',
    '--muted': 'rgba(100, 116, 139, 0.1)',
    '--muted-foreground': '#64748b',
    '--destructive': '#ef4444',
    '--destructive-bg': 'rgba(239, 68, 68, 0.1)',
    '--destructive-bg-subtle': 'rgba(239, 68, 68, 0.05)',
    '--destructive-bg-strong': 'rgba(239, 68, 68, 0.15)',
    '--destructive-border': 'rgba(239, 68, 68, 0.2)',
    '--destructive-border-subtle': 'rgba(239, 68, 68, 0.15)',
    '--destructive-text': '#ef4444',
    '--destructive-text-light': '#dc2626',
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
    '--glass-bg': 'rgba(255, 255, 255, 0.7)',
    '--glass-border': 'rgba(0, 0, 0, 0.08)',
    '--glass-backdrop': 'blur(10px)',
    '--hover-bg': 'rgba(0, 0, 0, 0.04)',
    '--hover-bg-strong': 'rgba(0, 0, 0, 0.06)',
    '--hover-bg-stronger': 'rgba(0, 0, 0, 0.1)',
    '--shadow-color': 'rgba(0, 0, 0, 0.08)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.12)',
    '--shadow-modal': 'rgba(0, 0, 0, 0.15)',
    '--overlay-bg': 'rgba(0, 0, 0, 0.5)',
    '--overlay-bg-strong': 'rgba(0, 0, 0, 0.6)',
    '--overlay-bg-light': 'rgba(0, 0, 0, 0.3)',
    '--overlay-bg-subtle': 'rgba(0, 0, 0, 0.4)',
    '--gradient-bg1': 'rgba(99, 102, 241, 0.06)',
    '--gradient-bg2': 'rgba(16, 185, 129, 0.06)',
    '--scrollbar-track': 'rgba(0, 0, 0, 0.03)',
    '--scrollbar-thumb': 'rgba(0, 0, 0, 0.15)',
    '--scrollbar-thumb-hover': 'rgba(0, 0, 0, 0.25)',
    '--selection-bg': 'rgba(99, 102, 241, 0.2)',
    '--badge-bg': '#ef4444',
    '--badge-text': '#fff',
    '--btn-gradient': 'linear-gradient(135deg, #6366f1, #10b981)',
    '--btn-gradient-primary': 'linear-gradient(135deg, #6366f1, #4f46e5)',
    '--btn-gradient-success': 'linear-gradient(135deg, #10b981, #059669)',
    '--btn-gradient-purple': 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    '--btn-text': '#fff',
    '--indicator-active': '#6366f1',
    '--indicator-inactive': 'rgba(0, 0, 0, 0.2)',
    '--banner-overlay': 'rgba(0, 0, 0, 0.5)',
    '--banner-overlay-hover': 'rgba(0, 0, 0, 0.3)',
    '--banner-text': '#fff',
    '--banner-text-secondary': 'rgba(255, 255, 255, 0.9)',
    '--video-bg': '#000',
    '--crop-overlay': 'rgba(0, 0, 0, 0.55)',
    '--crop-border': '#fff',
    '--crop-grid': 'rgba(255, 255, 255, 0.3)',
    '--hover-bg-subtle': 'rgba(0, 0, 0, 0.02)',
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
  root.style.setProperty('--selection-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.3 : 0.2})`);
  root.style.setProperty('--gradient-bg1', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isDark ? 0.1 : 0.06})`);
  root.style.setProperty('--btn-gradient', `linear-gradient(135deg, ${hex}, #10b981)`);
  root.style.setProperty('--btn-gradient-primary', `linear-gradient(135deg, ${hex}, ${shades.primaryHover})`);
  root.style.setProperty('--btn-gradient-purple', `linear-gradient(135deg, ${hex}, #8b5cf6)`);
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
