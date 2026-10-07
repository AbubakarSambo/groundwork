import { test } from '@playwright/test';
import { signUp, APP, whatIsOnThePage } from '../user-journeys-helpers';
import { watch, watchSummary, screenshotTo } from './sweep-helpers';

/**
 * L1. START A CHECK-IN, for a sales team (docs/user-journey-tests.md).
 *
 * Runs the full entry chat at 1440, in a real browser, against the real API and the real model:
 * describing the situation, pasting a plan, and reading what Groundwork says back, up to the
 * point the lead presses "I set this up and check in myself". Adding a document separately,
 * setting a target as an aim and one as a limit, and writing a question for one named person
 * were not found as a distinct step in this screen within the time this sweep had (see the
 * tester's report) and so are not exercised here; that is recorded as "could not test", not as
 * a pass.
 *
 * Each real Gemini reply takes well over a minute once a full plan has been pasted, so this one
 * test takes five to six minutes end to end. That is expected (docs/user-journey-tests.md: "the
 * set-up chat calls the real model and is slow").
 */
const THE_PLAN = `Sales team plan for the last quarter of the year.

We are at KES 9.6m for the quarter against KES 18m. Credit must stay under 35% of sales.

Amani Wekesa closed Harbor Foods this week, her biggest ever. I want Amani at KES 4.5m for the quarter. She told me she would send the Green Mart renewal proposal on Wednesday and it did not happen.

Baraka Mutua runs deliveries. He will confirm the Fresh Basket delivery date with the warehouse by Friday 16 October.

Dates: the quarter ends 31 December and the price list goes out on 1 November.`;

test('L1 sales: describe, paste a plan, and read the confirmed summary back, at 1440', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  const stamp = Date.now();
  await signUp(page, { name: 'Tess Tester', email: `tess.${stamp}@l1sales.test`, organisation: `L1 Sales ${stamp}` });
  await page.goto(`${APP}/start`);

  const bugs: string[] = [];

  // Works when: it opens on what's already known, not a greeting.
  const openingText = await whatIsOnThePage(page);
  if (/^.{0,40}(hi|hello|welcome)\b/i.test(openingText.replace(/^Skip to content.*?Feedback/, ''))) {
    bugs.push('The set-up screen opened with a greeting rather than what is already known.');
  }

  const turns = [
    'We run a sales team. We are behind on the quarter and I want to understand why, and get the team lined up for the final push.',
    'Amani Wekesa and Baraka Mutua are on the team. Amani sells, Baraka runs deliveries. We check in weekly for twelve weeks. I lead it, Tess Tester.',
    THE_PLAN,
  ];
  const startBtn = page.getByRole('button', { name: 'I set this up and check in myself' });
  for (let i = 0; i < turns.length; i++) {
    if (await startBtn.isVisible().catch(() => false)) break;
    const box = page.getByRole('textbox').last();
    await box.waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForFunction(() => {
      const ta = document.querySelector('textarea[aria-label="Your answer"]') as HTMLTextAreaElement | null;
      return ta && !ta.disabled;
    }, undefined, { timeout: 60000 }).catch(() => undefined);
    await box.fill(turns[i]);
    await page.getByRole('button', { name: /^Send/ }).click();
    await page.waitForTimeout(90000); // a real Gemini call, slower still once the full plan is in
  }

  const summaryVisible = await page.getByText('What Groundwork has so far').isVisible().catch(() => false);
  if (!summaryVisible) {
    bugs.push('No "What Groundwork has so far" summary appeared after describing the situation and pasting the plan within the time given.');
  } else {
    const summaryText = (await page.getByText('What Groundwork has so far').locator('..').innerText()).replace(/\s+/g, ' ');
    // Works when: every target lands on the right person, or on nobody if it is unclear.
    if (!/Amani Wekesa/.test(summaryText) || !/Baraka Mutua/.test(summaryText)) {
      bugs.push('The summary does not name both Amani Wekesa and Baraka Mutua as who the targets belong to.');
    }
    // Wording rule: a name is a proper noun; it must never be lowercased mid-sentence.
    if (/\bamani Wekesa\b/.test(summaryText) || /\bbaraka Mutua\b/.test(summaryText)) {
      bugs.push('A person\'s first name is lowercased where it falls mid-sentence in the generated summary (e.g. "amani Wekesa", "baraka Mutua") — see B-006.');
    }
    await screenshotTo(page, 'docs/bug-log-screens/_l1-sales-summary-1440.png');
  }

  // Works when: nothing is saved until the lead says yes. A plain network check (a cross-origin
  // API call from this test does not reliably carry the browser's session cookie, so this is
  // weaker evidence than a same-origin check would be — recorded as such in the report).
  const before = await page.request.get(`${APP.replace('5173', '3000')}/api/v1/grounds`).catch(() => null);
  console.log('L1 sales: GET /grounds before confirming (weak check, see comment):', before?.status());

  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(5000);
    const started = await page.getByText('Setup is done. Your check-in starts here.').isVisible().catch(() => false);
    if (!started) bugs.push('Pressing "I set this up and check in myself" did not lead to the lead\'s own first check-in starting.');
  } else {
    bugs.push('Never reached the "I set this up and check in myself" offer within the time given.');
  }

  const issue = watchSummary(watcher);
  if (issue) bugs.push(`Console/network: ${issue}`);

  console.log('L1 sales @ 1440:', bugs.length ? bugs.join(' | ') : 'no issues observed');
});
