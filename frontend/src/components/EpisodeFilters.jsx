import React from 'react';
import SearchInput from './SearchInput';

const RATING_OPTIONS = [
  { value: '', labelKey: 'common.all' },
  { value: '4', label: '4+' },
  { value: '3', label: '3+' },
  { value: '2', label: '2+' },
  { value: '1', label: '1+' },
];

const YEAR_OPTIONS = (() => {
  const currentYear = new Date().getFullYear();
  const options = [{ value: '', labelKey: 'common.all' }, { value: 'recent5', labelKey: 'home.yearRecent5' }];
  for (let y = currentYear; y >= currentYear - 10; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  return options;
})();

const capsuleBtnStyle = (active) => ({
  padding: '6px 16px',
  borderRadius: '20px',
  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
  background: active ? 'var(--primary)' : 'var(--input)',
  color: active ? '#fff' : 'var(--foreground)',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  whiteSpace: 'nowrap',
  fontWeight: active ? 600 : 400,
  outline: 'none',
});

const filterRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  alignItems: 'center',
  marginBottom: '12px',
};

const filterLabelStyle = {
  fontSize: '13px',
  color: 'var(--text-secondary)',
  fontWeight: 500,
  minWidth: '48px',
  flexShrink: 0,
};

const EpisodeFilters = React.memo(({ filters, onFilterChange, categories, t, onSortClick, sortOrder, getLocalizedName }) => {
  const STATUS_OPTIONS = [
    { value: '', label: t('common.all') },
    { value: 'ongoing', label: t('home.statusOngoing') },
    { value: 'completed', label: t('home.statusCompleted') },
    { value: 'upcoming', label: t('home.statusUpcoming') },
  ];

  const SORT_OPTIONS = [
    { value: 'latest', label: t('home.sortLatest') },
    { value: 'views', label: t('home.sortViews') },
    { value: 'premiere', label: t('home.sortPremiere') },
    { value: 'rating', label: t('home.sortRating') },
  ];

  return (
    <div className="filter-section">
      <div style={{ marginBottom: '16px' }}>
        <SearchInput />
      </div>

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>{t('home.category')}</span>
        <button
          style={capsuleBtnStyle(filters.category === '')}
          onClick={() => onFilterChange('category', '')}
        >
          {t('common.all')}
        </button>
        {categories.map(c => {
          const name = c.name || c;
          return (
            <button
              key={c._id || name}
              style={capsuleBtnStyle(filters.category === name)}
              onClick={() => onFilterChange('category', name)}
            >
              {getLocalizedName(c) || name}
            </button>
          );
        })}
      </div>

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>{t('home.status')}</span>
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={capsuleBtnStyle(filters.status === opt.value)}
            onClick={() => onFilterChange('status', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>{t('home.rating')}</span>
        {RATING_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={capsuleBtnStyle(filters.rating === opt.value)}
            onClick={() => onFilterChange('rating', opt.value)}
          >
            {opt.labelKey ? t(opt.labelKey) : opt.label}
          </button>
        ))}
      </div>

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>{t('home.year')}</span>
        {YEAR_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={capsuleBtnStyle(filters.year === opt.value)}
            onClick={() => onFilterChange('year', opt.value)}
          >
            {opt.labelKey ? t(opt.labelKey) : opt.label}
          </button>
        ))}
      </div>

      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>{t('home.sort')}</span>
        {SORT_OPTIONS.map(opt => {
          const isActive = filters.sort === opt.value;
          return (
            <button
              key={opt.value}
              style={{
                ...capsuleBtnStyle(isActive),
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => onSortClick(opt.value)}
            >
              {opt.label}
              {isActive && (
                <span style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  lineHeight: 1,
                  gap: '0px',
                  marginLeft: '2px',
                }}>
                  <span style={{ fontSize: '10px', opacity: sortOrder === 'asc' ? 1 : 0.3, transition: 'opacity 0.2s' }}>▲</span>
                  <span style={{ fontSize: '10px', opacity: sortOrder === 'desc' ? 1 : 0.3, transition: 'opacity 0.2s', marginTop: '-2px' }}>▼</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default EpisodeFilters;
