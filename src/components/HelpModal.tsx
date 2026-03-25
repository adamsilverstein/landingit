import React from 'react';

const SHORTCUTS = [
  ['j / ↓', 'Move down'],
  ['k / ↑', 'Move up'],
  ['Enter', 'Open PR in browser'],
  ['m', 'Toggle mine only / everyone'],
  ['f', 'Cycle filter (all / failing / needs-review)'],
  ['s', 'Cycle sort (updated / created / repo / status)'],
  ['r', 'Refresh data'],
  ['c', 'Configure repos'],
  ['t', 'Cycle theme (dark / light / system)'],
  ['?', 'Toggle this help'],
];

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard Shortcuts</h2>
        <table className="shortcut-table">
          <tbody>
            {SHORTCUTS.map(([key, desc]) => (
              <tr key={key}>
                <td>
                  <kbd>{key}</kbd>
                </td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="modal-hint">
          Press <kbd>?</kbd> or <kbd>Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
