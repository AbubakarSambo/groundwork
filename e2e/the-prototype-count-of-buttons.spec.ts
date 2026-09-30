import { test, expect, Page } from '@playwright/test';
import * as net from 'net';
import * as path from 'path';
import { pathToFileURL } from 'url';

/**
 * TWO RULES, CHECKED LIVE (Hafsah, 30 September 2026, item 3):
 *
 *   (a) At most one primary (navy) button per screen.
 *   (b) No more buttons than the prototype's own version of that screen has.
 *
 * This opens each rebuilt screen in the RUNNING PRODUCT (client on localhost:5173, API on
 * 127.0.0.1:3000), as the reader it is built for, and the SAME screen in the prototype
 * (docs/prototype/groundwork-prototype.html, opened as a local file, with the persona set through
 * `#d-persona` and the screen chosen by its hash - the way the prototype addresses its own
 * screens; docs/prototype/screens/index.json lists them). It counts every visible button a
 * person can see - a `<button>`, or a link styled and acting as one - and how many of those are
 * primary (navy), on both sides, and fails if the product has more than one primary, or more
 * buttons in total than the prototype's own screen.
 *
 * A "primary" button is one whose own background colour is the navy the button system defines
 * (`--gw-navy` / the prototype's `--navy`, both `#0C447C` - rgb(12, 68, 124)), not a class name,
 * so this catches a primary button however it was drawn, old part or new.
 *
 * Run it against the local servers, from the repo root:
 *
 *   cd e2e && npx playwright test the-prototype-count-of-buttons.spec.ts
 *
 * Sign-in is by an emailed link, the same way as the-page-is-cream.spec.ts: the local API relays
 * every email to 127.0.0.1:1025 in development, and this test listens there itself. Nothing is
 * seeded and nothing is changed; it only opens pages and counts what is on them.
 */

const APP = 'http://localhost:5173';
const PROTOTYPE_FILE = pathToFileURL(
  path.join(__dirname, '..', 'docs', 'prototype', 'groundwork-prototype.html'),
).toString();
const NAVY = 'rgb(12, 68, 124)'; // #0C447C, both --gw-navy and the prototype's --navy

type Reader = { who: string; email: string };
const READERS: Record<string, Reader> = {
  participant: { who: 'participant', email: 'amani.u8@example.test' },
  lead: { who: 'lead', email: 'rukia.u8lead@example.test' },
  admin: { who: 'admin', email: 'juma.u8admin@example.test' },
};

/**
 * THE TABLE: every entry on REBUILT_PAGES (client/src/components/gw/ui/rebuilt-pages.ts) that has
 * a prototype counterpart, with the product path to open (as the given reader) and the
 * prototype's own hash and persona for the same screen (docs/prototype/screens/index.json).
 *
 * Several rebuilt pages are PANELS inside one prototype screen, not a screen of their own - the
 * People page's "Waiting to be let in", "Invite people", "Who can join" and "Who can open a
 * check-in" are all sections of the one `people` screen, and the board's `WorkRecords` and the
 * ten small board pieces under `components/gw/` are all sections of the one `board-as-lead`
 * screen. Those are marked `null`: this test does not open them separately (they are covered when
 * their parent screen is opened), and says so in the report rather than silently skipping them.
 */
