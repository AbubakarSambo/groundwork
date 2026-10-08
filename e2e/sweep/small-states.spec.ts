import { test, expect, Browser, Page, BrowserContext, Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { atRepoRoot } from './sweep-helpers';

/**
 * SMALL STATES AND ERROR PAGES ACROSS THE PRODUCT, FORCED AND PHOTOGRAPHED.
 *
 * Wording checked against docs/prototype/screens/F4-small-states/*.txt,
 * A2-accounts-and-signing-in/verify-expired.txt and A3-organisations-and-joining/join-expired.txt.
 *
 * Every main page is visited signed in as the right person, and each state is forced with
 * page.route rather than relying on real server data, so the same test runs the same way on any
 * machine. Screenshots go to docs/bug-log-screens/state-<page>-<state>-<width>.png.
 */

const CLIENT = 'http://localhost:5173';
const API_PATTERN = '**/api/v1/**';

const CREDS = {
  admin: { email: 'naomi@kijani.test', password: 'review-local-only' },
  lead: { email: 'tendai@kijani.test', password: 'review-local-only' },
  member: { email: 'esther@kijani.test', password: 'review-local-only' },
} as const;
type Role = keyof typeof CREDS;

// Same fixed, hand-verified Kijani Foods ids page-audit.spec.ts uses, so this hits real,
// well-understood records rather than a freshly (and differently) seeded one.
const GROUND_SHARED = 'f9ad5070-c16d-4aa8-b56a-2cb2ae646871'; // lead+member both participants, REPORT_READY
const CHECKIN_LEAD_REPORTED = 'fa2ccea2-065e-4e49-a5b3-03a5a057d62b'; // tendai's own, REPORT_READY

const SCRATCH_DIR = process.env.SMALL_STATES_SCRATCH_DIR || path.join(require('os').tmpdir(), 'small-states-states');
fs.mkdirSync(SCRATCH_DIR, { recursive: true });

async function signInPassword(page: Page, email: string, password: string) {
  await page.goto(`${CLIENT}/auth`);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(2500);
}

const states: Record<string, string> = {};
async function stateFor(browser: Browser, role: Role): Promise<string> {
  if (states[role]) return states[role];
  const { email, password } = CREDS[role];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signInPassword(page, email, password);
  const p = path.join(SCRATCH_DIR, `.state-${role}.json`);
  await ctx.storageState({ path: p });
  await ctx.close();
  states[role] = p;
  return p;
}

type PageDef = {
  slug: string;
  role: Role;
  url: string;
  /** Endpoint(s) to intercept for 404/403 - the one request whose failure should produce the
   *  page-level not-found/no-access state. Omitted where the page has no single resource id
   *  (lists and account-wide pages), per the task's "where it applies" scoping. */
  resourceEndpoint?: string;
  /** For the empty state: match + a body that is the page's empty shape. */
  emptyMatch?: string;
  emptyBody?: unknown;
  widths: number[];
};

const FIVE_MOST_USED = ['today', 'checkins-list', 'checkin-board', 'you', 'ask'];

function pages(): PageDef[] {
  return [
    { slug: 'today', role: 'lead', url: '/today', widths: [1440, 390] },
    {
      slug: 'checkins-list', role: 'lead', url: '/boards',
      emptyMatch: '**/api/v1/grounds', emptyBody: [],
      widths: [1440, 390],
    },
    {
      slug: 'checkin-board', role: 'lead', url: `/grounds/${GROUND_SHARED}/board`,
      resourceEndpoint: `**/api/v1/grounds/${GROUND_SHARED}/board*`,
      widths: [1440, 390],
    },
    {
      slug: 'people-and-setup', role: 'lead', url: `/grounds/${GROUND_SHARED}?tab=settings`,
      resourceEndpoint: `**/api/v1/grounds/${GROUND_SHARED}`,
      widths: [1440],
    },
    {
      slug: 'context', role: 'lead', url: `/grounds/${GROUND_SHARED}?tab=context`,
      resourceEndpoint: `**/api/v1/grounds/${GROUND_SHARED}`,
      widths: [1440],
    },
    {
      slug: 'session-report', role: 'lead', url: `/checkin/${CHECKIN_LEAD_REPORTED}/report`,
      resourceEndpoint: `**/api/v1/check-ins/${CHECKIN_LEAD_REPORTED}/session-report`,
      widths: [1440],
    },
    { slug: 'you', role: 'lead', url: '/you', widths: [1440, 390] },
    { slug: 'people', role: 'admin', url: '/org/members', widths: [1440] },
    { slug: 'company', role: 'lead', url: '/company', widths: [1440] },
    { slug: 'ask', role: 'lead', url: '/chat', widths: [1440, 390] },
    {
      slug: 'suite-board', role: 'lead', url: '/suite/leave',
      emptyMatch: '**/api/v1/suites/leave/board', emptyBody: { waiting: [], off: [] },
      widths: [1440],
    },
    { slug: 'suite-request-form', role: 'member', url: '/suite/leave/new', widths: [1440] },
    { slug: 'settings', role: 'lead', url: '/settings', widths: [1440] },
    { slug: 'billing', role: 'admin', url: '/billing', widths: [1440] },
  ];
}

type Finding = { page: string; state: string; width: number; problems: string[] };
const FINDINGS: Finding[] = [];
const OUT_DIR = atRepoRoot('docs/bug-log-screens');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function freshContext(browser: Browser, role: Role, width: number, height: number): Promise<BrowserContext> {
  const p = await stateFor(browser, role);
  return browser.newContext({ storageState: p, viewport: { width, height } });
}

function shotPath(page: string, state: string, width: number) {
  return `docs/bug-log-screens/state-${page}-${state}-${width}.png`;
}

/** Checks that apply to every forced state, per the task's list. */
async function checkCommon(page: Page, label: string, width: number): Promise<string[]> {
  const problems: string[] = [];
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  if (!bodyText.trim()) problems.push('page is blank');
  if (/\bat\s+\S+\.(tsx|ts|js):\d+/.test(bodyText) || /Cannot read propert/.test(bodyText) || /TypeError:/.test(bodyText)) {
    problems.push('raw error/stack text visible');
  }
  // a way on: at least one button or link visible
  const actionable = await page.locator('button, a[href]').count();
  if (actionable === 0) problems.push('no way on (no button or link)');
  if (width === 390) {
    const overlap = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('button, a, h1, h2, p')) as HTMLElement[];
      const rects = els.filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect());
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (ix > 4 && iy > 4) return true;
        }
      }
      return false;
    }).catch(() => false);
    if (overlap) problems.push('elements overlap at 390');
  }
  return problems;
}

