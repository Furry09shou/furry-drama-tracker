import React from 'react';

const statusStyles = {
  pending: { background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' },
  approved: { background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' },
  rejected: { background: 'var(--destructive-bg)', color: 'var(--destructive-text)', border: '1px solid var(--destructive-border)' },
};

const statusLabels = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
};

const ReviewStatusBadge = ({ status, style }) => {
  const s = statusStyles[status] || statusStyles.pending;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
      ...s, ...style
    }}>
      {statusLabels[status] || status}
    </span>
  );
};

export default ReviewStatusBadge;
