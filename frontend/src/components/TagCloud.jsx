import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const TagCloud = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
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
        {tags.map(tag => (
          <span
            key={tag.name}
            onClick={() => navigate(`/?tag=${encodeURIComponent(tag.name)}`)}
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '999px',
              background: 'var(--primary-bg)',
              color: 'var(--primary)',
              fontSize: `${getFontSize(tag.count)}px`,
              opacity: getOpacity(tag.count),
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
              e.currentTarget.style.background = 'var(--primary-bg)';
              e.currentTarget.style.color = 'var(--primary)';
              e.currentTarget.style.opacity = String(getOpacity(tag.count));
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default TagCloud;
