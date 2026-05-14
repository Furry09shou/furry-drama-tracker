import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SearchInput = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    axios.get(`/api/episodes/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`)
      .then(res => {
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.episodes || data.results || []);
        setSuggestions(list.slice(0, 10));
        setShowSuggestions(list.length > 0);
        setActiveIndex(-1);
      })
      .catch(() => {
        setSuggestions([]);
      });
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((episode) => {
    navigate(`/episode/${episode._id}`);
    setQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
  }, [navigate]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        navigate(`/?search=${encodeURIComponent(query.trim())}`);
        setShowSuggestions(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => prev < suggestions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => prev > 0 ? prev - 1 : suggestions.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else if (query.trim()) {
        navigate(`/?search=${encodeURIComponent(query.trim())}`);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
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

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="搜索剧集..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim()) {
            setShowSuggestions(true);
          }
        }}
        onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%', padding: '10px 16px', borderRadius: '10px',
          border: '1px solid var(--border)', background: 'var(--input)',
          color: 'var(--foreground)', fontSize: '14px', outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s'
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
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '10px', marginTop: '4px', maxHeight: '360px',
          overflowY: 'auto', zIndex: 1000, boxShadow: '0 8px 32px var(--shadow-modal)'
        }}>
          {suggestions.map((episode, index) => (
            <div
              key={episode._id}
              onClick={() => handleSelect(episode)}
              onMouseEnter={() => setActiveIndex(index)}
              style={{
                padding: '10px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                background: index === activeIndex ? 'var(--hover-bg)' : 'transparent',
                transition: 'background 0.15s',
                borderBottom: index < suggestions.length - 1 ? '1px solid var(--border)' : 'none'
              }}
            >
              {episode.coverImage && (
                <img src={episode.coverImage} alt="" style={{
                  width: '36px', height: '48px', borderRadius: '4px',
                  objectFit: 'cover', flexShrink: 0
                }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {highlightText(episode.title || '', query)}
                </div>
                {episode.category && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{episode.category}</span>
                )}
              </div>
              {episode.rating && (
                <span style={{ fontSize: '12px', color: 'var(--warning-text)', flexShrink: 0 }}>⭐ {episode.rating?.average?.toFixed(1) || episode.rating}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
