import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import useTranslation from '../hooks/useTranslation';

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 10;

const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
};

const addHistory = (term) => {
  const trimmed = term.trim();
  if (!trimmed) return;
  let history = getHistory().filter(h => h !== trimmed);
  history.unshift(trimmed);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

const EpisodeSearch = ({ value, onChange, totalCount, filteredCount }) => {
  const { t } = useI18n();
  const { getLocalizedTitle } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState({ titles: [], tags: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [history, setHistory] = useState(getHistory());
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!query.trim()) {
      setSuggestions({ titles: [], tags: [] });
      return;
    }
    debounceTimer.current = setTimeout(() => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      axios.get(`/api/episodes/search-suggestions?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal
      })
        .then(res => {
          setSuggestions(res.data || { titles: [], tags: [] });
          setShowDropdown(true);
          setActiveIndex(-1);
        })
        .catch((err) => {
          if (axios.isCancel(err) || err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
          setSuggestions({ titles: [], tags: [] });
        });
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((searchTerm) => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    addHistory(trimmed);
    setHistory(getHistory());
    onChange(trimmed);
    navigate(`/?search=${encodeURIComponent(trimmed)}`);
    setShowDropdown(false);
  }, [onChange, navigate]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (val.trim()) {
      setShowDropdown(true);
    }
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    const totalItems = suggestions.titles.length + suggestions.tags.length;
    const hasHistory = !query.trim() && history.length > 0;

    if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        if (activeIndex < suggestions.titles.length) {
          const title = suggestions.titles[activeIndex];
          handleSearch(title.title || title.titleEn);
        } else {
          const tagIdx = activeIndex - suggestions.titles.length;
          const tag = suggestions.tags[tagIdx];
          if (tag) {
            addHistory(tag);
            setHistory(getHistory());
            navigate(`/?tag=${encodeURIComponent(tag)}`);
            setShowDropdown(false);
          }
        }
      } else if (query.trim()) {
        handleSearch(query);
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showDropdown) {
        setShowDropdown(true);
        return;
      }
      const maxIdx = hasHistory ? history.length - 1 : totalItems - 1;
      if (maxIdx < 0) return;
      if (e.key === 'ArrowDown') {
        setActiveIndex(prev => prev < maxIdx ? prev + 1 : 0);
      } else {
        setActiveIndex(prev => prev > 0 ? prev - 1 : maxIdx);
      }
    }
  };

  const handleFocus = () => {
    setShowDropdown(true);
    setHistory(getHistory());
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ background: 'var(--primary-bg)', color: 'var(--primary)', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
      ) : part
    );
  };

  const hasSuggestions = suggestions.titles.length > 0 || suggestions.tags.length > 0;
  const showHistory = !query.trim() && history.length > 0;

  return (
    <div className="episode-search" style={{ marginBottom: '20px' }}>
      <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('home.searchPlaceholder')}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', padding: '10px 16px', borderRadius: '10px',
            border: '1px solid var(--border)', background: 'var(--input)',
            color: 'var(--foreground)', fontSize: '14px', outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxSizing: 'border-box'
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.boxShadow = '0 0 0 3px var(--primary-bg)';
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {showDropdown && (hasSuggestions || showHistory) && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: '10px', marginTop: '4px', maxHeight: '360px',
            overflowY: 'auto', zIndex: 1000, boxShadow: '0 8px 32px var(--shadow-modal)'
          }}>
            {showHistory && (
              <div>
                <div style={{
                  padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)',
                  fontWeight: 600, display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', borderBottom: '1px solid var(--border)'
                }}>
                  <span>{t('search.history')}</span>
                  <button
                    onClick={handleClearHistory}
                    style={{
                      background: 'none', border: 'none', color: 'var(--primary)',
                      cursor: 'pointer', fontSize: '12px', padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = 'var(--hover-bg)'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'none'; }}
                  >
                    {t('search.clearHistory')}
                  </button>
                </div>
                {history.map((item, index) => (
                  <div
                    key={`history-${index}`}
                    onClick={() => handleSearch(item)}
                    onMouseEnter={() => setActiveIndex(index)}
                    style={{
                      padding: '10px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: index === activeIndex ? 'var(--hover-bg)' : 'transparent',
                      transition: 'background 0.15s',
                      borderBottom: index < history.length - 1 ? '1px solid var(--border)' : 'none'
                    }}
                  >
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>🕐</span>
                    <span style={{ fontSize: '14px', color: 'var(--foreground)' }}>{item}</span>
                  </div>
                ))}
              </div>
            )}
            {!showHistory && hasSuggestions && (
              <div>
                {suggestions.titles.length > 0 && (
                  <div>
                    <div style={{
                      padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)',
                      fontWeight: 600, borderBottom: '1px solid var(--border)'
                    }}>
                      {t('search.suggestions')}
                    </div>
                    {suggestions.titles.map((title, index) => (
                      <div
                        key={`title-${index}`}
                        onClick={() => handleSearch(title.title || title.titleEn)}
                        onMouseEnter={() => setActiveIndex(index)}
                        style={{
                          padding: '10px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          background: index === activeIndex ? 'var(--hover-bg)' : 'transparent',
                          transition: 'background 0.15s',
                          borderBottom: index < suggestions.titles.length - 1 || suggestions.tags.length > 0 ? '1px solid var(--border)' : 'none'
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>📺</span>
                        <span style={{ fontSize: '14px', color: 'var(--foreground)' }}>
                          {highlightText(title.title || title.titleEn, query)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {suggestions.tags.length > 0 && (
                  <div>
                    <div style={{
                      padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)',
                      fontWeight: 600, borderBottom: '1px solid var(--border)'
                    }}>
                      🏷️ Tags
                    </div>
                    {suggestions.tags.map((tag, index) => {
                      const globalIdx = suggestions.titles.length + index;
                      return (
                        <div
                          key={`tag-${index}`}
                          onClick={() => {
                            addHistory(tag);
                            setHistory(getHistory());
                            navigate(`/?tag=${encodeURIComponent(tag)}`);
                            setShowDropdown(false);
                          }}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          style={{
                            padding: '10px 16px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: globalIdx === activeIndex ? 'var(--hover-bg)' : 'transparent',
                            transition: 'background 0.15s',
                            borderBottom: index < suggestions.tags.length - 1 ? '1px solid var(--border)' : 'none'
                          }}
                        >
                          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>🏷️</span>
                          <span style={{ fontSize: '14px', color: 'var(--primary)' }}>
                            {highlightText(tag, query)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!showHistory && !hasSuggestions && query.trim() && (
              <div style={{
                padding: '20px 16px', textAlign: 'center',
                color: 'var(--text-secondary)', fontSize: '14px'
              }}>
                {t('search.noResults')}
              </div>
            )}
          </div>
        )}
      </div>
      {filteredCount !== totalCount && (
        <div style={{
          marginTop: '8px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          {t('episodeSearch.showingResults', { filteredCount, totalCount })}
        </div>
      )}
    </div>
  );
};

export default EpisodeSearch;
