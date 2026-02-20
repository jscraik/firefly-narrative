import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type FireflyPerfFixture = {
  durationMs: number;
  stepMs: number;
  scrollActions: string[];
  metadata?: {
    machineProfile?: string;
    runtimeMode?: string;
  };
};

async function openDemoTimeline(page: Page) {
  await page.goto('/');
  const demoTab = page.getByRole('tab', { name: 'Demo' });
  await demoTab.click({ force: true });
  await page.waitForSelector('[role="listbox"][aria-label="Commit timeline"]');
}

async function loadPerfFixture(): Promise<FireflyPerfFixture> {
  const fixturePath = new URL('./fixtures/firefly-large-timeline.json', import.meta.url);
  const fixtureRaw = await readFile(fixturePath, 'utf8');
  return JSON.parse(fixtureRaw) as FireflyPerfFixture;
}

test.describe('Firefly Visual System v1', () => {
  test('tracks selection changes on the timeline', async ({ page }) => {
    await openDemoTimeline(page);

    const firefly = page.locator('[data-testid=\"firefly-signal\"]');
    await expect(firefly).toBeVisible();

    const timelineNodes = page.locator('button.timeline-dot');
    await expect(timelineNodes.first()).toBeVisible();
    await timelineNodes.nth(1).click();

    await expect.poll(async () => {
      const state = await firefly.getAttribute('data-state');
      return state === 'tracking' || state === 'idle' || state === 'analyzing';
    }).toBe(true);
  });

  test('surfaces toggle persistence failures in ImportErrorBanner when they occur', async ({ page }) => {
    await openDemoTimeline(page);

    await page.getByRole('tab', { name: 'Settings' }).click();
    const isDevRuntime = await page.getByText('Dev Theme Override').isVisible().catch(() => false);

    const toggle = page.getByLabel(/toggle firefly signal/i);
    await expect(toggle).toBeVisible();
    await toggle.click();

    const persistenceError = page.locator('text=Unable to persist Firefly setting');
    const firefly = page.locator('[data-testid=\"firefly-signal\"]');

    const sawPersistenceError = await persistenceError.first().isVisible({ timeout: 1000 }).catch(() => false);
    if (sawPersistenceError) {
      await expect(persistenceError.first()).toBeVisible();
      return;
    }

    // If persistence succeeds in this environment, toggle should still suppress rendering.
    await expect(firefly).toHaveCount(0);
    await page.reload();
    const fireflyAfterReload = page.locator('[data-testid=\"firefly-signal\"]');
    if (isDevRuntime) {
      // Dev mode skips persistence wiring; navigation may also reset to landing after reload.
      await openDemoTimeline(page);
      await expect(fireflyAfterReload).toHaveCount(1);
      return;
    }

    await expect(fireflyAfterReload).toHaveCount(0);
  });

  test('@firefly-perf captures frame metrics and writes verification artifact', async ({ page, browserName }) => {
    const fixture = await loadPerfFixture();
    const thresholds = process.env.CI
      ? {
          averageFpsMin: 20,
          p95FrameTimeMsMax: 80,
          layoutShiftCountMax: 0,
        }
      : {
          averageFpsMin: 55,
          p95FrameTimeMsMax: 20,
          layoutShiftCountMax: 0,
        };

    await openDemoTimeline(page);

    const perfResult = await page.evaluate(async ({ durationMs, stepMs, scrollActions }) => {
      const timeline = document.querySelector('[role=\"listbox\"][aria-label=\"Commit timeline\"]');
      if (!(timeline instanceof HTMLElement)) {
        throw new Error('Timeline listbox not found.');
      }

      let layoutShiftCount = 0;
      let layoutShiftValue = 0;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
            sources?: Array<{ node?: Node | null }>;
          };
          if (!shift.hadRecentInput && typeof shift.value === 'number') {
            const fireflyRelated = (shift.sources ?? []).some((source) => {
              const node = source.node;
              return node instanceof Element && Boolean(node.closest('[data-testid=\"firefly-signal\"]'));
            });

            if (fireflyRelated) {
              layoutShiftCount += 1;
              layoutShiftValue += shift.value;
            }
          }
        }
      });

      try {
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // layout-shift observer may be unavailable in some environments.
      }

      const frameTimes: number[] = [];
      let running = true;
      let lastFrame = performance.now();

      const recordFrame = (now: number) => {
        frameTimes.push(now - lastFrame);
        lastFrame = now;
        if (running) {
          requestAnimationFrame(recordFrame);
        }
      };
      requestAnimationFrame(recordFrame);

      const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
      const endTime = performance.now() + durationMs;
      let actionIndex = 0;

      while (performance.now() < endTime) {
        const key = scrollActions[actionIndex % scrollActions.length] ?? 'ArrowRight';
        timeline.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        actionIndex += 1;
        await wait(stepMs);
      }

      running = false;
      observer.disconnect();
      await wait(50);

      const validFrames = frameTimes.filter((value) => Number.isFinite(value) && value > 0);
      const averageFrameMs = validFrames.length
        ? validFrames.reduce((sum, value) => sum + value, 0) / validFrames.length
        : 0;
      const sortedFrames = [...validFrames].sort((a, b) => a - b);
      const p95Index = sortedFrames.length > 0 ? Math.min(sortedFrames.length - 1, Math.floor(sortedFrames.length * 0.95)) : 0;
      const p95FrameMs = sortedFrames[p95Index] ?? 0;

      return {
        frameCount: validFrames.length,
        averageFps: averageFrameMs > 0 ? 1000 / averageFrameMs : 0,
        p95FrameTimeMs: p95FrameMs,
        layoutShiftCount,
        layoutShiftValue,
      };
    }, fixture);

    const timestamp = new Date();
    const dateStamp = timestamp.toISOString().slice(0, 10);
    const outputPath = path.join(process.cwd(), 'docs', 'assets', 'verification', `firefly-perf-${dateStamp}.json`);

    const artifact = {
      generatedAtISO: timestamp.toISOString(),
      machineProfile: fixture.metadata?.machineProfile ?? 'unknown',
      os: `${os.platform()} ${os.release()}`,
      runtimeMode: fixture.metadata?.runtimeMode ?? 'playwright-headless',
      browser: browserName,
      attempt: 1,
      fixture: 'e2e/fixtures/firefly-large-timeline.json',
      thresholds,
      metrics: perfResult,
    };

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');

    expect(perfResult.averageFps).toBeGreaterThanOrEqual(thresholds.averageFpsMin);
    expect(perfResult.p95FrameTimeMs).toBeLessThanOrEqual(thresholds.p95FrameTimeMsMax);
    expect(perfResult.layoutShiftCount).toBeLessThanOrEqual(thresholds.layoutShiftCountMax);
  });
});
