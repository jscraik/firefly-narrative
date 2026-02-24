import { expect, test } from '@playwright/test';

test.describe('Baseline browser quality without Agentation MCP', () => {
  test('has no console errors or failed MCP requests in default dev flow', async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const requestFailures: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    page.on('requestfailed', (request) => {
      requestFailures.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`);
    });

    await page.goto('/');
    await page.getByRole('navigation', { name: 'Primary navigation' }).waitFor();
    await page.screenshot({ path: testInfo.outputPath('baseline-home.png'), fullPage: true });

    await page.getByRole('tab', { name: 'Repo' }).click({ force: true });
    await page.getByRole('button', { name: /import data/i }).waitFor();
    await page.screenshot({ path: testInfo.outputPath('baseline-repo.png'), fullPage: true });

    await page.getByRole('tab', { name: 'Demo' }).click({ force: true });
    await page.waitForSelector('[role="listbox"][aria-label="Commit timeline"]');
    await page.waitForSelector('[data-testid="firefly-signal"]');
    await page.screenshot({ path: testInfo.outputPath('baseline-demo.png'), fullPage: true });

    const mcpErrors = requestFailures.filter((entry) => entry.includes('http://localhost:4747'));
    const mcpConsoleErrors = consoleErrors.filter((entry) => entry.includes('localhost:4747'));

    expect(mcpErrors).toEqual([]);
    expect(mcpConsoleErrors).toEqual([]);
  });
});
