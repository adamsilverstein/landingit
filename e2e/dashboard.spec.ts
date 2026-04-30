import { test, expect } from '@playwright/test';
import { STORAGE_KEYS } from '../src/constants.js';

// These tests run against the built app with no real GitHub token.
// They test the UI flows that don't require API calls (token setup,
// keyboard navigation, filter bar, theme).

test.describe('Token Setup', () => {
  test('shows token setup screen when no token is stored', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.token-card h1')).toBeVisible();
    await expect(page.locator('.token-input')).toBeVisible();
    await expect(page.locator('.token-btn')).toBeDisabled();
  });

  test('enables save button when token is entered', async ({ page }) => {
    await page.goto('/');
    await page.fill('.token-input', 'ghp_testtoken123');
    await expect(page.locator('.token-btn')).toBeEnabled();
  });

  test('transitions to dashboard after saving token', async ({ page }) => {
    await page.goto('/');
    await page.fill('.token-input', 'ghp_testtoken123');
    await page.click('.token-btn');
    // Should now show the main app layout (header with title)
    await expect(page.locator('.header-title')).toBeVisible();
    await expect(page.locator('.header-title')).toHaveText('LandinGit');
  });
});

test.describe('Dashboard (with token)', () => {
  test.beforeEach(async ({ page }) => {
    // Set a fake token in localStorage before loading
    await page.goto('/');
    await page.evaluate((keys) => {
      localStorage.setItem(keys.TOKEN, 'ghp_fake_token');
      localStorage.setItem(keys.CONFIG, JSON.stringify({
        repos: [{ owner: 'test', name: 'repo', enabled: true }],
        defaults: { sort: 'updated', filter: 'all', maxPrsPerRepo: 30, autoRefreshInterval: 0 },
      }));
    }, STORAGE_KEYS);
    await page.reload();
    await expect(page.locator('.header-title')).toBeVisible();
  });

  test('shows header with repo count', async ({ page }) => {
    await expect(page.locator('.header-title')).toHaveText('LandinGit');
    await expect(page.locator('.header-stats')).toContainText('1 repo');
  });

  test('shows filter bar with all filter pills', async ({ page }) => {
    await expect(page.locator('.filter-bar')).toBeVisible();
    await expect(page.locator('.filter-pill').first()).toBeVisible();
  });

  test('filter pills toggle active state on click', async ({ page }) => {
    // The "All" pill should be active by default
    const allPill = page.locator('.filter-pill', { hasText: 'All' });
    await expect(allPill).toHaveClass(/filter-active/);

    // Click "Failing CI" pill
    const failingPill = page.locator('.filter-pill', { hasText: 'Failing CI' });
    await failingPill.click();
    await expect(failingPill).toHaveClass(/filter-active/);
    await expect(allPill).not.toHaveClass(/filter-active/);
  });

  test('search input focuses and accepts input', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.click();
    await searchInput.fill('test query');
    await expect(searchInput).toHaveValue('test query');
  });

  test('keyboard shortcut ? opens help modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.locator('.shortcut-table')).toBeVisible();
  });

  test('Escape closes help modal', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.locator('.modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('keyboard shortcut c opens repo manager', async ({ page }) => {
    await page.keyboard.press('c');
    await expect(page.locator('.modal')).toBeVisible();
    // Repo manager should show the configured repo
    await expect(page.locator('.repo-item')).toBeVisible();
  });

  test('sign out returns to token setup', async ({ page }) => {
    await page.click('text=Sign out');
    await expect(page.locator('.token-card')).toBeVisible();
  });

  test('empty state shows when no items loaded', async ({ page }) => {
    // With a fake token, no items will load, so we should see the empty state or table
    // The empty state appears when items array is empty
    const emptyOrTable = page.locator('.empty-state, .pr-table');
    await expect(emptyOrTable.first()).toBeVisible();
  });
});

test.describe('Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((keys) => {
      localStorage.setItem(keys.TOKEN, 'ghp_fake_token');
    }, STORAGE_KEYS);
    await page.reload();
  });

  test('cycles theme with Shift+T key', async ({ page }) => {
    // Default theme is "system" which resolves to "dark" in headless Chromium.
    // Cycle is: dark -> light -> system. So from system(dark):
    //   1st press -> dark (resolved: dark)
    //   2nd press -> light (resolved: light)
    const root = page.locator(':root');

    // First press: system -> dark
    await page.keyboard.press('Shift+T');
    await expect(root).toHaveAttribute('data-theme', 'dark');

    // Second press: dark -> light
    await page.keyboard.press('Shift+T');
    await expect(root).toHaveAttribute('data-theme', 'light');
  });
});
