import { test } from '@playwright/test';
import { atRepoRoot } from './sweep-helpers';

/**
 * FRESH SCREENSHOTS for the two new engagement screens (the weekly report, and Ask opened with a
 * question already put): docs/engagement-spec.md, docs/answers-from-engine.md's "8 October: the
 * engagement work" section. Run by hand against a check-in that already has a weekly report on
 * the local test bed, with sign-in links requested from POST /auth/member-signin (printed to the
 * API's own dev log as "[DEV EMAIL] Links: ..." - mailcatcher is not required).
 *
 * A sign-in link is single-use, so each persona signs in ONCE, in one context, and is then resized
 * for the second screenshot rather than sent back through the link a second time - a reused token
 * lands on "Sign in" again, which a same-size-screenshot bug nearly hid here.
 *
 * The check-in id and the two links are passed as env vars rather than hard-coded - set GROUND_ID,
 * LEAD_LINK and MEMBER_LINK before running.
 */
const GROUND_ID = process.env.GROUND_ID;
const LEAD_LINK = process.env.LEAD_LINK;
const MEMBER_LINK = process.env.MEMBER_LINK;

const SIZES = [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844 }];

test.describe.configure({ mode: 'serial' });

/* Not part of an automated run - a sign-in link is single-use and short-lived, so this only runs
   when somebody has just requested fresh ones and passed them in. Without them, skip rather than
   fail: there is nothing wrong with the product, only nothing to sign in with. */
test.skip(!GROUND_ID || !LEAD_LINK || !MEMBER_LINK, 'Set GROUND_ID, LEAD_LINK and MEMBER_LINK (see the file comment) to run this by hand.');

test('weekly report, as the lead, at 1440 and 390', async ({ browser }) => {
  const context = await browser.newContext({ viewport: SIZES[0] });
  const page = await context.newPage();
  await page.goto(LEAD_LINK!);
  await page.waitForTimeout(1500);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto(`http://localhost:5173/grounds/${GROUND_ID!}/report/week`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: atRepoRoot(`docs/bug-log-screens/engagement-weekly-report-lead-${size.name}.png`), fullPage: true });
  }
});

test('weekly report, as a participant, at 1440 and 390', async ({ browser }) => {
  const context = await browser.newContext({ viewport: SIZES[0] });
  const page = await context.newPage();
  await page.goto(MEMBER_LINK!);
  await page.waitForTimeout(1500);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto(`http://localhost:5173/grounds/${GROUND_ID!}/report/week`);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: atRepoRoot(`docs/bug-log-screens/engagement-weekly-report-participant-${size.name}.png`), fullPage: true });
  }
});

test('ask opened with about=, at 1440 and 390', async ({ browser }) => {
  const context = await browser.newContext({ viewport: SIZES[0] });
  const page = await context.newPage();
  await page.goto(LEAD_LINK!);
  await page.waitForTimeout(1500);
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.goto(`http://localhost:5173/chat?about=${GROUND_ID!}`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: atRepoRoot(`docs/bug-log-screens/engagement-ask-about-lead-${size.name}.png`), fullPage: true });
  }
});
