import React, { useMemo, useState } from 'react';
import type {
  NotificationItem,
  NotificationRule,
  RuleCondition,
  RuleField,
  RuleOp,
} from '../../shared/types.js';
import {
  BUILTIN_PRESETS,
  notificationsMatchingRule,
} from '../../shared/hooks/useNotificationRules.js';

interface NotificationRulesEditorProps {
  rules: NotificationRule[];
  notifications: NotificationItem[];
  onClose: () => void;
  onAdd: (input: Omit<NotificationRule, 'id' | 'createdAt'>) => NotificationRule;
  onUpdate: (
    id: string,
    patch: Partial<Omit<NotificationRule, 'id' | 'createdAt'>>
  ) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onApplyRule: (rule: NotificationRule) => Promise<unknown>;
}

const FIELD_OPTIONS: ReadonlyArray<{ value: RuleField; label: string }> = [
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author (login)' },
  { value: 'repo', label: 'Repo (owner/name)' },
  { value: 'reason', label: 'Reason' },
  { value: 'subjectType', label: 'Subject type' },
];

const OP_OPTIONS: ReadonlyArray<{ value: RuleOp; label: string }> = [
  { value: 'startsWith', label: 'starts with' },
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'regex', label: 'matches regex' },
];

function emptyRule(): Omit<NotificationRule, 'id' | 'createdAt'> {
  return {
    name: '',
    enabled: true,
    autoApply: false,
    conditions: [{ field: 'title', op: 'startsWith', value: '' }],
    action: 'mark-read',
  };
}

