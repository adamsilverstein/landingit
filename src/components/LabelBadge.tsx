import React from 'react';
import type { LabelInfo } from '../types.js';
import { contrastColor } from '../../shared/utils/contrastColor.js';

interface LabelBadgeProps {
  label: LabelInfo;
}

export function LabelBadge({ label }: LabelBadgeProps) {
  const bg = `#${label.color}`;
  const fg = contrastColor(label.color);

  return (
    <span
      className="label-badge"
      style={{ backgroundColor: bg, color: fg }}
      title={label.description ?? label.name}
    >
      {label.name}
    </span>
  );
}
