import { test, expect } from '@playwright/test';

test.describe('Narrative App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Narrative/);
  });

  test('demo mode is available', async ({ page }) => {
    // Look for demo mode button or link
    const demoButton = page.locator('text=Demo').first();
    await expect(demoButton).toBeVisible();
  });

  test('navigation elements exist', async ({ page }) => {
    // Check for main navigation or header
    const header = page.locator('header, nav, [role="navigation"]').first();
    await expect(header).toBeVisible();
  });

  test('does not call Agentation MCP endpoint unless explicitly enabled', async ({ page }) => {
    const agentationRequests: string[] = [];

    page.on('request', (request) => {
      if (request.url().startsWith('http://localhost:4747')) {
        agentationRequests.push(request.url());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    expect(agentationRequests).toEqual([]);
  });
});
