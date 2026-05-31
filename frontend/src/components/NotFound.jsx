import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';

const NotFound = () => {
  const { t } = useI18n();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', textAlign: 'center'
    }}>
      <div style={{ fontSize: '120px', lineHeight: 1, marginBottom: '20px' }}>🔍</div>
      <h1 style={{
        fontSize: '48px', fontWeight: 700, margin: '0 0 12px 0',
        background: 'var(--btn-gradient)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
      }}>404</h1>
      <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
        {t('notFound.description')}
      </p>
      <Link to="/" style={{
        padding: '12px 32px', borderRadius: '10px',
        background: 'var(--btn-gradient)',
        color: 'var(--btn-text)', textDecoration: 'none', fontWeight: 600,
        fontSize: '16px', transition: 'transform 0.2s, box-shadow 0.2s'
      }}>
        {t('notFound.goHome')}
      </Link>
    </div>
  );
};

export default NotFound;
