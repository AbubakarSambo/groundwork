import { Page, Browser } from '@playwright/test';
import { Persona, answerFor, EVIDENCE_BAIT } from './personas';
import { APP, PW, note, shot, mailLink, signIn, ctx, pageText, dashesIn } from './harness';

export interface GroundSpec {
  n: number;
  card: RegExp;          // which scenario card to click
  label: string;         // what Sahar calls it
  brief: string;         // the situation in her words
  lead: Persona;
  participants: Persona[];
  sessions: number;
  timelineText: string;  // what she types when asked how long / how often
}

/**
 * ONE GROUND, START TO FINISH, THROUGH THE SCREENS.
 *
 * Sequential by contract: the caller runs these one at a time. Only the SESSIONS inside a ground fan
 * out, which is the only concurrency that does not corrupt the org state or the free/paid gate.
 */
export async function runGround(browser: Browser, spec: GroundSpec, sahar: Persona) {
  const g = spec.n;
  const c = await ctx(browser);
  const page = await c.newPage();

  // ---- Sahar signs in as a returning admin -------------------------------------------------
  const ok = await signIn(page, sahar);
  if (!ok) { note(g, 'signin', `BLOCKER: Sahar could not sign in with a password. Ground ${g} cannot start.`); await c.close(); return null; }

  // ---- the free/paid gate, read BEFORE creating -------------------------------------------
  await page.goto(`${APP}/grounds`);
  await page.waitForTimeout(1200);
  await shot(page, g, '01-grounds-list');
  const listText = await pageText(page);

  // ---- create the ground ------------------------------------------------------------------
  await page.goto(`${APP}/grounds/new`);
  await page.waitForTimeout(1500);
  await shot(page, g, '02-scenario-cards');

  const cardText = await pageText(page);
  const cardDashes = dashesIn(cardText);
  if (cardDashes.length) note(g, 'dash-cards', `Em/en dashes on the scenario picker:\n` + cardDashes.map(d => `  "${d}"`).join('\n'));

  const card = page.locator('div,button,label').filter({ hasText: spec.card }).first();
  const found = await card.count();
  if (!found) {
    note(g, 'card', `BLOCKER: no scenario card matched ${spec.card}. Cards present: ${cardText.slice(0, 400)}`);
    await c.close(); return null;
  }
  await card.click().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, g, '03-card-picked');

  /**
   * The second required choice sits BELOW the cards and is only announced after the first is made
   * (G1-09). Scroll and take whatever radio-like control is there.
   */
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(500);
  await shot(page, g, '04-below-the-cards');

  // Continue through the wizard, capturing each step.
  for (let step = 0; step < 8; step++) {
    const cont = page.getByRole('button', { name: /Continue|Next|Create|Open the ground|Save/i }).first();
    if (!(await cont.count())) break;
    const disabled = await cont.isDisabled().catch(() => false);
    if (disabled) {
      // Try to satisfy whatever it wants: pick the first unchosen option on screen.
      const opt = page.locator('input[type="radio"], [role="radio"]').first();
      if (await opt.count()) await opt.click().catch(() => {});
      const ta = page.locator('textarea').first();
      if (await ta.count()) await ta.fill(spec.brief).catch(() => {});
      await page.waitForTimeout(400);
    }
    await cont.click().catch(() => {});
    await page.waitForTimeout(1400);
    await shot(page, g, `05-wizard-${step}`);
    if (/\/grounds\/[0-9a-f-]{36}/.test(page.url())) break;
  }

  const url = page.url();
  const idm = url.match(/\/grounds\/([0-9a-f-]{36})/);
  if (!idm) {
    note(g, 'create', `BLOCKER: ground was not created. Ended at ${url}. Page said: ${(await pageText(page)).slice(0, 500)}`);
    await c.close(); return null;
  }
  const groundId = idm[1];
  note(g, 'created', `Ground created: ${groundId}`);
  await shot(page, g, '06-ground-page');

  await c.close();
  return { groundId };
}
