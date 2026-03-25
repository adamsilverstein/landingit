import React from 'react';
import type { CIStatus } from '../types.js';

const STATUS_MAP: Record<CIStatus, { className: string; label: string }> = {
  success: { className: 'ci-success', label: 'Passing' },
  failure: { className: 'ci-failure', label: 'Failing' },
  pending: { className: 'ci-pending', label: 'Pending' },
  mixed: { className: 'ci-mixed', label: 'Mixed' },
  none: { className: 'ci-none', label: 'None' },
};

export function CIBadge({ status }: { status: CIStatus }) {
  const { className, label } = STATUS_MAP[status];
  return (
    <span className={`ci-badge ${className}`} title={label}>
      <span className="ci-dot" />
    </span>
  );
}