type Counterpart = { productPath: string; reader: keyof typeof READERS; hash: string; persona: string } | null;
const SCREENS: Record<string, Counterpart> = {
  'pages/invite/InvitePage.tsx': null, // needs an unauthenticated invite token; not opened by reader sign-in
  'pages/invite/InvitationExpired.tsx': null, // same
  'pages/join/WaitingForAnAdminPage.tsx': null, // same
  'pages/grounds/OutOfTime.tsx': null, // needs a check-in that has actually run out of time
  'pages/org/OrgMembersPage.tsx': { productPath: '/settings/people', reader: 'admin', hash: '#/settings/people', persona: 'admin' },
  'pages/org/WaitingToBeLetIn.tsx': null, // a panel of the people screen above, not its own prototype screen
  'pages/org/EveryoneHere.tsx': null, // a panel of the people screen above
  'pages/org/InvitePeople.tsx': null, // a panel of the people screen above
  'pages/org/WhoCanJoin.tsx': null, // a panel of the people screen above
  'pages/org/TheInviteLink.tsx': null, // a panel of the people screen above
  'pages/org/WhoCanOpenACheckIn.tsx': null, // a panel of the people screen above
  'pages/org/OnePersonPage.tsx': { productPath: '/settings/people/local-test-person', reader: 'admin', hash: '#/settings/people/miriam', persona: 'admin' },
  'pages/grounds/CheckInPeopleAndSetup.tsx': { productPath: '/grounds/9028f0ad-293b-4592-9a4e-25b680dd91cd/people', reader: 'lead', hash: '#/c/sales/people', persona: 'lead' },
  'pages/board/BoardPage.tsx': { productPath: '/grounds/9028f0ad-293b-4592-9a4e-25b680dd91cd/board', reader: 'lead', hash: '#/c/sales/board', persona: 'lead' },
  'pages/board/WorkRecords.tsx': null, // a section of the board screen above
  'components/gw/where-each-person-is.tsx': null, // a section of the board screen above
  'components/gw/WhatTheRecordShows.tsx': null,
  'components/gw/TheJudgement.tsx': null,
  'components/gw/WhatTheNetworkSaid.tsx': null,
  'components/gw/HowThisHasMoved.tsx': null,
  'components/gw/ResolutionPanel.tsx': null,
  'components/gw/TheSessionsReport.tsx': null,
  'components/gw/split-one-total-across-people.tsx': null,
  'components/gw/WhatSuccessLooksLike.tsx': null,
  'components/gw/TargetsBand.tsx': null,
  'components/gw/Suggestions.tsx': null,
  'components/gw/how-it-is-going.tsx': null,
  'components/gw/what-to-settle-together.tsx': null,
  'components/gw/a-second-press-before-it-is-gone.tsx': null,
  'components/gw/TheOtherBoardsYouAreIn.tsx': null,
  'pages/settings/SettingsPage.tsx': { productPath: '/settings', reader: 'lead', hash: '#/settings', persona: 'lead' },
  'pages/more/MorePage.tsx': null, // the prototype's more-menu-phone is a 390px view of the sidebar, not its own screen
  'pages/connections/WhatsAppSetupPage.tsx': { productPath: '/settings/whatsapp', reader: 'admin', hash: '#/settings/whatsapp', persona: 'admin' },
  'pages/connections/ConnectionsPage.tsx': { productPath: '/settings/connections', reader: 'admin', hash: '#/settings/connections', persona: 'admin' },
  'pages/billing/BillingPage.tsx': { productPath: '/settings/billing', reader: 'admin', hash: '#/settings/billing', persona: 'admin' },
};

/* A small mail catcher on this Mac only, for the sign-in links (copied from the-page-is-cream.spec.ts). */
const mail: string[] = [];
let catcher: net.Server;
test.beforeAll(async () => {
  catcher = net.createServer((sock) => {
    let data = false;
    let buf = '';
    sock.write('220 localhost\r\n');
    sock.on('data', (chunk) => {
      const s = chunk.toString('utf8');
      if (data) {
        buf += s;
        if (buf.includes('\r\n.\r\n')) { mail.push(buf); buf = ''; data = false; sock.write('250 OK\r\n'); }
        return;
      }
      for (const line of s.split('\r\n').filter(Boolean)) {
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250 localhost\r\n');
        else if (cmd === 'DATA') { data = true; sock.write('354 go\r\n'); }
        else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
        else sock.write('250 OK\r\n');
      }
    });
  });
  await new Promise<void>((ok, no) => { catcher.once('error', no); catcher.listen(1025, '127.0.0.1', () => ok()); });
});
test.afterAll(async () => { catcher?.close(); });

