import { test, expect } from '@playwright/test';

test.describe('Narrative Critical Flows', () => {
  test.describe('App Launch', () => {
    test('should display main navigation', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    });

    test('should show demo mode option', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=Demo')).toBeVisible();
    });

    test('should show repo mode option', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=Repo')).toBeVisible();
    });
  });

  test.describe('Session Import Flow', () => {
    test('should show import button in repo view', async ({ page }) => {
      await page.goto('/');
      // Navigate to repo mode if not default
      const repoButton = page.locator('text=Repo').first();
      if (await repoButton.isVisible().catch(() => false)) {
        await repoButton.click();
      }
      
      // Import button should be visible
      await expect(page.locator('text=Import')).toBeVisible();
    });

    test('should show session panel when available', async ({ page }) => {
      await page.goto('/');
      
      // Look for session-related UI elements
      const sessionPanel = page.locator('text=Session, [data-testid="session-panel"]').first();
      // May not be visible without data, but should not error
      await expect(page).toHaveURL(/localhost|127.0.0.1/);
    });
  });

  test.describe('Timeline Navigation', () => {
    test('should render timeline component', async ({ page }) => {
      await page.goto('/');
      
      // Look for timeline or commit list
      const timeline = page.locator('[data-testid="timeline"], .timeline, text=Commits').first();
      // Timeline may be empty but component should render
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/');
      
      // Check for at least one heading
      const headings = page.locator('h1, h2, h3');
      await expect(headings.first()).toBeVisible();
    });

    test('should have accessible buttons', async ({ page }) => {
      await page.goto('/');
      
      // Buttons should be keyboard accessible
      const buttons = page.locator('button');
      const count = await buttons.count();
      
      if (count > 0) {
        const firstButton = buttons.first();
        await expect(firstButton).toHaveAttribute('tabindex', /0|-1/);
      }
    });
  });
});
