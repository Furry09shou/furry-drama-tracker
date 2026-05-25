import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';

const SiteSettingsContext = createContext(null);

const CACHE_KEY = 'site_settings_cache';
const CACHE_TTL = 5 * 60 * 1000;

const loadCachedSettings = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) return data;
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

const saveCachedSettings = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
};

export const SiteSettingsProvider = ({ children }) => {
  const cached = loadCachedSettings();
  const [settings, setSettings] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);
  const fetchedRef = useRef(false);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/site-content/settings', { skipRedirect: true });
      if (res.data?.content) {
        const data = JSON.parse(res.data.content);
        setSettings(data);
        saveCachedSettings(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (cached) {
      fetchSettings();
    } else {
      fetchSettings();
    }
  }, []);

  const refreshSettings = () => {
    fetchedRef.current = false;
    setLoading(true);
    fetchSettings();
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) return { settings: null, loading: true, refreshSettings: () => {} };
  return ctx;
};

export default SiteSettingsContext;