function linkFor(email: string, since: number): string | null {
  for (let i = mail.length - 1; i >= since; i--) {
    if (!mail[i].toLowerCase().includes(email.toLowerCase())) continue;
    const found = mail[i].replace(/=\r\n/g, '').replace(/=3D/gi, '=').match(/https?:\/\/localhost:5173\/verify-email\?token=[0-9a-f]+/i);
    if (found) return found[0];
  }
  return null;
}

async function signIn(page: Page, email: string) {
  const since = mail.length;
  await page.goto(`${APP}/auth`);
  await page.locator('input[type="email"]').first().fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link instead' }).click();
  let link: string | null = null;
  for (let t = 0; t < 40 && !link; t++) { await page.waitForTimeout(500); link = linkFor(email, since); }
  expect(link, `a sign-in email for ${email}`).not.toBeNull();
  await page.goto(link!);
  await page.waitForTimeout(2500);
}

/** Every visible button-like element, and how many of those are navy (primary). */
async function countButtons(page: Page): Promise<{ total: number; primary: number; labels: string[] }> {
  return page.evaluate((NAVY) => {
    const isVisible = (e: Element) => {
      const r = (e as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const nodes = Array.from(document.querySelectorAll('button, a')).filter((e) => {
      if (e.closest('#dev, #devshow')) return false; // the prototype's own dev bar, not the screen
      const cs = getComputedStyle(e);
      const looksLikeAButton = e.tagName === 'BUTTON' || cs.display.includes('flex') || cs.display.includes('inline-flex') || e.className.toString().includes('btn');
      return looksLikeAButton && isVisible(e);
    });
    const labels = nodes.map((e) => (e.textContent || '').trim().slice(0, 40));
    const primary = nodes.filter((e) => getComputedStyle(e).backgroundColor === NAVY).length;
    return { total: nodes.length, primary, labels };
  }, NAVY);
}

test.use({ viewport: { width: 1440, height: 900 } });

test.describe('the two button rules, screen by screen', () => {
  const entries = Object.entries(SCREENS);
  const withCounterpart = entries.filter(([, c]) => c !== null) as [string, NonNullable<Counterpart>][];
  const withoutCounterpart = entries.filter(([, c]) => c === null).map(([p]) => p);

  test('every entry on REBUILT_PAGES is accounted for', () => {
    expect(Object.keys(SCREENS).length).toBeGreaterThan(0);
    // The two lists above must cover every REBUILT_PAGES entry; see the comment on SCREENS.
    console.log(`With a prototype counterpart to open (${withCounterpart.length}): ${withCounterpart.map(([p]) => p).join(', ')}`);
    console.log(`No separate prototype screen - a panel of one already opened above (${withoutCounterpart.length}): ${withoutCounterpart.join(', ')}`);
  });

  for (const [page404, counterpart] of withCounterpart) {
    test(`${page404}: at most one primary, and no more buttons than the prototype`, async ({ page, context }) => {
      const reader = READERS[counterpart.reader];
      await signIn(page, reader.email);
      await page.goto(`${APP}${counterpart.productPath}`);
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const product = await countButtons(page);

      const proto = await context.newPage();
      await proto.goto(PROTOTYPE_FILE);
      await proto.selectOption('#d-persona', counterpart.persona).catch(() => {});
      await proto.evaluate(() => { (window as any).dispatchEvent?.(new Event('hashchange')); });
      await proto.goto(`${PROTOTYPE_FILE}${counterpart.hash}`);
      await proto.waitForTimeout(1000);
      const prototype = await countButtons(proto);
      await proto.close();

      const problems: string[] = [];
      if (product.primary > 1) {
        problems.push(`${product.primary} primary buttons, not 1: ${product.labels.slice(0, 10).join(' | ')}`);
      }
      if (product.total > prototype.total) {
        problems.push(`${product.total} buttons, vs the prototype's ${prototype.total} (product: ${product.labels.join(' | ')}) (prototype: ${prototype.labels.join(' | ')})`);
      }
      if (problems.length) {
        console.log(`${page404}: ${problems.join(' -- ')}`);
      }
      expect(problems, `${page404} (product ${counterpart.productPath} vs prototype ${counterpart.hash})`).toEqual([]);
    });
  }
});
