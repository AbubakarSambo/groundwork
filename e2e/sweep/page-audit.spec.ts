import { test, Browser, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { atRepoRoot, watch, Watch } from './sweep-helpers';

/**
 * PART 2 OF docs/user-journey-tests.md: THE PAGE AUDIT.
 *
 * One screenshot per page and role, at desktop (1440x900) and phone (390x844), full page, with
 * console errors and failed (4xx/5xx) requests recorded alongside. Signs in ONCE per role, by
 * password (Kijani Foods and Suites Test Company both have local-only passwords from their seed
 * scripts - no sign-in-link emails are sent here, so the 5-a-minute limit on those never applies),
 * and reuses that signed-in state for every page that role visits.
 *
 * Results: screenshots in docs/page-audit/, and a JSON log of what each page/role combination did
 * (final URL, console errors, failed requests) at docs/page-audit/log.json, which the write-up of
 * docs/page-audit.md and the new bug-log rows is built from by hand.
 */

const CLIENT = 'http://localhost:5173';
const API = 'http://localhost:3000';

const CREDS: Record<string, { email: string; password: string }> = {
  admin: { email: 'naomi@kijani.test', password: 'review-local-only' },
  lead: { email: 'tendai@kijani.test', password: 'review-local-only' },
  member: { email: 'esther@kijani.test', password: 'review-local-only' },
  guest: { email: 'amina@suites.test', password: 'suites-local-only' },
};

type LogEntry = {
  num: string;
  page: string;
  role: string;
  width: number;
  url: string;
  finalUrl: string;
  title: string;
  consoleErrors: string[];
  failedRequests: string[];
  note?: string;
};

const LOG: LogEntry[] = [];
const OUT_DIR = atRepoRoot('docs/page-audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Signed-in states hold session tokens, so they never live in the repo. SCRATCH_DIR is a
// per-session scratchpad outside the repo - set by the environment that runs this spec.
const SCRATCH_DIR = process.env.PAGE_AUDIT_SCRATCH_DIR || path.join(require('os').tmpdir(), 'page-audit-states');
fs.mkdirSync(SCRATCH_DIR, { recursive: true });

async function signInPassword(page: Page, email: string, password: string) {
  await page.goto(`${CLIENT}/auth`);
  await page.locator('#signin-email').fill(email);
  await page.locator('#signin-password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForTimeout(2500);
}

const states: Record<string, string> = {};

async function stateFor(browser: Browser, role: keyof typeof CREDS): Promise<string> {
  if (states[role]) return states[role];
  const { email, password } = CREDS[role];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signInPassword(page, email, password);
  const dest = page.url();
  if (/\/(auth)(\?|$)/.test(new URL(dest).pathname + '')) {
    LOG.push({ num: '-', page: 'SIGN-IN', role, width: 1440, url: '/auth', finalUrl: dest, title: '', consoleErrors: [], failedRequests: [], note: `Sign-in as ${email} did not leave /auth - check the password.` });
  }
  const p = path.join(SCRATCH_DIR, `.state-${role}.json`);
  await ctx.storageState({ path: p });
  await ctx.close();
  states[role] = p;
  return p;
}

async function contextFor(browser: Browser, role: keyof typeof CREDS | 'signedout', width: number, height: number): Promise<BrowserContext> {
  if (role === 'signedout') return browser.newContext({ viewport: { width, height } });
  const p = await stateFor(browser, role);
  return browser.newContext({ storageState: p, viewport: { width, height } });
}

/** Visits one page as one role at one width, screenshots it full-page, and logs console/network. */
async function visit(
  browser: Browser,
  num: string,
  slug: string,
  role: keyof typeof CREDS | 'signedout',
  urlPath: string,
  width: number,
): Promise<{ page: Page; ctx: BrowserContext; w: Watch }> {
  const height = width === 1440 ? 900 : 844;
  const ctx = await contextFor(browser, role, width, height);
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${CLIENT}${urlPath}`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(1800);
  const file = `docs/page-audit/${num}-${slug}-${role === 'signedout' ? 'signedout' : role}-${width}.png`;
  await page.screenshot({ path: atRepoRoot(file), fullPage: true }).catch(() => {});
  const title = await page.title().catch(() => '');
  LOG.push({
    num, page: slug, role, width, url: urlPath, finalUrl: page.url(), title,
    consoleErrors: w.consoleErrors.slice(0, 10), failedRequests: w.failedRequests.slice(0, 10),
  });
  return { page, ctx, w };
}

async function visitAndClose(browser: Browser, num: string, slug: string, role: keyof typeof CREDS | 'signedout', urlPath: string, width: number) {
  const { ctx } = await visit(browser, num, slug, role, urlPath, width);
  await ctx.close();
  // Written after every page so a timeout or crash partway through still leaves a usable log.
  fs.writeFileSync(atRepoRoot('docs/page-audit/log.json'), JSON.stringify(LOG, null, 2));
  // Space API-hitting page loads out: the API allows 60 requests/minute, and a page load with its
  // queries can be several requests at once.
  await new Promise((r) => setTimeout(r, 2000));
}

/**
 * THE PAGE LIST. One row per page a person can reach, grouped by the area of the product. Dev-only
 * pages (/dev/parts, /dev/conversation - import.meta.env.DEV-gated, absent from a built app) and
 * the internal /ops/* company-operations area (our own team running Groundwork, not part of the
 * customer product and not pictured anywhere in docs/prototype/screens/) are listed separately,
 * at the end, and are not screenshotted here - see the report for why.
 */
type Role = keyof typeof CREDS | 'signedout';
type PageDef = { num: string; slug: string; path: string | ((role: Role) => string); roles: Role[] };

// Populated with real ids in test.beforeAll from the API, as the admin.
let groundActive = '';
let groundReportReady = '';
let reviewId = '';
let memberId = '';
let unsubToken = '';
let stopToken = '';

// Fixed, hand-verified ids for the check-in pages (32-38), from the Kijani Foods seed data: a
// ground shared by the lead (tendai) and the member (esther), both REPORT_READY and (for the
// ACTIVE end-page case) a ground that's tendai's alone. Each role's own check-in id is used where
// the page is a participant's own conversation, since a lead and a member each have their own.
// Found by hand against the local seed - not a documented API shortcut - after the generic
// "first ACTIVE / first REPORT_READY ground" ids used below picked grounds a role wasn't actually
// in, which produced 403/404s that were really wrong-id noise, not real findings.
const GROUND_SHARED = 'f9ad5070-c16d-4aa8-b56a-2cb2ae646871'; // lead+member both participants, REPORT_READY
const GROUND_LEAD_ACTIVE = 'bb076fe3-94ae-4898-bb95-ced5bb5d77f4'; // tendai only, ACTIVE
const CHECKIN_LEAD_ACTIVE = '1788aa85-5543-47f7-8143-616dd19e3ba3'; // tendai's own, ACTIVE ground
const CHECKIN_LEAD_REPORTED = 'fa2ccea2-065e-4e49-a5b3-03a5a057d62b'; // tendai's own, REPORT_READY
const CHECKIN_MEMBER_REPORTED = '0d072a57-82e8-4a10-b2ab-f65bd9e586d6'; // esther's own, REPORT_READY

function pages(): PageDef[] {
  return [
    // Public / auth
    { num: '01', slug: 'root', path: '/', roles: ['signedout'] },
    { num: '02', slug: 'sign-in', path: '/auth', roles: ['signedout'] },
    { num: '03', slug: 'start', path: '/start', roles: ['signedout', 'admin'] },
    { num: '04', slug: 'invite', path: '/invite', roles: ['signedout'] },
    { num: '05', slug: 'join', path: '/join', roles: ['signedout'] },
    { num: '06', slug: 'answer', path: '/answer', roles: ['signedout'] },
    { num: '07', slug: 'talk-to-us', path: '/talk-to-us', roles: ['signedout'] },
    { num: '08', slug: 'pricing', path: '/pricing', roles: ['signedout', 'admin'] },

    // Main app
    { num: '09', slug: 'grounds-list', path: '/grounds', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '10', slug: 'today', path: '/today', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '11', slug: 'you', path: '/you', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '12', slug: 'company', path: '/company', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '13', slug: 'company-context', path: '/company/context', roles: ['admin', 'guest', 'signedout'] },
    { num: '14', slug: 'boards', path: '/boards', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '15', slug: 'ask', path: '/chat', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },

    // Suites
    { num: '16', slug: 'suites-settings', path: '/settings/suites', roles: ['admin', 'member', 'guest'] },
    { num: '17', slug: 'suite-onboard', path: '/suite/onboard', roles: ['admin', 'guest'] },
    { num: '18', slug: 'suite-mine', path: '/suite/mine', roles: ['admin', 'lead', 'member', 'guest'] },
    { num: '19', slug: 'suite-leave-new', path: '/suite/leave/new', roles: ['member', 'guest'] },
    { num: '20', slug: 'suite-spend-new', path: '/suite/spend/new', roles: ['member', 'guest'] },
    { num: '21', slug: 'suite-leave', path: '/suite/leave', roles: ['admin', 'lead', 'member', 'guest'] },
    { num: '22', slug: 'suite-queue', path: '/suite/queue', roles: ['admin', 'lead', 'guest'] },
    { num: '23', slug: 'suite-time', path: '/suite/time', roles: ['admin', 'member', 'guest'] },
    { num: '24', slug: 'suite-reviews', path: '/suite/reviews', roles: ['admin', 'lead', 'member', 'guest'] },
    { num: '25', slug: 'suite-leaving', path: '/suite/leaving', roles: ['admin', 'guest'] },
    { num: '26', slug: 'suite-roles', path: '/suite/roles', roles: ['admin', 'guest'] },
    { num: '27', slug: 'suite-spend', path: '/suite/spend', roles: ['admin', 'guest'] },
    { num: '28', slug: 'suite-spend-finance', path: '/suite/spend/finance', roles: ['admin', 'guest'] },
    { num: '29', slug: 'suite-todos', path: '/suite/todos', roles: ['admin', 'member', 'guest'] },
    { num: '30', slug: 'suite-customers', path: '/suite/customers', roles: ['admin', 'member', 'guest'] },
    { num: '31', slug: 'suite-equipment', path: '/suite/equipment', roles: ['admin', 'member', 'guest'] },

    // A check-in itself - fixed ids (see GROUND_*/CHECKIN_* above), not the generic
    // groundActive/groundReportReady, which picked grounds some of these roles are not in.
    { num: '32', slug: 'ground-page', path: `/grounds/${GROUND_SHARED}`, roles: ['admin', 'lead', 'member', 'guest'] },
    { num: '33', slug: 'ground-participant', path: `/grounds/${GROUND_SHARED}/p`, roles: ['member', 'guest'] },
    { num: '34', slug: 'ground-report', path: `/grounds/${GROUND_SHARED}/report`, roles: ['admin', 'lead', 'guest'] },
    { num: '35', slug: 'ground-board', path: `/grounds/${GROUND_SHARED}/board`, roles: ['admin', 'lead', 'member', 'guest'] },
    { num: '36', slug: 'ground-end', path: `/grounds/${GROUND_LEAD_ACTIVE}/end`, roles: ['lead', 'member', 'guest'] },
    {
      num: '37', slug: 'checkin-chat', roles: ['admin', 'lead', 'member', 'guest'],
      path: (r) => `/checkin/${r === 'lead' ? CHECKIN_LEAD_ACTIVE : r === 'member' ? CHECKIN_MEMBER_REPORTED : CHECKIN_LEAD_ACTIVE}`,
    },
    {
      num: '38', slug: 'checkin-report', roles: ['admin', 'lead', 'member', 'guest'],
      path: (r) => `/checkin/${r === 'lead' ? CHECKIN_LEAD_REPORTED : r === 'member' ? CHECKIN_MEMBER_REPORTED : CHECKIN_LEAD_REPORTED}/report`,
    },

    // Billing
    { num: '39', slug: 'billing', path: '/billing', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '40', slug: 'billing-checkout', path: '/billing/checkout', roles: ['admin', 'member'] },

    // Settings / org / admin
    { num: '41', slug: 'settings', path: '/settings', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '42', slug: 'more', path: '/more', roles: ['member'] },
    { num: '43', slug: 'org-members', path: '/org/members', roles: ['admin', 'lead', 'member', 'guest'] },
    { num: '44', slug: 'org-member-one', path: `/org/members/${memberId}`, roles: ['admin', 'member'] },
    { num: '45', slug: 'org-guide', path: '/org/guide', roles: ['admin', 'lead', 'member', 'guest', 'signedout'] },
    { num: '46', slug: 'settings-connections', path: '/settings/connections', roles: ['admin', 'member', 'guest'] },
    { num: '47', slug: 'settings-whatsapp', path: '/settings/whatsapp', roles: ['admin', 'member'] },
    { num: '48', slug: 'settings-tools', path: '/settings/tools', roles: ['admin', 'member'] },

    // Platform admin / staff (not audited as staff - see report)
    { num: '49', slug: 'admin-home', path: '/admin', roles: ['admin', 'signedout'] },
    { num: '50', slug: 'admin-api-access', path: '/admin/api-access', roles: ['admin'] },
    { num: '51', slug: 'admin-whatsapp', path: '/admin/whatsapp', roles: ['admin'] },
    { num: '52', slug: 'admin-dashboard', path: '/admin/dashboard', roles: ['admin'] },
    { num: '53', slug: 'admin-prompts', path: '/admin/prompts', roles: ['admin'] },

    // Mail links, not-found
    { num: '54', slug: 'unsubscribe', path: `/unsubscribe/${unsubToken || 'no-token-found'}`, roles: ['signedout'] },
    { num: '55', slug: 'stop-reminders', path: `/stop-reminders/${stopToken || 'no-token-found'}`, roles: ['signedout'] },

    // Found against client/src/App.tsx but missing from the first pass of this list - auth, join
    // and org-setup states, and a few staff/admin-only pages the earlier numbers (49-53) already
    // cover the pattern for.
    { num: '57', slug: 'auth-sent', path: '/auth/sent', roles: ['signedout'] },
    { num: '58', slug: 'signout', path: '/signout', roles: ['signedout', 'admin'] },
    { num: '59', slug: 'verify-email', path: '/verify-email', roles: ['signedout'] },
    { num: '60', slug: 'google-failed', path: '/google-failed', roles: ['signedout'] },
    { num: '61', slug: 'set-password', path: '/set-password', roles: ['signedout'] },
    { num: '62', slug: 'reset-password', path: '/reset-password', roles: ['signedout'] },
    { num: '63', slug: 'start-team', path: '/start/team', roles: ['signedout'] },
    { num: '64', slug: 'join-confirm', path: '/join/confirm', roles: ['signedout'] },
    { num: '65', slug: 'join-waiting', path: '/join/waiting', roles: ['admin'] },
    { num: '66', slug: 'org-new', path: '/org-new', roles: ['admin'] },
    { num: '67', slug: 'orgs', path: '/orgs', roles: ['admin'] },
    { num: '68', slug: 'welcome', path: '/welcome', roles: ['admin'] },
    { num: '69', slug: 'join-by-link', path: '/j/no-such-code', roles: ['signedout'] },
    { num: '70', slug: 'preview-reports', path: '/preview/reports', roles: ['admin'] },
    { num: '71', slug: 'ground-session', path: `/grounds/${GROUND_SHARED}/session/1`, roles: ['admin'] },
    { num: '72', slug: 'billing-callback', path: '/billing/callback', roles: ['admin'] },
    { num: '73', slug: 'admin-prompts-test', path: '/admin/prompts/test', roles: ['admin'] },
    { num: '56', slug: 'not-found', path: '/this-page-does-not-exist-xyz', roles: ['signedout', 'admin'] },
  ];
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(55 * 60 * 1000);

test('page audit sweep', async ({ browser }) => {
  // Sign in as admin first (also warms the cached state) and pull real ids from the API with the
  // admin's own token, as the instructions ask - never seeded by calling internal code.
  const adminStatePath = await stateFor(browser, 'admin');
  const adminState = JSON.parse(fs.readFileSync(adminStatePath, 'utf8'));
  let token = '';
  for (const o of adminState.origins || []) for (const kv of o.localStorage || []) if (kv.name === 'token' || kv.name === 'accessToken') token = kv.value;
  if (!token) {
    const r = await fetch(`${API}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'naomi@kijani.test', password: 'review-local-only' }) });
    const j = await r.json();
    token = j?.data?.accessToken || '';
  }
  const authed = (p: string) => fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => null);

  const grounds = await authed('/api/v1/grounds');
  const list: any[] = grounds?.data || [];
  groundActive = list.find((g) => g.status === 'ACTIVE')?.id || list[0]?.id || 'no-id-found';
  groundReportReady = list.find((g) => g.status === 'REPORT_READY')?.id || groundActive;

  // The People page's own endpoint (client/src/pages/org/people-here.ts: fetchMembers) is
  // GET /users, not any of the org/members-shaped paths this used to try - those all answered
  // with nothing, which is why page 44 originally got id="" and landed on the bare list instead
  // of one person.
  for (const p of ['/api/v1/users?limit=100&page=1', '/api/v1/org/members', '/api/v1/organizations/members', '/api/v1/members', '/api/v1/org']) {
    const r = await authed(p);
    const arr = r?.data?.data || r?.data?.members || r?.data;
    if (Array.isArray(arr) && arr.length) { memberId = arr.find((m: any) => m.id && m.id !== 'undefined')?.id || ''; if (memberId) break; }
  }

  // No API shortcut is documented for a review id or the mail tokens - left as not-found/no-token,
  // which is itself a fair thing to screenshot (what a stale or guessed link shows).

  const list2 = pages();
  for (const pd of list2) {
    for (const role of pd.roles) {
      const resolvedPath = typeof pd.path === 'function' ? pd.path(role) : pd.path;
      for (const width of [1440, 390]) {
        await visitAndClose(browser, pd.num, pd.slug, role, resolvedPath, width);
      }
    }
  }

  fs.writeFileSync(atRepoRoot('docs/page-audit/log.json'), JSON.stringify(LOG, null, 2));
});
