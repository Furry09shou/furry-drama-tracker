import React from 'react';
import { useI18n } from '../contexts/I18nContext';

const statusStyles = {
  pending: { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' },
  approved: { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' },
  rejected: { background: 'var(--destructive-bg)', color: 'var(--destructive-text)', border: '1px solid var(--destructive-border)' },
};

const statusLabelKeys = {
  pending: 'adminReview.pending',
  approved: 'adminReview.approved',
  rejected: 'adminReview.rejected',
};

const ReviewStatusBadge = ({ status, style }) => {
  const { t } = useI18n();
  const s = statusStyles[status] || statusStyles.pending;
  const labelKey = statusLabelKeys[status];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
      ...s, ...style
    }}>
      {labelKey ? t(labelKey) : status}
    </span>
  );
};

export default ReviewStatusBadge;
