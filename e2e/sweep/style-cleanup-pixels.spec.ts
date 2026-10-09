import { test, Browser, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PIXEL PROOF FOR THE STYLE CLEAN-UP (Hafsah, "swapping them in cannot change a pixel").
 *
 * Saves full-page PNGs of BoardPage, signed in as the lead and as a member, on two boards of
 * different kinds (one report-ready with both of them in it, one still active with only the
 * lead), at 1440 and 390. Run once before a batch of `FlexRow`/`Text` swaps and once after; a
 * separate script (compare-style-shots.py) diffs the two sets pixel by pixel.
 *
 * STYLE_SWEEP_DIR picks where the PNGs land (one of the three scratchpad folders the task asked
 * for: style-before, a repeat of style-before to learn the page's own noise, or style-after).
 * STYLE_SWEEP_DIR must be set - this spec refuses to guess and overwrite the wrong set.
 */

const CLIENT = 'http://localhost:5173';
const OUT_DIR = process.env.STYLE_SWEEP_DIR;
if (!OUT_DIR) throw new Error('Set STYLE_SWEEP_DIR to the folder these screenshots should land in.');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CREDS = {
  lead: { email: 'tendai@kijani.test', password: 'review-local-only' },
  member: { email: 'esther@kijani.test', password: 'review-local-only' },
} as const;
type Role = keyof typeof CREDS;

// Same fixed, hand-verified Kijani Foods ids small-states.spec.ts and page-audit.spec.ts use.
const GROUND_REPORT_READY = 'f9ad5070-c16d-4aa8-b56a-2cb2ae646871'; // lead+member both participants, REPORT_READY
const GROUND_LEAD_ACTIVE = 'bb076fe3-94ae-4898-bb95-ced5bb5d77f4'; // tendai only, ACTIVE

// Freezes everything that would otherwise differ between two screenshots of the SAME page: no
// transitions or animations mid-frame, and no blinking caret in any focused field.
const FREEZE_CSS = '* { transition: none !important; animation: none !important; caret-color: transparent !important }';

async function signInPassword(page: Page, email: string, password: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${CLIENT}/auth`);
    await page.locator('#signin-email').fill(email);
    await page.locator('#signin-password').fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    try {
      await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 10000 });
      await page.waitForTimeout(500);
      return;
    } catch {
      // Sign-in sometimes lands back on /auth under load - try again rather than
      // photograph the sign-in page as if it were the board.
    }
  }
  throw new Error(`Could not sign in as ${email} after 3 attempts`);
}

const states: Record<Role, string> = {} as Record<Role, string>;
async function stateFor(browser: Browser, role: Role): Promise<string> {
  if (states[role]) return states[role];
  const { email, password } = CREDS[role];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await signInPassword(page, email, password);
  const p = path.join(OUT_DIR!, `.state-${role}.json`);
  await ctx.storageState({ path: p });
  await ctx.close();
  states[role] = p;
  return p;
}

type Shot = { slug: string; role: Role; groundId: string; width: number };

const SHOTS: Shot[] = [
  { slug: 'report-ready-lead', role: 'lead', groundId: GROUND_REPORT_READY, width: 1440 },
  { slug: 'report-ready-lead', role: 'lead', groundId: GROUND_REPORT_READY, width: 390 },
  { slug: 'report-ready-member', role: 'member', groundId: GROUND_REPORT_READY, width: 1440 },
  { slug: 'report-ready-member', role: 'member', groundId: GROUND_REPORT_READY, width: 390 },
  { slug: 'active-lead', role: 'lead', groundId: GROUND_LEAD_ACTIVE, width: 1440 },
  { slug: 'active-lead', role: 'lead', groundId: GROUND_LEAD_ACTIVE, width: 390 },
];

for (const shot of SHOTS) {
  test(`board pixels: ${shot.slug} at ${shot.width}`, async ({ browser }) => {
    const statePath = await stateFor(browser, shot.role);
    const ctx: BrowserContext = await browser.newContext({
      storageState: statePath,
      viewport: { width: shot.width, height: shot.width === 390 ? 844 : 900 },
    });
    const page = await ctx.newPage();
    await page.goto(`${CLIENT}/grounds/${shot.groundId}/board`);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    if (new URL(page.url()).pathname.startsWith('/auth')) {
      // The saved session didn't hold - sign in again, in this same context, then retry.
      await signInPassword(page, CREDS[shot.role].email, CREDS[shot.role].password);
      await page.goto(`${CLIENT}/grounds/${shot.groundId}/board`);
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    }
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.waitForTimeout(1000);
    const file = path.join(OUT_DIR!, `${shot.slug}-${shot.width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    await ctx.close();
  });
}
