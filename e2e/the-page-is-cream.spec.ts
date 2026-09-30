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
      { who: 'participant', email: 'amani.u8@example.test', paths: ['/today', `/grounds/${CHECK_IN}/p`, `/grounds/${CHECK_IN}/board`, '/you', '/company', '/settings'] },
      { who: 'lead', email: 'rukia.u8lead@example.test', paths: ['/today', `/grounds/${CHECK_IN}`, `/grounds/${CHECK_IN}/board`, '/settings/people', '/boards', '/billing', '/billing/checkout', '/settings/billing'] },
      { who: 'admin', email: 'juma.u8admin@example.test', paths: ['/today', `/grounds/${CHECK_IN}/board`, '/settings/people', '/company'] },
    ];

/* Sign-in is by the emailed link, through the one mail catcher every browser test shares
   (sign-in-by-email.ts). */

test.use({ viewport: { width: 1440, height: 900 } });

for (const reader of READERS) {
  test(`every page is cream, as the ${reader.who}`, async ({ page }) => {
    await signIn(page, reader.email);
    const wrong: string[] = [];
    for (const path of reader.paths) {
      await page.goto(`${APP}${path}`);
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2500);
      const found = await page.evaluate(({ BAND }) => {
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
        return { body: getComputedStyle(document.body).backgroundColor, margin: at(window.innerWidth - 12, window.innerHeight / 2), band: band.slice(0, 5) };
      }, { BAND });
      if (found.body !== PAGE) wrong.push(`${path}: the page background is ${found.body}`);
      if (found.margin !== PAGE) wrong.push(`${path}: the page's right margin shows ${found.margin}`);
      if (found.band.length) wrong.push(`${path}: #FAF5EA is painted on ${found.band.join(', ')}`);
    }
    expect(wrong, 'every page is #FDFBF6 and nothing is #FAF5EA').toEqual([]);
  });
}