async function run(browser: Browser, def: PageDef, state: string, width: number, setup: (p: Page) => Promise<void>) {
  const height = width === 1440 ? 900 : 844;
  const ctx = await freshContext(browser, def.role, width, height);
  const page = await ctx.newPage();
  await setup(page);
  await page.goto(`${CLIENT}${def.url}`, { waitUntil: 'load' }).catch(() => {});
  if (state === 'loading') {
    await page.waitForTimeout(1000);
  } else {
    await page.waitForTimeout(1800);
  }
  await page.screenshot({ path: atRepoRoot(shotPath(def.slug, state, width)), fullPage: true }).catch(() => {});
  const problems = await checkCommon(page, def.slug, width);
  if (state !== 'loading') {
    // the "nothing stuck on a spinner after 10s" check
    await page.waitForTimeout(8200);
    const stillSpinning = await page.locator('[class*="spinner" i], [aria-busy="true"]').count().catch(() => 0);
    if (stillSpinning > 0) problems.push('still shows a spinner after 10s');
  }
  if (problems.length) FINDINGS.push({ page: def.slug, state, width, problems });
  await ctx.close();
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(30 * 60 * 1000);

test('small states sweep', async ({ browser }) => {
  for (const def of pages()) {
    const widths = def.widths.filter(w => w === 1440 || FIVE_MOST_USED.includes(def.slug));

    // empty
    if (def.emptyMatch) {
      for (const width of widths) {
        await run(browser, def, 'empty', width, async (page) => {
          await page.route(def.emptyMatch!, (route: Route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(def.emptyBody) }));
        });
      }
    }

    // loading (delay every API call 5s, screenshot at 1s - handled by run())
    for (const width of widths) {
      await run(browser, def, 'loading', width, async (page) => {
        await page.route(API_PATTERN, async (route: Route) => {
          await new Promise(r => setTimeout(r, 5000));
          await route.continue();
        });
      });
    }

    // server error: 500 on every API call
    for (const width of widths) {
      await run(browser, def, 'error-500', width, async (page) => {
        await page.route(API_PATTERN, (route: Route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal error' }) }));
      });
    }

    // network down: abort every API call
    for (const width of widths) {
      await run(browser, def, 'network-down', width, async (page) => {
        await page.route(API_PATTERN, (route: Route) => route.abort('failed'));
      });
    }

    // not found / no access - only where there is one resource id to fail
    if (def.resourceEndpoint) {
      for (const width of widths) {
        await run(browser, def, 'not-found-404', width, async (page) => {
          await page.route(def.resourceEndpoint!, (route: Route) => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) }));
        });
      }
      for (const width of widths) {
        await run(browser, def, 'no-access-403', width, async (page) => {
          await page.route(def.resourceEndpoint!, (route: Route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Forbidden' }) }));
        });
      }
    }
  }

  fs.writeFileSync(atRepoRoot('docs/bug-log-screens/small-states-findings.json'), JSON.stringify(FINDINGS, null, 2));
  console.log('FINDINGS:', JSON.stringify(FINDINGS, null, 2));
});

test('an unknown address: /nowhere', async ({ browser }) => {
  const ctx = await freshContext(browser, 'lead', 1440, 900);
  const page = await ctx.newPage();
  await page.goto(`${CLIENT}/nowhere`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: atRepoRoot('docs/bug-log-screens/state-nowhere-404-1440.png'), fullPage: true });
  await expect(page.getByText('Nothing is at this address')).toBeVisible();
  await expect(page.getByText('It may have moved, or the link was mistyped.')).toBeVisible();
  await ctx.close();
});

