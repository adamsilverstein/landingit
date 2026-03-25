import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpModal } from '../components/HelpModal.js';

const EXPECTED_SHORTCUTS = [
  'j / ↓',
  'k / ↑',
  'Enter',
  '/',
  'Esc',
  'm',
  't',
  'f',
  's',
  'r',
  'c',
  'T',
  '?',
];

describe('HelpModal', () => {
  it('renders the heading', () => {
    render(<HelpModal onClose={() => {}} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('renders all keyboard shortcuts', () => {
    render(<HelpModal onClose={() => {}} />);
    for (const shortcut of EXPECTED_SHORTCUTS) {
      const matches = screen.getAllByText(shortcut);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders descriptions for shortcuts', () => {
    render(<HelpModal onClose={() => {}} />);
    expect(screen.getByText('Move down')).toBeInTheDocument();
    expect(screen.getByText('Move up')).toBeInTheDocument();
    expect(screen.getByText('Open item in browser')).toBeInTheDocument();
    expect(screen.getByText('Toggle mine only / everyone')).toBeInTheDocument();
    expect(screen.getByText('Refresh data (resets auto-refresh timer)')).toBeInTheDocument();
    expect(screen.getByText('Configure repos')).toBeInTheDocument();
    expect(screen.getByText('Toggle this help')).toBeInTheDocument();
  });

  it('calls onClose when the overlay is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<HelpModal onClose={onClose} />);
    await userEvent.click(container.querySelector('.modal-overlay')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when the modal content is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<HelpModal onClose={onClose} />);
    await userEvent.click(container.querySelector('.modal')!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
