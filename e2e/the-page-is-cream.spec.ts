import { test, expect, Page } from '@playwright/test';
import { signIn } from './sign-in-by-email';

/**
 * THE PAGE IS CREAM, FOR EVERY READER (Hafsah, 29 September 2026).
 *
 * The prototype's page is #FDFBF6 with white panels on it. A leftover colour setting painted
 * #FAF5EA, a darker cream the prototype keeps for its marketing pages, over about 28 pages. The
 * unit guard checks the code; this checks the running product: every page below, as a
 * participant, the lead and an admin, at 1440 pixels. It fails if a page's background is not
 * #FDFBF6, or if #FAF5EA is painted anywhere on it.
 *
 * Run it against the local servers (client on localhost:5173, API on 127.0.0.1:3000), at the end of
 * every module:
 *
 *   cd e2e && npx playwright test the-page-is-cream.spec.ts
 *
 * Sign-in is by an emailed link. The local API relays every email to 127.0.0.1:1025 when it is in
 * development, and this test listens there itself, so no link or token is ever written down or
 * printed. The readers are the local test accounts; set PAGE_COLOUR_READERS (a JSON list of
 * {who, email, paths}) to use others. Nothing is seeded and nothing is changed: it only opens pages.
 */

const APP = 'http://localhost:5173';
const PAGE = 'rgb(253, 251, 246)'; // #FDFBF6
const BAND = 'rgb(250, 245, 234)'; // #FAF5EA
const CHECK_IN = '9028f0ad-293b-4592-9a4e-25b680dd91cd'; // "Sales team, Q3" on the local database

type Reader = { who: string; email: string; paths: string[] };
const READERS: Reader[] = process.env.PAGE_COLOUR_READERS
  ? JSON.parse(process.env.PAGE_COLOUR_READERS)
  : [
      { who: 'participant', email: 'amani.u8@example.test', paths: ['/today', `/grounds/${CHECK_IN}/p`, `/grounds/${CHECK_IN}/board`, '/you', '/company', '/settings', '/checkin/7bad4943-5da2-4bf5-aced-a0aec2682e2d/report'] },
      { who: 'lead', email: 'rukia.u8lead@example.test', paths: ['/today', `/grounds/${CHECK_IN}`, `/grounds/${CHECK_IN}/board`, '/settings/people', '/boards', '/billing', '/billing/checkout', '/settings/billing', '/settings/suites', '/checkin/92ae925e-90b5-42f6-a0d4-6187724049dc/report'] },
      { who: 'admin', email: 'juma.u8admin@example.test', paths: ['/today', `/grounds/${CHECK_IN}/board`, '/settings/people', '/company', '/settings/suites', '/suite/time', '/suite/reviews', '/suite/onboard', '/suite/leave', '/suite/leaving', '/suite/roles', '/suite/spend', '/suite/todos', '/suite/customers', '/suite/equipment'] },
    ];

/* Sign-in is by the emailed link, through the one mail catcher every browser test shares
   (sign-in-by-email.ts). */

test.use({ viewport: { width: 1440, height: 900 } });

/**
 * The two rules, against whatever `path` is already open: the page background is #FDFBF6, and
 * #FAF5EA is painted nowhere on it. Shared by the signed-in readers below and the signed-out
 * screens (group 3, piece 1: sign-in and joining), which open a path directly, with no sign-in.
 *
 * `marginFromLeft`, given, is where the margin check samples instead of the usual point just
 * inside the right edge. The sign-in screen (/auth) is the one deliberate exception this needs:
 * its right half is the prototype's own dark panel (signin.jpg), not the page - so the right edge
 * is never cream there and never should be. For that path this samples a point in the form's own
 * left half instead, which is where the fault the coordinator found (the panel's own beige
 * bleeding into the cream side) actually shows.
 */
async function colourFaults(page: Page, path: string, marginFromLeft: number | null = null): Promise<string[]> {
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const wrong: string[] = [];
  const found = await page.evaluate(({ BAND, marginFromLeft }) => {
    /* The colour that shows at a point: the first element up from it with a background. */
    const at = (x: number, y: number) => {
      let e: Element | null = document.elementFromPoint(x, y);
      while (e) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)') return c;
        e = e.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const band: string[] = [];
    document.querySelectorAll('body *').forEach((e) => {
      if (getComputedStyle(e).backgroundColor === BAND) band.push(`<${e.tagName.toLowerCase()}${(e as HTMLElement).className && typeof (e as HTMLElement).className === 'string' ? '.' + (e as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join('.') : ''}>`);
    });
    const x = marginFromLeft ?? (window.innerWidth - 12);
    return { body: getComputedStyle(document.body).backgroundColor, margin: at(x, window.innerHeight / 2), band: band.slice(0, 5) };
  }, { BAND, marginFromLeft });
  if (found.body !== PAGE) wrong.push(`${path}: the page background is ${found.body}`);
  if (found.margin !== PAGE) wrong.push(`${path}: its sampled point shows ${found.margin}`);
  if (found.band.length) wrong.push(`${path}: #FAF5EA is painted on ${found.band.join(', ')}`);
  return wrong;
}

for (const reader of READERS) {
  test(`every page is cream, as the ${reader.who}`, async ({ page }) => {
    await signIn(page, reader.email);
    const wrong: string[] = [];
    for (const path of reader.paths) {
      await page.goto(`${APP}${path}`);
      wrong.push(...await colourFaults(page, path));
    }
    expect(wrong, 'every page is #FDFBF6 and nothing is #FAF5EA').toEqual([]);
  });
}

/**
 * THE SIGNED-OUT SCREENS (group 3, piece 1: signing in and joining, A2/A3). A picture check found
 * the split sign-in screen's left half painted rgb(247, 241, 229) - #F7F1E5, the kit's soft-fill
 * colour for a tinted panel, not the page itself - where signin.jpg's left half is the page
 * colour. Fixed in gw-ui.css (.gwui-split); this proves it live, and keeps it proven, for every
 * signed-out screen this task rebuilt: the sign-in screen, sign-up, and the two bad-link refusals
 * a stranger reaches from a dead invitation or a cut-short join link. None of these needs
 * signing in - the whole point is that they are what a stranger sees - so no `signIn` call here.
 */
const SIGNED_OUT_PATHS = ['/auth', '/auth?mode=signup', '/join', '/verify-email', '/start'];

test('every signed-out page is cream too', async ({ page }) => {
  const wrong: string[] = [];
  for (const path of SIGNED_OUT_PATHS) {
    await page.goto(`${APP}${path}`);
    /* /auth alone is the split layout: sample its form half (a quarter of the way across), not
       the right edge, which is the prototype's own dark panel by design. */
    wrong.push(...await colourFaults(page, path, path === '/auth' ? 360 : null));
  }
  expect(wrong, 'every signed-out page is #FDFBF6 and nothing is #FAF5EA').toEqual([]);
});
