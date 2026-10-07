import { test, expect, Page } from '@playwright/test';
import { APP } from '../user-journeys-helpers';
import { signIn, mailMark, linkSentTo } from '../sign-in-by-email';
import { watch, screenshotTo } from './sweep-helpers';

/**
 * FRESH SCREENSHOTS, AFTER THE FIX, FOR THE SCREEN BUGS FIXED IN THIS PASS OF
 * docs/bug-log-screens.md: B-005, B-009, B-011, B-012 and B-019.
 *
 * Each test reaches the state the bug was found in (mostly through the real sign-up/sign-in/invite
 * flow, with a direct, authenticated call to the same /entry/commit route the save card itself
 * calls where going through several minutes of real model replies would add nothing a unit test
 * has not already pinned - noted on each test), then screenshots the fixed page at 1440 and 390.
 */
test.describe.configure({ mode: 'serial' });

async function newAdminOrg(page: Page, tag: string) {
  const domain = `shot-${tag}-${Date.now().toString(36)}.test`;
  const email = `admin@${domain}`;
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await page.getByLabel('Your name').fill('Shot Admin');
  await page.getByLabel('Email', { exact: true }).fill(email);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Create account' }).click();
  const link = await linkSentTo(page, email, /verify-email\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.waitForTimeout(1200);
  const cont = page.getByRole('button', { name: 'Continue' });
  if (await cont.isVisible().catch(() => false)) { await cont.click(); await page.waitForTimeout(1000); }
  const keep = page.getByText('Keep using email links instead');
  if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(1500); }
  return { domain, email };
}

/** The bearer token the signed-in browser already holds, for a same-origin authenticated fetch. */
async function tokenOf(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem('token') || '');
}

/** Commits a ground directly, the same route the save card itself calls, with a hand-written
 *  history (no real model turns) - what is screenshotted here is the FIXED SCREEN rendering real
 *  server data, not the conversation that led to it, which existing specs already exercise live. */
