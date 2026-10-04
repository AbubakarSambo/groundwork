import { test, expect } from '@playwright/test';
import { theWorld, keepTheWorld, THE_PLAN } from './user-journeys-world';
import { APP, askGroundwork, whatIsOnThePage, readsAsPlainSentences, acceptTheTeamInvitation } from './user-journeys-helpers';
import { say, composer } from './helpers';

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
    /* Signed in, she meets the prototype's other screen (B1-starting-a-check-in/new.txt), not the signed-out one. */
    await expect(page.getByText('What do you want your team to check in about?')).toBeVisible();
    const box = page.getByRole('textbox').first();
    await box.fill(`Sales team, last quarter. ${THE_PLAN}`);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    /* Groundwork asks what it still needs; she answers once in her own words. */
    /* The engine goes on asking what it still needs; she answers in her own words until it offers to start. */
    const answers = [
      'Check in weekly for twelve weeks. Amani and Baraka are the two people. Wairimu Njoroge leads it.',
      'I run the team. I want us lined up for the final push, and to understand why we are behind.',
      'Call it Sales team, last quarter. Start it now.',
      'Yes, that is right. Please go ahead.',
      'Yes, go ahead.',
    ];
    for (const a of answers) {
      /* How many questions it asks changes from one run to the next; sometimes it needs none. */
      await Promise.race([
        page.getByRole('button', { name: 'I set this up and check in myself' }).waitFor({ timeout: 20_000 }),
        composer(page).waitFor({ timeout: 20_000 }),
      ]).catch(() => undefined);
      if (await page.getByRole('button', { name: 'I set this up and check in myself' }).isVisible().catch(() => false)) break;
      await say(page, a);
    }
    /* It has what it needs and asks one thing more: does she check in herself? She does (step 4). */
    await page.getByRole('button', { name: 'I set this up and check in myself' }).click();
    /* Her own first check-in starts on the same screen ("Setup is done. Your check-in starts here."). */
    await expect(page.getByText('Setup is done. Your check-in starts here.')).toBeVisible({ timeout: 120_000 });
    await say(page, 'From where I sit the quarter is behind. We are at 9.6 million against 18, and the gap is mostly the Green Mart renewal.');
    await say(page, 'I will settle the 21 day credit rule with finance by the end of October.');
    await page.getByRole('button', { name: 'End session' }).first().click();
    await expect(page.getByText('End this session?')).toBeVisible();
    await page.getByRole('button', { name: 'End session' }).last().click();
    /* The report takes about half a minute; then she saves it to her own sign-in. */
    const save = page.getByRole('button', { name: 'Save this' });
    await expect(save).toBeEnabled({ timeout: 180_000 });
    await save.click();
    await page.waitForURL(/\/grounds\/[0-9a-f-]{8,}/, { timeout: 180_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    keepTheWorld({ ...w, checkInPath: new URL(page.url()).pathname });
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('3. She adds Amani and Baraka and sends their invitations', async () => {
    await page.goto(`${APP}${theWorld().checkInPath}`);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    /* The tabs are links to the same page with ?tab=; opening the page itself lands on her own check-in. */
    await page.goto(`${APP}${theWorld().checkInPath}?tab=settings`);
    await page.getByRole('button', { name: 'Add people' }).click();
    for (const email of [w.amani, w.baraka]) {
      await page.getByRole('textbox', { name: /email/i }).last().fill(email);
      await page.getByRole('button', { name: /^(Add|Invite|Send)/ }).last().click();
      await expect(page.getByText(email.split('@')[0].split('.')[0], { exact: false }).first()).toBeVisible();
    }
  });

  await test.step('2. Groundwork reads her plan back, and nothing is saved until she says yes', async () => {
    await page.goto(`${APP}${theWorld().checkInPath}?tab=context`);
    /* The Context tab's "From a plan": she pastes the plan, and every card waits for her own yes. */
    await expect(page.getByRole('heading', { name: 'From a plan' })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Paste a plan instead' }).click();
    await page.getByLabel('Paste your plan here').fill(THE_PLAN);
    await page.getByRole('button', { name: 'Read this plan' }).click();
    /* It says back how many things it found; nothing is saved until she confirms each card. */
    await expect(page.getByText(/to confirm\. Nothing goes into Context until you do\./)).toBeVisible({ timeout: 180_000 });
    await expect(page.getByRole('heading', { name: 'Waiting for you to confirm' })).toBeVisible();
    /* Amani's number is on Amani, and no sentence says a person is missing. */
    await expect(page.getByText(/is not on this check-in/)).toHaveCount(0);
    const confirms = page.getByRole('button', { name: 'Confirm', exact: true });
    while (await confirms.count() > 0) {
      const before = await confirms.count();
      await confirms.first().click();
      await expect(confirms).toHaveCount(before - 1, { timeout: 30_000 });
    }
    /* The number is kept, and is Amani's (read below in her own card), whatever the check-in ends up being called. */
    await expect(page.getByText(/4\.5 million|4,500,000/).first()).toBeVisible({ timeout: 60_000 });
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('4. She checks in herself, as the team report waits for her too', async () => {
    /* She already gave her first answers and saved them while setting the check-in up (step 2), so there is nothing more to start here. */
    await page.goto(`${APP}${theWorld().checkInPath ?? '/grounds'}`);
  });

  await test.step('5. She reads the board, and the board says when it last changed', async () => {
    await page.goto(`${APP}${theWorld().checkInPath}/board`);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    await page.waitForTimeout(3000);
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
