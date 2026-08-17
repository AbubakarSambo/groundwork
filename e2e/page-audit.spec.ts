import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * EVERY PAGE, AS EVERY ROLE, IN ONE PASS.
 *
 * Her ask: a screenshot of every page, how you get to it, where you can go from it, and whether
 * each role sees what they need. This captures the evidence; the reading of it is written up
 * separately.
 *
 * Three real accounts on one org, one ground with two completed sessions of real content, so the
 * pages have something in them. An empty page cannot tell you whether the right person sees the
 * right thing.
 */
const APP = 'http://localhost:5173';
const SITE = 'http://localhost:4321';
const PW = 'AuditPass123!';
const OUT = path.join(__dirname, 'shots', 'audit');
const GROUND = process.env.AUDIT_GROUND_ID!;

const ROLES = {
  admin: 'audit-admin@example.test',
  lead: 'audit-lead@example.test',
  party: 'audit-party@example.test',
};

type Row = {
  role: string; route: string; url: string; title: string;
  heading: string; links: string[]; buttons: string[];
  emptyish: boolean; shot: string; note: string;
};
const rows: Row[] = [];

async function signIn(page: Page, email: string) {
  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/Password/i).fill(PW);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 15000 });
}

async function capture(page: Page, role: string, route: string, note = '') {
  const url = route.startsWith('http') ? route : `${APP}${route}`;
  try {
    /**
     * `domcontentloaded`, not `networkidle`. The first version waited for the network to go quiet
     * on every page and hit the suite timeout partway through the second role - the app polls, so
     * on several pages the network never goes quiet at all and every one of them burned its full
     * 20 seconds. A fixed settle beat afterwards is both faster and more predictable.
     */
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch {
    await page.goto(url, { timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(1200);

  const safe = `${role}__${route.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_')}`.slice(0, 90);
  const shot = path.join(OUT, `${safe}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});

  const body = (await page.textContent('body').catch(() => '')) ?? '';
  const heading = (await page.locator('h1,h2').first().textContent().catch(() => '')) ?? '';
  const links = await page.locator('a[href]').evaluateAll(
    els => Array.from(new Set(els.map(e => (e as HTMLAnchorElement).getAttribute('href') || ''))).filter(Boolean),
  ).catch(() => [] as string[]);
  const buttons = await page.locator('button').evaluateAll(
    els => Array.from(new Set(els.map(e => (e.textContent || '').trim()))).filter(Boolean).slice(0, 25),
  ).catch(() => [] as string[]);

  rows.push({
    role, route, url: page.url(), title: await page.title().catch(() => ''),
    heading: heading.trim().slice(0, 120),
    links: links.slice(0, 40), buttons,
    emptyish: body.replace(/\s+/g, ' ').trim().length < 400,
    shot: path.basename(shot), note,
  });
}

const APP_ROUTES = (g: string) => [
  '/', '/grounds', '/grounds/new', `/grounds/${g}`, `/grounds/${g}/p`,
  `/grounds/${g}/board`, `/grounds/${g}/report`,
  '/settings', '/org/members', '/billing', '/billing/checkout', '/pricing',
  '/admin', '/admin/dashboard', '/prompts', '/prompts/test',
  '/start', '/invite', '/join', '/set-password', '/reset-password',
  '/verify-email', '/auth/sent', '/nonexistent-page',
];

/**
 * NOT SERIAL. The first version was, and when the admin pass tripped its own final assertion
 * Playwright skipped the remaining two roles entirely - "2 did not run" - so a strict check on one
 * role silently cost the audit its participant evidence. Each role stands alone.
 */
test.describe.configure({ mode: 'default' });

function writeRows(tag: string) {
  fs.writeFileSync(path.join(OUT, `audit-${tag}.json`), JSON.stringify(rows, null, 2));
}

test('a stranger, and the marketing site', async ({ browser }) => {
  test.setTimeout(8 * 60 * 1000);
  fs.mkdirSync(OUT, { recursive: true });
  rows.length = 0;
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    for (const r of ['/', '/grounds', '/start', '/auth', '/auth?mode=signup', `/grounds/${GROUND}`, '/settings', '/admin']) {
      await capture(page, 'signed-out', r);
    }
    for (const r of ['/', '/how-it-works', '/use-cases', '/pricing', '/about']) {
      await capture(page, 'marketing', `${SITE}${r}`);
    }
    await ctx.close();
  }
  writeRows('stranger');
  expect(rows.length).toBeGreaterThan(10);
});

for (const [role, email] of Object.entries(ROLES)) {
  test(`every page as ${role}`, async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    fs.mkdirSync(OUT, { recursive: true });
    rows.length = 0;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await signIn(page, email);
    for (const r of APP_ROUTES(GROUND)) await capture(page, role, r);
    await ctx.close();
    writeRows(role);
    /** Loose on purpose: a route that fails to render is a FINDING, not a reason to lose the run. */
    expect(rows.length).toBeGreaterThan(15);
  });
}
