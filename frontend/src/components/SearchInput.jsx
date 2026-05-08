import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const SearchInput = ({ data, searchKey, placeholder, onSelect, onSearch, displayRender, style }) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  useEffect(() => {
    if (showSuggestions) {
      updatePosition();
    }
  }, [showSuggestions, updatePosition]);

  useEffect(() => {
    if (!showSuggestions) return;

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showSuggestions, updatePosition]);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered([]);
      if (onSearch) onSearch('');
      return;
    }
    const keyword = query.toLowerCase();
    const results = data.filter(item => {
      const keys = Array.isArray(searchKey) ? searchKey : [searchKey];
      return keys.some(key => {
        const val = key.split('.').reduce((o, k) => o?.[k], item);
        return val && String(val).toLowerCase().includes(keyword);
      });
    });
    setFiltered(results);
    if (onSearch) onSearch(query);
  }, [query, data, searchKey]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        const dropdown = document.getElementById('search-suggestions-dropdown');
        if (!dropdown || !dropdown.contains(e.target)) {
          setShowSuggestions(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    const keys = Array.isArray(searchKey) ? searchKey : [searchKey];
    const val = keys[0].split('.').reduce((o, k) => o?.[k], item);
    setQuery(String(val || ''));
    if (onSelect) {
      onSelect(item);
    }
    setShowSuggestions(false);
  };

  const defaultDisplayRender = (item) => {
    const keys = Array.isArray(searchKey) ? searchKey : [searchKey];
    return keys.map(key => key.split('.').reduce((o, k) => o?.[k], item)).filter(Boolean).join(' - ');
  };

  const renderDisplay = displayRender || defaultDisplayRender;

  return (
    <div ref={wrapperRef} style={{position: 'relative', ...style}}>
      <div style={{position: 'relative'}}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { if (query.trim()) setShowSuggestions(true); }}
          placeholder={placeholder || '搜索...'}
          style={{
            width: '100%',
            padding: '10px 16px 10px 40px',
            background: 'var(--input)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--foreground)',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.3s ease',
            boxSizing: 'border-box'
          }}
        />
        <span style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-secondary)', fontSize: '16px', pointerEvents: 'none'
        }}>
          🔍
        </span>
        {query && (
          <span
            onClick={() => { setQuery(''); setShowSuggestions(false); }}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-secondary)', fontSize: '16px', cursor: 'pointer'
            }}
          >
            ✕
          </span>
        )}
      </div>
      {showSuggestions && filtered.length > 0 && createPortal(
        <div
          id="search-suggestions-dropdown"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            maxHeight: '240px',
            overflowY: 'auto',
            zIndex: 2000,
            boxShadow: '0 10px 25px -5px var(--shadow-modal)'
          }}
        >
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(item)}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                color: 'var(--foreground)',
                fontSize: '14px',
                borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--primary-bg-subtle)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {renderDisplay(item)}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchInput;
