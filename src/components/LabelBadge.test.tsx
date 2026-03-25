import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LabelBadge } from '../components/LabelBadge.js';
import type { LabelInfo } from '../types.js';

describe('LabelBadge', () => {
  it('renders the label name', () => {
    const label: LabelInfo = { name: 'bug', color: 'ff0000' };
    render(<LabelBadge label={label} />);
    expect(screen.getByText('bug')).toBeInTheDocument();
  });

  it('applies background color from label', () => {
    const label: LabelInfo = { name: 'enhancement', color: '00ff00' };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.querySelector('.label-badge') as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(0, 255, 0)');
  });

  it('uses dark text for light backgrounds', () => {
    const label: LabelInfo = { name: 'light', color: 'ffffff' };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.querySelector('.label-badge') as HTMLElement;
    expect(badge.style.color).toBe('rgb(0, 0, 0)');
  });

  it('uses light text for dark backgrounds', () => {
    const label: LabelInfo = { name: 'dark', color: '000000' };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.querySelector('.label-badge') as HTMLElement;
    expect(badge.style.color).toBe('rgb(255, 255, 255)');
  });

  it('falls back to white text for invalid hex colors', () => {
    const label: LabelInfo = { name: 'invalid', color: 'zzzzzz' };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.querySelector('.label-badge') as HTMLElement;
    expect(badge.style.color).toBe('rgb(255, 255, 255)');
  });

  it('falls back to white text for empty color strings', () => {
    const label: LabelInfo = { name: 'empty', color: '' };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.querySelector('.label-badge') as HTMLElement;
    expect(badge.style.color).toBe('rgb(255, 255, 255)');
  });

  it('shows description as title when available', () => {
    const label: LabelInfo = { name: 'bug', color: 'ff0000', description: 'Something is broken' };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.querySelector('.label-badge') as HTMLElement;
    expect(badge.title).toBe('Something is broken');
  });

  it('shows name as title when no description', () => {
    const label: LabelInfo = { name: 'bug', color: 'ff0000' };
    const { container } = render(<LabelBadge label={label} />);
    const badge = container.querySelector('.label-badge') as HTMLElement;
    expect(badge.title).toBe('bug');
  });
});