export function NotificationRulesEditor({
  rules,
  notifications,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
  onApplyRule,
}: NotificationRulesEditorProps) {
  const [draft, setDraft] = useState<Omit<NotificationRule, 'id' | 'createdAt'> | null>(
    null
  );

  const draftMatchCount = useMemo(() => {
    if (!draft) return 0;
    return notificationsMatchingRule(
      { ...draft, id: '__draft__', createdAt: new Date().toISOString() },
      notifications
    ).length;
  }, [draft, notifications]);

  const handleAddPreset = (presetName: string) => {
    const preset = BUILTIN_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    onAdd({ ...preset });
  };

  const startNew = () => setDraft(emptyRule());
  const cancelDraft = () => setDraft(null);

  const saveDraft = () => {
    if (!draft) return;
    if (!draft.name.trim() || draft.conditions.length === 0) return;
    onAdd(draft);
    setDraft(null);
  };

  const updateDraftCondition = (
    idx: number,
    patch: Partial<RuleCondition>
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.conditions];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, conditions: next };
    });
  };

  const addDraftCondition = () => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            conditions: [
              ...prev.conditions,
              { field: 'title', op: 'startsWith', value: '' },
            ],
          }
        : prev
    );
  };

  const removeDraftCondition = (idx: number) => {
    setDraft((prev) =>
      prev
        ? { ...prev, conditions: prev.conditions.filter((_, i) => i !== idx) }
        : prev
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="notifications-modal rules-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notification rules"
      >
        <header className="notifications-header">
          <div className="notifications-title-block">
            <h2 className="notifications-title">Notification Rules</h2>
            <span className="notifications-count">
              {rules.length} rule{rules.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="notifications-header-actions">
            <button
              className="notifications-icon-btn"
              onClick={onClose}
              title="Close (Esc)"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="rules-presets">
          <span className="rules-presets-label">Add preset:</span>
          {BUILTIN_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="notifications-chip"
              onClick={() => handleAddPreset(preset.name)}
              title={preset.conditions
                .map((c) => `${c.field} ${c.op} "${c.value}"`)
                .join(' AND ')}
            >
              + {preset.name}
            </button>
          ))}
          <button
            type="button"
            className="notifications-link-btn"
            onClick={startNew}
            disabled={draft !== null}
          >
            + Custom rule
          </button>
        </div>

        <div className="rules-list">
          {rules.length === 0 && !draft && (
            <div className="notifications-empty">
              No rules yet. Add a preset above, or click "Custom rule" to build
              one from scratch.
            </div>
          )}

          {rules.map((rule) => {
            const matchCount = notificationsMatchingRule(rule, notifications).length;
            return (
              <div key={rule.id} className="rule-row">
                <div className="rule-main">
                  <div className="rule-name-line">
                    <label className="rules-toggle">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => onToggle(rule.id)}
                      />
                      <strong className={rule.enabled ? '' : 'text-muted'}>
                        {rule.name}
                      </strong>
                    </label>
                    <span className="rule-match-count">
                      {matchCount} matching
                    </span>
                  </div>
                  <div className="rule-conditions-summary">
                    {rule.conditions.map((c, i) => (
                      <span key={i} className="rule-condition-pill">
                        <span className="rule-cond-field">{c.field}</span>
                        <span className="rule-cond-op">{c.op}</span>
                        <span className="rule-cond-value">"{c.value}"</span>
                        {i < rule.conditions.length - 1 && (
                          <span className="rule-cond-and"> AND </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rule-actions">
                  <label className="rules-toggle" title="Auto-apply on each refresh">
                    <input
                      type="checkbox"
                      checked={rule.autoApply}
                      onChange={(e) =>
                        onUpdate(rule.id, { autoApply: e.target.checked })
                      }
                    />
                    auto
                  </label>
                  <button
                    type="button"
                    className="notifications-link-btn"
                    onClick={() => onApplyRule(rule)}
                    disabled={matchCount === 0 || !rule.enabled}
                    title="Mark all matching notifications as read now"
                  >
                    Apply now
                  </button>
                  <button
                    type="button"
                    className="notification-action"
                    onClick={() => onDelete(rule.id)}
                    title="Delete rule"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}

          {draft && (
            <div className="rule-row rule-draft">
              <div className="rule-main">
                <input
                  type="text"
                  className="notifications-search"
                  placeholder='Rule name (e.g. "Bump PRs in non-core repos")'
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((prev) => prev && { ...prev, name: e.target.value })
                  }
                  autoFocus
                />
                <div className="rule-conditions-editor">
                  {draft.conditions.map((cond, idx) => (
                    <div key={idx} className="rule-condition-edit">
                      <select
                        className="rule-select"
                        value={cond.field}
                        onChange={(e) =>
                          updateDraftCondition(idx, {
                            field: e.target.value as RuleField,
                          })
                        }
                      >
                        {FIELD_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rule-select"
                        value={cond.op}
                        onChange={(e) =>
                          updateDraftCondition(idx, {
                            op: e.target.value as RuleOp,
                          })
                        }
                      >
                        {OP_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="rule-value-input"
                        placeholder="value"
                        value={cond.value}
                        onChange={(e) =>
                          updateDraftCondition(idx, { value: e.target.value })
                        }
                      />
                      {draft.conditions.length > 1 && (
                        <button
                          type="button"
                          className="notification-action"
                          onClick={() => removeDraftCondition(idx)}
                          title="Remove condition"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="notifications-link-btn"
                    onClick={addDraftCondition}
                  >
                    + Add condition (AND)
                  </button>
                </div>
                <span className="rule-match-count">
                  Would match {draftMatchCount} current notification
                  {draftMatchCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="rule-actions">
                <label className="rules-toggle">
                  <input
                    type="checkbox"
                    checked={draft.autoApply}
                    onChange={(e) =>
                      setDraft(
                        (prev) => prev && { ...prev, autoApply: e.target.checked }
                      )
                    }
                  />
                  auto-apply
                </label>
                <button
                  type="button"
                  className="notifications-link-btn"
                  onClick={cancelDraft}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="notifications-primary-btn"
                  onClick={saveDraft}
                  disabled={!draft.name.trim() || draft.conditions.length === 0}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
