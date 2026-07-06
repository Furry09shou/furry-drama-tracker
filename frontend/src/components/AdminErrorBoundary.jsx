import React from 'react';
import I18nContext from '../contexts/I18nContext';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Admin panel error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const t = this.context?.t || ((k) => k);
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', padding: '24px',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: 'var(--foreground)', marginBottom: '8px' }}>{t('admin.errorTitle')}</h2>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            {this.state.error?.message || t('admin.unknownError')}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: '8px 24px', borderRadius: '8px',
              background: 'var(--btn-gradient)', color: 'var(--btn-text)',
              border: 'none', cursor: 'pointer', fontSize: '14px'
            }}
          >
            {t('common.refreshPage')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

AdminErrorBoundary.contextType = I18nContext;

export default AdminErrorBoundary;
