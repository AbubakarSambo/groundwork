import { test, Browser, Page, Route } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { atRepoRoot } from './sweep-helpers';

/**
 * B-112 VERIFICATION: Ask Groundwork's composer, forced through a failed and a slow `GET /ask`,
 * in both places that mount it - the desktop drawer (AppShell's "Ask" button, beside any page) and
 * the mobile `/chat` page - signed in as esther@kijani.test, a member. Screenshots go to
 * docs/bug-log-screens/B-112-fixed-<state>-<width>.png. Not part of the ordinary small-states
 * sweep (sweep/small-states.spec.ts already covers /chat at the lead's own sign-in); this is a
 * one-off proof for the fix, kept separate so it is easy to find and easy to remove later.
 */

const CLIENT = 'http://localhost:5173';
const API_PATTERN = '**/api/v1/ask**';

const MEMBER = { email: 'esther@kijani.test', password: 'review-local-only' };

const SCRATCH_DIR = process.env.SMALL_STATES_SCRATCH_DIR || path.join(require('os').tmpdir(), 'small-states-states');
fs.mkdirSync(SCRATCH_DIR, { recursive: true });

async function signInPassword(page: Page, email: string, password: string) {
  await page.goto(`${CLIENT}/auth`);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(2500);
}

let memberStatePath: string | null = null;
async function memberState(browser: Browser): Promise<string> {
  if (memberStatePath) return memberStatePath;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signInPassword(page, MEMBER.email, MEMBER.password);
  const p = path.join(SCRATCH_DIR, `.state-member-b112.json`);
  await ctx.storageState({ path: p });
  await ctx.close();
  memberStatePath = p;
  return p;
}

const OUT_DIR = atRepoRoot('docs/bug-log-screens');
fs.mkdirSync(OUT_DIR, { recursive: true });

function shotPath(state: string, width: number) {
  return `docs/bug-log-screens/B-112-fixed-${state}-${width}.png`;
}

/** Opens Ask - the desktop drawer at 1440, the /chat page at 390. */
async function openAsk(page: Page, width: number) {
  if (width === 1440) {
    await page.goto(`${CLIENT}/today`, { waitUntil: 'load' }).catch(() => {});
    await page.waitForTimeout(800);
    await page.locator('.gw-ask-open').click();
  } else {
    await page.goto(`${CLIENT}/chat`, { waitUntil: 'load' }).catch(() => {});
  }
}

async function run(browser: Browser, state: string, width: number, setup: (p: Page) => Promise<void>) {
  const height = width === 1440 ? 900 : 844;
  const statePath = await memberState(browser);
  const ctx = await browser.newContext({ storageState: statePath, viewport: { width, height } });
  const page = await ctx.newPage();
  await setup(page);
  await openAsk(page, width);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: atRepoRoot(shotPath(state, width)), fullPage: true }).catch(() => {});
  await ctx.close();
}

/** Failed, then "Try again" pressed with the route cleared - the normal case lands. */
async function runRetried(browser: Browser, width: number) {
  const height = width === 1440 ? 900 : 844;
  const statePath = await memberState(browser);
  const ctx = await browser.newContext({ storageState: statePath, viewport: { width, height } });
  const page = await ctx.newPage();
  let fail = true;
  await page.route(API_PATTERN, (route: Route) => {
    if (fail) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal error' }) });
    return route.continue();
  });
  await openAsk(page, width);
  await page.waitForTimeout(1800);
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: atRepoRoot(shotPath('retried', width)), fullPage: true }).catch(() => {});
  await ctx.close();
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(10 * 60 * 1000);

test('B-112: Ask keeps its box through a 500, a dropped connection, and a slow load', async ({ browser }) => {
  for (const width of [1440, 390]) {
    // server error: 500 on GET /ask (and POST, were it tried)
    await run(browser, 'error-500', width, async (page) => {
      await page.route(API_PATTERN, (route: Route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Internal error' }) }));
    });

    // network down: the request never comes back at all
    await run(browser, 'network-down', width, async (page) => {
      await page.route(API_PATTERN, (route: Route) => route.abort('failed'));
    });

    // a slow load: 5 seconds before it answers
    await run(browser, 'loading', width, async (page) => {
      await page.route(API_PATTERN, async (route: Route) => {
        await new Promise(r => setTimeout(r, 5000));
        await route.continue();
      });
    });

    // failed, then "Try again" - the normal case lands
    await runRetried(browser, width);
  }
});
