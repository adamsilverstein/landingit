import { describe, it, expect } from 'vitest';
import { parseNotificationSubject } from './parseNotificationSubject.js';

describe('parseNotificationSubject', () => {
  it('parses a PR subject URL', () => {
    expect(
      parseNotificationSubject(
        'https://api.github.com/repos/acme/web/pulls/42'
      )
    ).toEqual({ owner: 'acme', repo: 'web', number: 42, type: 'pull' });
  });

  it('parses an issue subject URL', () => {
    expect(
      parseNotificationSubject(
        'https://api.github.com/repos/WordPress/gutenberg/issues/12345'
      )
    ).toEqual({
      owner: 'WordPress',
      repo: 'gutenberg',
      number: 12345,
      type: 'issue',
    });
  });

  it('returns null for null / undefined / empty input', () => {
    expect(parseNotificationSubject(null)).toBeNull();
    expect(parseNotificationSubject(undefined)).toBeNull();
    expect(parseNotificationSubject('')).toBeNull();
  });

  it('returns null for non-PR/issue subject URLs (commit, release, etc.)', () => {
    expect(
      parseNotificationSubject(
        'https://api.github.com/repos/acme/web/commits/abc123'
      )
    ).toBeNull();
    expect(
      parseNotificationSubject(
        'https://api.github.com/repos/acme/web/releases/1'
      )
    ).toBeNull();
  });

  it('returns null for HTML URLs (we only expect API URLs from notifications)', () => {
    expect(
      parseNotificationSubject('https://github.com/acme/web/pull/42')
    ).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(parseNotificationSubject('not a url')).toBeNull();
    expect(parseNotificationSubject('https://api.github.com/repos/foo')).toBeNull();
    expect(
      parseNotificationSubject('https://api.github.com/repos/acme/web/pulls/notanumber')
    ).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(
      parseNotificationSubject('  https://api.github.com/repos/acme/web/pulls/1  ')
    ).toEqual({ owner: 'acme', repo: 'web', number: 1, type: 'pull' });
  });
});