test('a bad link: /badlink', async ({ browser }) => {
  const ctx = await freshContext(browser, 'lead', 1440, 900);
  const page = await ctx.newPage();
  await page.goto(`${CLIENT}/badlink`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: atRepoRoot('docs/bug-log-screens/state-badlink-1440.png'), fullPage: true });
  await ctx.close();
});

test('an expired sign-in link', async ({ browser }) => {
  // MagicVerifyPage POSTs /auth/verify-email; a used-up/expired token answers 410, which
  // LinkExpired (A2-accounts-and-signing-in/verify-expired.txt) renders.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // The page decides "expired" vs "didn't work" from the server's own sentence, not the status
  // code (whatTheLinkDid, a-link-that-has-expired.ts) - this is the real one (auth.service.ts).
  await page.route('**/api/v1/auth/verify-email', (route: Route) => route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ message: 'This verification link has expired. Please request a new one.' }) }));
  await page.goto(`${CLIENT}/verify-email?token=expired-token`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: atRepoRoot('docs/bug-log-screens/state-verify-expired-1440.png'), fullPage: true });
  const problems = await checkCommon(page, 'verify-expired', 1440);
  if (problems.length) FINDINGS.push({ page: 'verify-expired', state: 'expired', width: 1440, problems });
  await ctx.close();
});

test('an expired invitation link', async ({ browser }) => {
  // InvitePage reads /participants/invite?token=... and treats a 200 with expired:true as the
  // expired state (A3-organisations-and-joining/join-expired.txt), not an HTTP error code.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/api/v1/participants/invite*', (route: Route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ expired: true, leadFirstName: 'Wairimu' }),
  }));
  await page.goto(`${CLIENT}/invite?token=expired-token`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: atRepoRoot('docs/bug-log-screens/state-join-expired-1440.png'), fullPage: true });
  const problems = await checkCommon(page, 'join-expired', 1440);
  if (problems.length) FINDINGS.push({ page: 'join-expired', state: 'expired', width: 1440, problems });
  await ctx.close();
});

test('offline, mid session', async ({ browser }) => {
  const ctx = await freshContext(browser, 'lead', 1440, 900);
  const page = await ctx.newPage();
  await page.goto(`${CLIENT}/today`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1000);
  await ctx.setOffline(true);
  await page.goto(`${CLIENT}/you`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: atRepoRoot('docs/bug-log-screens/state-offline-1440.png'), fullPage: true });
  await ctx.setOffline(false);
  await ctx.close();
});