async function commitGround(page: Page, body: Record<string, unknown>): Promise<string> {
  const token = await tokenOf(page);
  const res = await page.request.post(`${APP.replace('5173', '3000')}/api/v1/entry/commit`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: {
      groundLabel: 'Shot check-in',
      setupKey: `shot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      scenario: 'NEW_PROJECT',
      cadence: 'WEEKLY',
      cadenceChosen: true,
      history: [{ role: 'user', content: 'Setting this up for a screenshot.' }],
      brief: 'A new project, set up for a screenshot of the fixed page.',
      contributors: [],
      ...body,
    },
  });
  expect(res.ok(), `commit failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const json = await res.json();
  const data = json.data ?? json;
  console.log('commit result:', JSON.stringify(data));
  return data.groundId;
}

/** A fresh org, with a second person invited and signed in as a LEAD (not admin) - so their own
 *  check-in waits for an admin by default (HOW_A_NEW_ORG_WORKS: NAMED_LEADS + needsApproval). */
async function newOrgWithALead(page: Page, tag: string): Promise<{ leadEmail: string }> {
  const { domain } = await newAdminOrg(page, tag);
  const leadEmail = `lead@${domain}`;
  await page.goto(`${APP}/org/members`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.getByLabel('Role').selectOption({ label: 'Can open check-ins' });
  await page.getByLabel(/Write one person on each line, with their name and email/).fill(`Shot Lead, ${leadEmail}`);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Send their invitations' }).click();
  await page.waitForTimeout(1500);
  const link = await linkSentTo(page, leadEmail, /set-password\?token=[0-9a-f]+/, since);
  await page.goto(link);
  const pw = page.locator('input[type="password"]');
  if (await pw.first().isVisible().catch(() => false)) {
    await pw.first().fill('ShotLeadPass123!');
    const again = page.getByLabel(/Type it again/);
    if (await again.count()) await again.first().fill('ShotLeadPass123!');
    await page.getByRole('button', { name: /Save|Set|Continue|Sign in/i }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }
  return { leadEmail };
}

test('B-009 and B-011: the lead\'s check-in awaiting approval, with both "Add all" people kept, at 1440 and 390', async () => {
  test.setTimeout(120_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await newOrgWithALead(page, 'b009');

  /* The lead is signed in (the invite's own set-password flow lands signed in). Committing
     directly with two contributors is what everyoneNamedSoFar() now guarantees happens even when
     a save lands mid-step (B-011) - the fixed CODE PATH is the client's own buildCommitPayload,
     already pinned by the-entry-chats-save-card-is-rebuilt.spec.tsx; what this screenshots is the
     fixed RESULT a person reads: both people kept, and the lead's own waiting check-in. */
  const groundId = await commitGround(page, {
    groundLabel: 'Shot project, with Priya and Tomas',
    contributors: [
      { email: 'priya@shot-b009.test', displayName: 'Priya Shah', context: 'Owns the delivery timeline.' },
      { email: 'tomas@shot-b009.test', displayName: 'Tomas Novak' },
    ],
  });

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${APP}/grounds/${groundId}?tab=settings`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await screenshotTo(page, `docs/bug-log-screens/B-011-fixed-${width}.png`);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'Priya must be on the check-in').toContain('Priya Shah');
    expect(text, 'Tomas must be on the check-in').toContain('Tomas Novak');

    await page.goto(`${APP}/grounds/${groundId}?tab=chat`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await screenshotTo(page, `docs/bug-log-screens/B-009-fixed-${width}.png`);
    const chatText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(chatText).toContain('Waiting for an admin to accept this check-in');
    expect(chatText, 'the contradictory "closed" refusal must not show').not.toContain('This check-in is closed');
  }
  await browser.close();
});

test('B-012: "Your sessions" reads a sane count, never more done than planned, 1440 and 390', async () => {
  test.setTimeout(120_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await newAdminOrg(page, 'b012');

  /* Committing with a real history completes the initiator's own session 1 as part of the save
     (entry.service.ts's commitInner), so this check-in already has exactly one of its planned six
     sessions done - the fixed count-distinct-sessions logic (b-012-your-sessions-count-does-not-
     double-count.spec.tsx already pins the exact doubled-row defect at the unit level; completing
     a second session and self-correcting it for this screenshot too would add several more real,
     slow model turns for the same code path that test already exercises precisely). */
  const groundId = await commitGround(page, {
    groundLabel: 'Shot check-in, six sessions',
    history: [{ role: 'user', content: 'We are a small team working through a six-week plan.' }],
    brief: 'A six-session check-in, set up for a screenshot of the fixed sessions count.',
  });

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${APP}/grounds/${groundId}?tab=settings`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await screenshotTo(page, `docs/bug-log-screens/B-012-fixed-${width}.png`);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const m = text.match(/Your sessions (\d+) of (\d+) sessions? (?:is|are) done\./);
    expect(m, `"Your sessions" row not found as expected in: ${text.slice(0, 200)}`).not.toBeNull();
    expect(Number(m![1]), 'done can never be more than planned').toBeLessThanOrEqual(Number(m![2]));
  }
  await browser.close();
});

test('B-019: an ended check-in stops promising a next one, 1440 and 390', async () => {
  test.setTimeout(120_000);
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await newAdminOrg(page, 'b019');

  /* The admin is the sole party, so confirming an end state closes it at once - no second
     party needed to reach RESOLVED for this screenshot. */
  const groundId = await commitGround(page, { groundLabel: 'Shot check-in, now ended' });
  const token = await tokenOf(page);
  const resolveRes = await page.request.post(`${APP.replace('5173', '3000')}/api/v1/grounds/${groundId}/resolution`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { endState: 'STOP', reason: 'This was only a screenshot for the bug log.' },
  });
  expect(resolveRes.ok(), `resolution propose failed: ${resolveRes.status()} ${await resolveRes.text()}`).toBeTruthy();

  for (const width of [1440, 390] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.goto(`${APP}/grounds/${groundId}?tab=chat`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(600);
    await screenshotTo(page, `docs/bug-log-screens/B-019-fixed-${width}.png`);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text, 'must say it has ended').toContain('This check-in has ended');
    expect(text, 'must not promise a next check-in').not.toMatch(/next check-in opens|Bring this to your next check-in/);
  }
  await browser.close();
});

test('B-023: a colleague refused a review reads only its own sentence, 1440 and 390', async () => {
  test.setTimeout(120_000);
  /* Grace's own review, written by Daniel, in the seeded Suites Test Company - a colleague
     (Peter) is refused it. */
  for (const width of [1440, 390] as const) {
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await signIn(page, 'grace@suites.test');
    const token = await tokenOf(page);
    const mineRes = await page.request.get(`${APP.replace('5173', '3000')}/api/v1/suites/reviews/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const mineJson = await mineRes.json();
    const mine = mineJson.data ?? mineJson;
    const reviewId = mine?.[0]?.id;
    expect(reviewId, 'Grace needs at least one started review for this screenshot').toBeTruthy();

    await browser.close();
    const browser2 = await chromium.launch();
    const page2 = await browser2.newPage();
    await page2.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await signIn(page2, 'peter@suites.test');
    await page2.goto(`${APP}/suite/reviews/${reviewId}`);
    await page2.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page2.waitForTimeout(600);
    await screenshotTo(page2, `docs/bug-log-screens/B-023-fixed-${width}.png`);
    const text = (await page2.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(text).toContain('You cannot open this review.');
    expect(text, 'the check-in-access toast must not fire').not.toContain('That one is not yours to open');
    await browser2.close();
  }
});

test('B-005: a suite board refusal shows only its own sentence, 1440 and 390', async () => {
  test.setTimeout(120_000);
  for (const width of [1440, 390] as const) {
    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await signIn(page, 'grace@suites.test');
    const watcher = watch(page);
    await page.goto(`${APP}/suite/leave`);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    await screenshotTo(page, `docs/bug-log-screens/B-005-fixed-${width}.png`);
    const toastGone = await page.getByText('That one is not yours to open').count();
    expect(toastGone, 'the check-in-access toast must not fire on a suite board refusal').toBe(0);
    void watcher;
    await browser.close();
  }
});
