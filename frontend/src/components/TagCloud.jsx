import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useI18n } from '../contexts/I18nContext';

const TagCloud = ({ selectedTag, onTagClick }) => {
  const { t } = useI18n();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/episodes/popular-tags')
      .then(res => {
        setTags(res.data || []);
      })
      .catch(() => {
        setTags([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || tags.length === 0) return null;

  const maxCount = Math.max(...tags.map(t => t.count), 1);
  const minCount = Math.min(...tags.map(t => t.count), 1);

  const getFontSize = (count) => {
    const range = maxCount - minCount || 1;
    const ratio = (count - minCount) / range;
    return 12 + ratio * 14;
  };

  const getOpacity = (count) => {
    const range = maxCount - minCount || 1;
    const ratio = (count - minCount) / range;
    return 0.6 + ratio * 0.4;
  };

  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-backdrop)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '20px',
      border: '1px solid var(--border)'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--foreground)',
        marginBottom: '12px'
      }}>
        {t('search.popularTags')}
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center'
      }}>
        {tags.map(tag => {
          const isSelected = selectedTag === tag.name;
          return (
            <span
              key={tag.name}
              role="button"
              tabIndex={0}
              onClick={() => onTagClick && onTagClick(tag.name)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onTagClick) {
                  e.preventDefault();
                  onTagClick(tag.name);
                }
              }}
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '999px',
                background: isSelected ? 'var(--primary)' : 'var(--primary-bg)',
                color: isSelected ? '#fff' : 'var(--primary)',
                fontSize: `${getFontSize(tag.count)}px`,
                opacity: isSelected ? '1' : getOpacity(tag.count),
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid var(--primary-border)',
                fontWeight: 500,
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary)';
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-modal)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isSelected ? 'var(--primary)' : 'var(--primary-bg)';
                e.currentTarget.style.color = isSelected ? '#fff' : 'var(--primary)';
                e.currentTarget.style.opacity = String(isSelected ? '1' : getOpacity(tag.count));
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isSelected ? '✓ ' : ''}{tag.name}
            </span>
          );
        })}
        {selectedTag && (
          <span
            role="button"
            tabIndex={0}
            onClick={() => onTagClick && onTagClick(selectedTag)}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && onTagClick) {
                e.preventDefault();
                onTagClick(selectedTag);
              }
            }}
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'var(--hover-bg)',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '1px solid var(--border)',
              fontWeight: 500,
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--destructive)';
              e.currentTarget.style.borderColor = 'var(--destructive)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            ✕ {t('common.cancel')}
          </span>
        )}
      </div>
    </div>
  );
};

export default TagCloud;
