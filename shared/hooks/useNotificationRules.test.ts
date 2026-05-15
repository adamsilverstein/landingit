import { describe, it, expect } from 'vitest';
import type { NotificationItem, NotificationRule } from '../types.js';
import {
  ruleMatches,
  notificationsMatchingRule,
  BUILTIN_PRESETS,
} from './useNotificationRules.js';

function notification(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: '1',
    unread: true,
    reason: 'subscribed',
    updatedAt: '2026-05-12T10:00:00Z',
    lastReadAt: null,
    repo: { owner: 'acme', name: 'web' },
    subject: {
      title: 'Bump @octokit/rest from 21.0.0 to 21.1.1',
      type: 'PullRequest',
      url: 'https://api.github.com/repos/acme/web/pulls/42',
      latestCommentUrl: null,
    },
    subjectNumber: 42,
    ...over,
  };
}

function rule(
  conditions: NotificationRule['conditions'],
  over: Partial<NotificationRule> = {}
): NotificationRule {
  return {
    id: 'r1',
    name: 'test',
    enabled: true,
    autoApply: false,
    conditions,
    action: 'mark-read',
    createdAt: '2026-05-12T10:00:00Z',
    ...over,
  };
}

describe('ruleMatches', () => {
  it('matches title startsWith "Bump "', () => {
    expect(
      ruleMatches(
        rule([{ field: 'title', op: 'startsWith', value: 'Bump ' }]),
        notification()
      )
    ).toBe(true);
  });

  it('matches reason equals', () => {
    expect(
      ruleMatches(
        rule([{ field: 'reason', op: 'equals', value: 'ci_activity' }]),
        notification({ reason: 'ci_activity' })
      )
    ).toBe(true);
  });

  it('matches repo equals owner/name', () => {
    expect(
      ruleMatches(
        rule([{ field: 'repo', op: 'equals', value: 'acme/web' }]),
        notification()
      )
    ).toBe(true);
  });

  it('matches subjectType', () => {
    expect(
      ruleMatches(
        rule([{ field: 'subjectType', op: 'equals', value: 'PullRequest' }]),
        notification()
      )
    ).toBe(true);
  });

  it('AND-combines multiple conditions', () => {
    const r = rule([
      { field: 'title', op: 'startsWith', value: 'Bump ' },
      { field: 'repo', op: 'equals', value: 'acme/web' },
    ]);
    expect(ruleMatches(r, notification())).toBe(true);
    expect(ruleMatches(r, notification({ repo: { owner: 'x', name: 'y' } }))).toBe(false);
  });

  it('returns false when conditions list is empty (safety default)', () => {
    expect(ruleMatches(rule([]), notification())).toBe(false);
  });

  it('regex op compiles each call without throwing on invalid patterns', () => {
    expect(
      ruleMatches(
        rule([{ field: 'title', op: 'regex', value: '[invalid(' }]),
        notification()
      )
    ).toBe(false);
  });

  it('uses authorResolver for author field', () => {
    const r = rule([{ field: 'author', op: 'regex', value: '\\[bot\\]$' }]);
    const resolver = (_n: NotificationItem) => 'dependabot[bot]';
    expect(ruleMatches(r, notification(), resolver)).toBe(true);
  });

  it('author rule does not match when no resolver is provided', () => {
    const r = rule([{ field: 'author', op: 'equals', value: 'dependabot[bot]' }]);
    expect(ruleMatches(r, notification())).toBe(false);
  });
});

describe('notificationsMatchingRule', () => {
  it('returns only matching notifications', () => {
    const items = [
      notification({ id: '1' }),
      notification({ id: '2', subject: { ...notification().subject, title: 'Fix bug' } }),
      notification({ id: '3' }),
    ];
    const r = rule([{ field: 'title', op: 'startsWith', value: 'Bump ' }]);
    const matches = notificationsMatchingRule(r, items);
    expect(matches.map((n) => n.id)).toEqual(['1', '3']);
  });
});

describe('BUILTIN_PRESETS', () => {
  it('Dependabot bumps preset matches a Bump-titled notification', () => {
    const preset = BUILTIN_PRESETS.find((p) => p.name === 'Dependabot bumps');
    expect(preset).toBeDefined();
    const r = rule(preset!.conditions);
    expect(ruleMatches(r, notification())).toBe(true);
  });

  it('Bot threads preset matches a [bot] author via resolver', () => {
    const preset = BUILTIN_PRESETS.find((p) => p.name === 'Bot threads');
    expect(preset).toBeDefined();
    const r = rule(preset!.conditions);
    const resolver = () => 'github-actions[bot]';
    expect(ruleMatches(r, notification(), resolver)).toBe(true);
  });

  it('CI activity preset matches ci_activity reason', () => {
    const preset = BUILTIN_PRESETS.find((p) => p.name === 'CI activity');
    expect(preset).toBeDefined();
    const r = rule(preset!.conditions);
    expect(ruleMatches(r, notification({ reason: 'ci_activity' }))).toBe(true);
  });
});
