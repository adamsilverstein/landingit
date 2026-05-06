import { describe, it, expect } from 'vitest';
import { parseRepoInput } from './parseRepoInput.js';
import type { RepoConfig } from '../types.js';

describe('parseRepoInput', () => {
  it('accepts plain owner/name', () => {
    expect(parseRepoInput('facebook/react')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
  });

  it('strips a github.com URL', () => {
    expect(parseRepoInput('https://github.com/facebook/react')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
  });

  it('strips http://, www., and .git', () => {
    expect(parseRepoInput('http://www.github.com/facebook/react.git')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
  });

  it('handles bare github.com/owner/repo (no protocol)', () => {
    expect(parseRepoInput('github.com/facebook/react')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
    expect(parseRepoInput('www.github.com/facebook/react')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
  });

  it('tolerates trailing path segments like /tree/main or /pulls', () => {
    expect(parseRepoInput('https://github.com/facebook/react/tree/main')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
    expect(parseRepoInput('facebook/react/pulls')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(parseRepoInput('   facebook/react  ')).toEqual({
      ok: true,
      owner: 'facebook',
      name: 'react',
    });
  });

  it('rejects malformed input with a friendly error', () => {
    expect(parseRepoInput('not-a-repo')).toEqual({
      ok: false,
      error: 'Enter a repository in owner/name format (e.g., facebook/react).',
    });
  });

  it('rejects empty input', () => {
    expect(parseRepoInput('')).toEqual({
      ok: false,
      error: 'Enter a repository in owner/name format (e.g., facebook/react).',
    });
  });

  it('detects duplicates case-insensitively', () => {
    const existing: RepoConfig[] = [
      { owner: 'facebook', name: 'react', enabled: true },
    ];
    const result = parseRepoInput('Facebook/React', existing);
    expect(result).toEqual({
      ok: false,
      error: 'Facebook/React is already in your list.',
    });
  });

  it('preserves the original casing in the returned owner/name', () => {
    // Returning as entered is fine — duplicate detection lowercases for compare.
    expect(parseRepoInput('Facebook/React')).toEqual({
      ok: true,
      owner: 'Facebook',
      name: 'React',
    });
  });
});
