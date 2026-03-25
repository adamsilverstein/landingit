import React, { useState } from 'react';
import type { RepoConfig } from '../types.js';

interface RepoManagerProps {
  repos: RepoConfig[];
  onToggle: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: (owner: string, name: string) => void;
  onClose: () => void;
}

export function RepoManager({
  repos,
  onToggle,
  onRemove,
  onAdd,
  onClose,
}: RepoManagerProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    const parts = trimmed.split('/');
    if (parts.length === 2 && parts[0] && parts[1]) {
      onAdd(parts[0], parts[1]);
      setInput('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Manage Repositories</h2>

        {repos.length === 0 ? (
          <p className="empty-hint">No repos configured yet. Add one below.</p>
        ) : (
          <ul className="repo-list">
            {repos.map((repo, i) => (
              <li key={`${repo.owner}/${repo.name}`} className="repo-item">
                <label className="repo-toggle">
                  <input
                    type="checkbox"
                    checked={repo.enabled}
                    onChange={() => onToggle(i)}
                  />
                  <span className={repo.enabled ? '' : 'repo-disabled'}>
                    {repo.owner}/{repo.name}
                  </span>
                </label>
                <button
                  className="repo-delete"
                  onClick={() => onRemove(i)}
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="repo-add-form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="owner/repo"
            className="repo-input"
            autoFocus
          />
          <button type="submit" className="repo-add-btn">
            Add
          </button>
        </form>

        <p className="modal-hint">
          Press <kbd>Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
