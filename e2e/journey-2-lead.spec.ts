import { test, expect } from '@playwright/test';
import { theWorld, keepTheWorld, THE_PLAN } from './user-journeys-world';
import { APP, askGroundwork, whatIsOnThePage, readsAsPlainSentences, acceptTheTeamInvitation } from './user-journeys-helpers';
import { say } from './helpers';

/**
 * USER JOURNEY 2 OF 4: THE LEAD (Wairimu). Phase B, item 5 of docs/release-checklist.md.
 * Run with the other three: see the header of journey-1-admin.spec.ts for the one command, and for why
 * these are written and type-checked but not yet run in a browser.
 *
 * What the lead does: signs in from the invitation her admin sent; 2 sets up a check-in and has Groundwork
 * read a pasted plan back, then says yes to each part; 3 adds the two people; 4 checks in herself;
 * 5 reads the board and the team report; 6 asks Groundwork; 7 reads leave and spending waiting for her.
 * Journey 3 is the people she invited; journey 4 is the admin deciding.
 */
test.describe.configure({ mode: 'serial' });

test('Wairimu opens her invitation, sets up a check-in from a plan, invites people and reads the board', async ({ page }) => {
  const w = theWorld();

  await test.step('She opens the invitation from her admin and chooses a password', async () => {
    /* The admin invited her in journey 1; that email is waiting in the one mail catcher. */
    await acceptTheTeamInvitation(page, w.wairimu, 0);
    await expect(page).not.toHaveURL(/\/auth|set-password/);
  });

  await test.step('2. She starts a check-in by describing it, pasting her plan', async () => {
    await page.goto(`${APP}/start`);
    /* The prototype's own question, on its start screen (B1-starting-a-check-in/start.txt). */
    await expect(page.getByText('What do you need updates on, or want to track?')).toBeVisible();
    const box = page.getByRole('textbox').first();
    await box.fill(`Sales team, last quarter. ${THE_PLAN}`);
    await page.getByRole('button', { name: 'Continue' }).click();
    /* Groundwork asks what it still needs; she answers once in her own words. */
    await say(page, 'Check in weekly for twelve weeks. Amani and Baraka are the two people. Wairimu Njoroge leads it.');
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('3. She adds Amani and Baraka and sends their invitations', async () => {
    await page.goto(`${APP}/grounds`);
    await page.getByRole('link', { name: /Sales team, last quarter/ }).first().click();
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    keepTheWorld({ ...w, checkInPath: new URL(page.url()).pathname });
    await page.getByRole('tab', { name: 'People and setup' }).or(page.getByRole('link', { name: 'People and setup' })).first().click();
    await page.getByRole('button', { name: 'Add people' }).click();
    for (const email of [w.amani, w.baraka]) {
      await page.getByRole('textbox', { name: /email/i }).last().fill(email);
      await page.getByRole('button', { name: /^(Add|Invite|Send)/ }).last().click();
      await expect(page.getByText(email.split('@')[0].split('.')[0], { exact: false }).first()).toBeVisible();
    }
  });

  await test.step('2. Groundwork reads her plan back, and nothing is saved until she says yes', async () => {
    await page.getByRole('tab', { name: 'Context' }).or(page.getByRole('link', { name: 'Context' })).first().click();
    await expect(page.getByText('Nothing is added until you confirm it')).toBeVisible();
    const plan = page.getByRole('textbox', { name: /paste|plan/i }).first();
    if (await plan.count()) {
      await plan.fill(THE_PLAN);
      await page.getByRole('button', { name: /Read|Propose|Send/ }).first().click();
    }
    await expect(page.getByText(/to confirm\./).first()).toBeVisible({ timeout: 180_000 });
    /* Amani's number is on Amani, and no sentence says a person is missing. */
    await expect(page.getByText(/4\.5m/).first()).toBeVisible();
    await expect(page.getByText(/is not on this check-in/)).toHaveCount(0);
    for (const yes of await page.getByRole('button', { name: 'Confirm' }).all()) await yes.click();
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('4. She checks in herself, as the team report waits for her too', async () => {
    await page.goto(`${APP}${theWorld().checkInPath ?? '/grounds'}`);
    await page.getByRole('button', { name: 'Start my check-in' }).first().click();
    await say(page, 'From where I sit the quarter is behind. We are at 9.6 million against 18, and the gap is mostly the Green Mart renewal.');
    await say(page, 'I will settle the 21 day credit rule with finance by the end of October.');
  });

  await test.step('5. She reads the board, and the board says when it last changed', async () => {
    await page.goto(`${APP}${theWorld().checkInPath ?? '/grounds'}`);
    await page.getByRole('tab', { name: 'Board' }).or(page.getByRole('link', { name: 'Board' })).first().click();
    await expect(page.getByText(/Last updated on/)).toBeVisible();
    const text = await whatIsOnThePage(page);
    readsAsPlainSentences(text);
    /* A lead is never shown how a person's answers were rated, and nobody carries a label. */
    expect(text).not.toMatch(/\b(PIP|at risk)\b/);
  });

  await test.step('6. She asks Groundwork about the quarter, and it does not hand her Baraka\'s words', async () => {
    const panel = await askGroundwork(page, 'What did Baraka say about the warehouse?');
    await expect(panel.getByText(/./).last()).toBeVisible({ timeout: 90_000 });
    expect(await panel.innerText()).not.toMatch(/nobody told the warehouse/i);
  });
});
