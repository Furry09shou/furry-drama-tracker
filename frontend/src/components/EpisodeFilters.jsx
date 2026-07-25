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
  const options = [{ value: '', labelKey: 'common.all' }];
  for (let y = currentYear; y >= 2016; y--) {
    options.push({ value: String(y), label: String(y) });
  }
  options.push({ value: 'earlier', labelKey: 'home.yearEarlier' });
  return options;
})();

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
    <div className="filter-section ef">
      <div className="ef-search">
        <SearchInput />
      </div>

      <div className="ef-row">
        <span className="ef-label">{t('home.category')}</span>
        <button
          className={`ef-pill ${filters.category === '' ? 'ef-pill--active' : ''}`}
          onClick={() => onFilterChange('category', '')}
        >
          {t('common.all')}
        </button>
        {categories.map(c => {
          const name = c.name || c;
          return (
            <button
              key={c._id || name}
              className={`ef-pill ${filters.category === name ? 'ef-pill--active' : ''}`}
              onClick={() => onFilterChange('category', name)}
            >
              {getLocalizedName(c) || name}
            </button>
          );
        })}
      </div>

      <div className="ef-row">
        <span className="ef-label">{t('home.status')}</span>
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`ef-pill ${filters.status === opt.value ? 'ef-pill--active' : ''}`}
            onClick={() => onFilterChange('status', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="ef-row">
        <span className="ef-label">{t('home.rating')}</span>
        {RATING_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`ef-pill ${filters.rating === opt.value ? 'ef-pill--active' : ''}`}
            onClick={() => onFilterChange('rating', opt.value)}
          >
            {opt.labelKey ? t(opt.labelKey) : opt.label}
          </button>
        ))}
      </div>

      <div className="ef-row">
        <span className="ef-label">{t('home.year')}</span>
        {YEAR_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`ef-pill ${filters.year === opt.value ? 'ef-pill--active' : ''}`}
            onClick={() => onFilterChange('year', opt.value)}
          >
            {opt.labelKey ? t(opt.labelKey) : opt.label}
          </button>
        ))}
      </div>

      <div className="ef-row">
        <span className="ef-label">{t('home.sort')}</span>
        {SORT_OPTIONS.map(opt => {
          const isActive = filters.sort === opt.value;
          return (
            <button
              key={opt.value}
              className={`ef-pill ef-pill--sort ${isActive ? 'ef-pill--active' : ''}`}
              onClick={() => onSortClick(opt.value)}
            >
              {opt.label}
              {isActive && (
                <span className="ef-sort-arrow">
                  <span style={{ opacity: sortOrder === 'asc' ? 1 : 0.3 }}>▲</span>
                  <span style={{ opacity: sortOrder === 'desc' ? 1 : 0.3 }}>▼</span>
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
