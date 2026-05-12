import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NotificationItem,
  NotificationRule,
  RuleCondition,
} from '../types.js';
import type { StorageAdapter } from '../storage.js';
import { STORAGE_KEYS } from '../constants.js';

/**
 * Built-in rule presets users can materialize as their own saved rules.
 * Shipping these as data (not hard-coded behavior) lets users edit or
 * delete them like any other rule.
 */
export const BUILTIN_PRESETS: ReadonlyArray<Omit<NotificationRule, 'id' | 'createdAt'>> = [
  {
    name: 'Dependabot bumps',
    enabled: true,
    autoApply: false,
    conditions: [
      { field: 'title', op: 'startsWith', value: 'Bump ' },
    ],
    action: 'mark-read',
  },
  {
    name: 'Bot threads',
    enabled: true,
    autoApply: false,
    conditions: [
      // GitHub bot logins end in `[bot]`. Use a regex op for a precise match.
      { field: 'author', op: 'regex', value: '\\[bot\\]$' },
    ],
    action: 'mark-read',
  },
  {
    name: 'CI activity',
    enabled: true,
    autoApply: false,
    conditions: [
      { field: 'reason', op: 'equals', value: 'ci_activity' },
    ],
    action: 'mark-read',
  },
];

function generateId(): string {
  // Inline UUID-ish id — avoids a runtime dep. Sufficient for local-only rule ids.
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Extract a string value from a notification for a given rule field.
 *
 * Some fields (notably `author`) aren't available on the notifications
 * API response itself — the API does not include the actor. Callers who
 * want author-matching must pass an `authorResolver` (typically a lookup
 * into the cross-referenced `items[]` PR object). When unavailable, the
 * author field falls back to empty string so author rules simply do not
 * match rather than throwing.
 */
function fieldValue(
  n: NotificationItem,
  field: RuleCondition['field'],
  authorResolver?: (n: NotificationItem) => string | null
): string {
  switch (field) {
    case 'title': return n.subject.title;
    case 'repo': return `${n.repo.owner}/${n.repo.name}`;
    case 'reason': return n.reason;
    case 'subjectType': return n.subject.type;
    case 'author': return authorResolver?.(n) ?? '';
  }
}

function evaluateCondition(
  n: NotificationItem,
  cond: RuleCondition,
  authorResolver?: (n: NotificationItem) => string | null
): boolean {
  const value = fieldValue(n, cond.field, authorResolver);
  switch (cond.op) {
    case 'equals': return value === cond.value;
    case 'startsWith': return value.startsWith(cond.value);
    case 'contains': return value.includes(cond.value);
    case 'regex': {
      try {
        return new RegExp(cond.value).test(value);
      } catch {
        return false;
      }
    }
  }
}

/**
 * Returns true when the notification matches every condition in the rule.
 * An empty condition list matches nothing (safer than matching everything,
 * since the only action today is destructive — mark-read).
 */
export function ruleMatches(
  rule: NotificationRule,
  n: NotificationItem,
  authorResolver?: (n: NotificationItem) => string | null
): boolean {
  if (rule.conditions.length === 0) return false;
  return rule.conditions.every((c) => evaluateCondition(n, c, authorResolver));
}

export function notificationsMatchingRule(
  rule: NotificationRule,
  notifications: NotificationItem[],
  authorResolver?: (n: NotificationItem) => string | null
): NotificationItem[] {
  return notifications.filter((n) => ruleMatches(rule, n, authorResolver));
}

interface UseNotificationRulesOptions {
  storage: StorageAdapter;
}

interface UseNotificationRulesResult {
  rules: NotificationRule[];
  rulesLoaded: boolean;
  addRule: (input: Omit<NotificationRule, 'id' | 'createdAt'>) => NotificationRule;
  updateRule: (id: string, patch: Partial<Omit<NotificationRule, 'id' | 'createdAt'>>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  reorderRules: (orderedIds: string[]) => void;
}

/**
 * CRUD store for user-defined notification rules. Persists via the
 * supplied storage adapter under STORAGE_KEYS.NOTIFICATION_RULES.
 *
 * Mirrors the async-loaded-before-persist pattern from
 * useFilteredItems.ts so AsyncStorage on mobile doesn't clobber a
 * persisted value with the in-memory default before the loader resolves.
 */
export function useNotificationRules({
  storage,
}: UseNotificationRulesOptions): UseNotificationRulesResult {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [rulesLoaded, setRulesLoaded] = useState(false);

  const storageRef = useRef(storage);
  storageRef.current = storage;

  // Load
  useEffect(() => {
    storage
      .getItem(STORAGE_KEYS.NOTIFICATION_RULES)
      .then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (r): r is NotificationRule =>
                r != null &&
                typeof r.id === 'string' &&
                typeof r.name === 'string' &&
                typeof r.enabled === 'boolean' &&
                Array.isArray(r.conditions)
            );
            setRules(valid);
          }
        } catch {
          /* corrupted — start fresh */
        }
      })
      .catch(() => {})
      .finally(() => setRulesLoaded(true));
  }, [storage]);

  // Persist after the initial async load completes.
  useEffect(() => {
    if (!rulesLoaded) return;
    storageRef.current
      .setItem(STORAGE_KEYS.NOTIFICATION_RULES, JSON.stringify(rules))
      .catch(() => {});
  }, [rules, rulesLoaded]);

  const addRule = useCallback(
    (input: Omit<NotificationRule, 'id' | 'createdAt'>): NotificationRule => {
      const rule: NotificationRule = {
        ...input,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setRules((prev) => [...prev, rule]);
      return rule;
    },
    []
  );

  const updateRule = useCallback(
    (id: string, patch: Partial<Omit<NotificationRule, 'id' | 'createdAt'>>) => {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    },
    []
  );

  const deleteRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const reorderRules = useCallback((orderedIds: string[]) => {
    setRules((prev) => {
      const byId = new Map(prev.map((r) => [r.id, r]));
      const reordered: NotificationRule[] = [];
      for (const id of orderedIds) {
        const r = byId.get(id);
        if (r) reordered.push(r);
      }
      // Append any rules not present in orderedIds (defensive).
      for (const r of prev) {
        if (!orderedIds.includes(r.id)) reordered.push(r);
      }
      return reordered;
    });
  }, []);

  return {
    rules,
    rulesLoaded,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    reorderRules,
  };
}
