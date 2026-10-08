import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

/*
 * SCREENSHOTS FOR THE THREE RESTORED SCREENS (A1-A3) AND THE DRAWN-FROM-SERVER ITEMS (B1, B2, B5),
 * 8 October. Run against the sweep test bed, copy a, started separately on its own ports so the
 * ordinary dev client (5173) and API (3000) are never touched:
 *   API:    http://127.0.0.1:3201  (gw_sweep_a, started directly with `node dist/main.js`)
 *   client: http://localhost:5180  (VITE_PROXY_TARGET=http://127.0.0.1:3201 vite --port 5180)
 * Riverbank Trading (existingOrg) is the seed used throughout: it has people with no name on
 * record, leave on and spend/time off, and "Sales organisation" is at session 2 of 12 with a
 * later session already started for some people (sessionClock.whileOpen).
 */
const OUT = '/Users/hafsahjumare/Documents/GitHub/groundwork/docs/bug-log-screens';
const CLIENT = 'http://localhost:5180';
mkdirSync(OUT, { recursive: true });

const WIDTHS = [1440, 390];
const HEIGHT = { 1440: 900, 390: 844 };
const PASSWORD = 'Sweep-local-only-1';
const SALES_GROUND = 'b51ef7ea-9304-40ab-a379-224d5c56dd15';

async function shot(page, url, name, opts = {}) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: HEIGHT[w] });
    await page.goto(url, { waitUntil: 'networkidle' });
    if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(opts.settle ?? 600);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: false });
    console.log(`wrote ${name}-${w}.png`);
  }
}

async function shotNoReload(page, name, opts = {}) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: HEIGHT[w] });
    await page.waitForTimeout(opts.settle ?? 500);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: false });
    console.log(`wrote ${name}-${w}.png`);
  }
}

async function newSignedInPage(browser, email, password) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.stack));
  await page.goto(`${CLIENT}/auth`);
  await page.waitForTimeout(500);
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  const passBox = page.locator('input[type="password"]').first();
  if (await passBox.count()) await passBox.fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(1500);
  return { ctx, page };
}

const browser = await chromium.launch();

// --- A1 + B5: "Begin the last check-in" at session 2 of 12 (not near the end), and the header's
// sessionClock.says + whileOpen, both read on "Sales organisation" where Mira is the lead. ---
{
  const { ctx, page } = await newSignedInPage(browser, 'lead@riverbank.test', PASSWORD);
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: HEIGHT[w] });
    await page.goto(`${CLIENT}/grounds/${SALES_GROUND}?tab=sessions`, { waitUntil: 'networkidle' });
    const button = page.getByRole('button', { name: 'Begin the last check-in' });
    await button.waitFor({ timeout: 15000 });
    await button.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/restored-begin-the-last-check-in-${w}.png` });
    console.log(`wrote restored-begin-the-last-check-in-${w}.png`);
  }
  await ctx.close();
}

// --- A2: Today's "Your own leave and spending requests" / "Your own requests" link, decided per
// suite - Riverbank Trading has leave on, spend and time sheets off, so the link still shows. ---
{
  const { ctx, page } = await newSignedInPage(browser, 'dov@riverbank.test', PASSWORD);
  await shot(page, `${CLIENT}/today`, 'restored-your-own-requests-link', { waitFor: 'text=Morning' });
  await ctx.close();
}

// --- A3: the leave request form stays up (with a "Try again") on a 5xx loading it, not just an
// error note. Routed through Playwright so the server itself is never touched. ---
{
  const { ctx, page } = await newSignedInPage(browser, 'dov@riverbank.test', PASSWORD);
  await page.route('**/api/v1/suites/leave/form', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"Something went wrong."}' }));
  await shot(page, `${CLIENT}/suite/leave/new`, 'restored-leave-form-stays-up-on-a-fault', { waitFor: 'text=Try again' });
  await ctx.close();
}

// --- B1: displayName everywhere a name goes in the People list, never an address - seven of
// twelve people at Riverbank Trading have no name on record. ---
{
  const { ctx, page } = await newSignedInPage(browser, 'lead@riverbank.test', PASSWORD);
  await shot(page, `${CLIENT}/org/members`, 'drawn-displayname-in-people-list', { waitFor: 'text=Someone who has not given a name yet' });
  await ctx.close();
}

// --- B2: the colleague picker shows team and role beside the name. Opened from People and setup
// on "Sales organisation", "Add people". ---
{
  const { ctx, page } = await newSignedInPage(browser, 'lead@riverbank.test', PASSWORD);
  await page.goto(`${CLIENT}/grounds/${SALES_GROUND}?tab=settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const addPeople = page.getByRole('button', { name: 'Add people' });
  if (await addPeople.count()) {
    await addPeople.first().click();
    await page.waitForTimeout(500);
    const find = page.getByLabel('Find a colleague');
    if (await find.count()) await find.first().click();
  }
  await shotNoReload(page, 'drawn-colleague-picker-role-and-team');
  await ctx.close();
}

// --- B3 + B4: a paste that keeps some people with no seat on the plan (kind: 'INVITATION'), and
// the name read beside each address in the preview. Riverbank Trading is on Small Team (cap 20)
// with 12 people, so ten more addresses leaves some with no seat. ---
{
  const { ctx, page } = await newSignedInPage(browser, 'lead@riverbank.test', PASSWORD);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${CLIENT}/org/members`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const pasteBox = page.getByLabel('Write one person on each line, with their name and email. Or paste a list from a spreadsheet.');
  const names = ['Aiko Tanaka', 'Bo Lindqvist', 'Chiamaka Eze', 'Dmitri Volkov', 'Elin Berg', 'Farah Haidari', 'Giulia Russo', 'Hamid Reza', 'Ingrid Solberg', 'Jace Okoro'];
  const pasted = names.map((n, i) => `${n}, shot${i}@riverbank-screenshot.test`).join('\n');
  await pasteBox.fill(pasted);
  // First click runs the preview (check.mutate), which shows each row's own result - including
  // the name read beside each address (B4) - without sending anything yet.
  await page.getByRole('button', { name: 'Send their invitations' }).click();
  await page.waitForTimeout(1200);
  await shotNoReload(page, 'drawn-paste-preview-names-and-no-seat');
  // Second click (a different label once the preview is up) actually sends the list; the server
  // holds whichever have no seat as bare invitations (kind: 'INVITATION') rather than dropping
  // them, so they show up under "No seat on your plan" once the page is read again (B3).
  const sendRest = page.getByRole('button', { name: /^Send \d+ invitations?$/ });
  if (await sendRest.count()) {
    await sendRest.first().click();
    await page.waitForTimeout(1200);
  }
  await shot(page, `${CLIENT}/org/members`, 'drawn-invitation-kept-with-no-seat', { waitFor: 'text=No seat on your plan' });
  await ctx.close();
}

await browser.close();
console.log('done');
