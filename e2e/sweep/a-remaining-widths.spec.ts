import { test } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { signIn } from '../sign-in-by-email';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * A2, A4, A5 and A6 AT 1280 AND 1024 - a layout-only pass (no horizontal scroll, no console
 * errors beyond what is already logged), using signed-in seeded people so no further sign-up
 * emails are spent against the 5/minute limit. The full functional checks for these journeys
 * already ran at 1440 and 390 in their own spec files.
 */
const LAPTOPS = [{ name: '1280', width: 1280, height: 900 }, { name: '1024', width: 1024, height: 900 }];

const PAGES: { label: string; email: string; path: string }[] = [
  { label: 'A2 People (Suites Test Company, admin Amina)', email: 'amina@suites.test', path: '/org/members' },
  { label: 'A4 Suites settings (Suites Test Company, admin Amina)', email: 'amina@suites.test', path: '/settings/suites' },
  { label: 'A4 Leave board (Suites Test Company, lead Daniel)', email: 'daniel@suites.test', path: '/suite/leave' },
  { label: 'A5 Plan and billing (Suites Test Company, admin Amina)', email: 'amina@suites.test', path: '/billing' },
  { label: 'A6 Company page (Kijani Foods, admin Naomi)', email: 'naomi@kijani.test', path: '/company' },
];

for (const w of LAPTOPS) {
  for (const p of PAGES) {
    test(`${p.label}, at ${w.name}`, async ({ page }) => {
      await page.setViewportSize({ width: w.width, height: w.height });
      const watcher = watch(page);
      await signIn(page, p.email);
      await page.goto(`${APP}${p.path}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      const slug = p.path.replace(/\W+/g, '-');
      await screenshotTo(page, `docs/bug-log-screens/_width${slug}-${w.name}.png`);

      const bugs: string[] = [];
      if (scrollWidth > clientWidth + 2) bugs.push(`Horizontal scroll at ${w.name} on ${p.path}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}.`);
      const issue = watchSummary(watcher);
      if (issue) bugs.push(`Console/network: ${issue}`);
      console.log(`${p.label} @ ${w.name}:`, bugs.length ? bugs.join(' | ') : 'no issues observed');
    });
  }
}
