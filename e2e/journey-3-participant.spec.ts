import { test, expect } from '@playwright/test';
import { theWorld } from './user-journeys-world';
import { APP, askGroundwork, whatIsOnThePage, readsAsPlainSentences, acceptTheTeamInvitation } from './user-journeys-helpers';
import { say } from './helpers';
import { linkSentTo } from './sign-in-by-email';

/**
 * USER JOURNEY 3 OF 4: A PERSON WHO TAKES PART (Amani). Phase B, item 5 of docs/release-checklist.md.
 * Run with the other three: see the header of journey-1-admin.spec.ts for the one command, and for why
 * these are written and type-checked but not yet run in a browser.
 *
 * What she does: opens her team invitation and her check-in invitation; 4 checks in, in her own words;
 * 5 reads the board and the team report, which show her no judgement of her; 6 asks Groundwork, and is never
 * given Baraka's words; 7 asks for leave and for spending; and sees where each stands on her requests page.
 */
test.describe.configure({ mode: 'serial' });

test('Amani opens her invitation, checks in, reads the board, asks Groundwork and asks for leave', async ({ page }) => {
  const w = theWorld();

  await test.step('She opens the invitation to the organisation, then the one to the check-in', async () => {
    await acceptTheTeamInvitation(page, w.amani, 0);
    const invite = await linkSentTo(page, w.amani, /invite\?token=[0-9A-Za-z_-]+/, 0);
    await page.goto(invite);
    /* The invitation names the lead and the check-in (A3-organisations-and-joining/join-invite.txt). */
    /* Having accepted the organisation's invitation just now, she has already joined: the screen says so and offers her check-in. */
    await expect(page.getByRole('heading', { name: /already joined|invited you/ })).toBeVisible();
    readsAsPlainSentences(await whatIsOnThePage(page));
    const go = /Pick up where I left off|Start my check-in|Join|Continue/;
    await page.getByRole('button', { name: go }).or(page.getByRole('link', { name: go })).first().click();
  });

  await test.step('4. She answers in her own words, and Groundwork replies in plain sentences', async () => {
    await say(page, 'Honestly it has been a mixed week. Harbor Foods closed at 3.1 million so far, but the Green Mart renewal proposal has not gone out yet.');
    await say(page, 'Green Mart keeps changing who signs it off. I will send it by Friday now that I have the new name.');
    await say(page, 'What worries me most is credit. Two of my dealers are paying at 45 days.');
    await say(page, 'That is everything from me, thank you.');
    await expect(page.getByText(/Is anything wrong\?|That.s all for today/i).first()).toBeVisible({ timeout: 120_000 });
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('4. She finishes, and reads what was written down from her answers', async () => {
    await page.getByRole('button', { name: /Complete|Finish|Done|Submit/i }).first().click();
    await expect(page.getByText(/Done\. Thanks, Amani\./).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('Two reports come from this')).toBeVisible();
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('5. She reads the board; it shows the team\'s picture and never a judgement of her', async () => {
    await page.goto(`${APP}${theWorld().checkInPath}/board`);
    await expect(page.getByText(/Last updated on/)).toBeVisible({ timeout: 60_000 });
    const text = await whatIsOnThePage(page);
    readsAsPlainSentences(text);
    expect(text).not.toMatch(/\b(PIP|at risk)\b/);
  });

  await test.step('6. She asks Groundwork what she said, and is not given Baraka\'s words', async () => {
    const panel = await askGroundwork(page, 'What did Baraka say about the warehouse?');
    await expect(panel.getByText(/./).last()).toBeVisible({ timeout: 90_000 });
    expect(await panel.innerText()).not.toMatch(/nobody told the warehouse|dispatch day/i);
  });

  await test.step('7. She asks for leave in her own words; it is said back; she says yes', async () => {
    const panel = await askGroundwork(page, 'I would like leave from 20 October to 22 October please.');
    await expect(panel.getByText(/20 October/).first()).toBeVisible({ timeout: 90_000 });
    await panel.getByRole('button', { name: 'Yes' }).last().click();
    await page.goto(`${APP}/suite/mine`);
    await expect(page.getByRole('heading', { name: 'Your requests', exact: true })).toBeVisible();
    await expect(page.getByText(/20 October/).first()).toBeVisible();
    readsAsPlainSentences(await whatIsOnThePage(page));
  });
});
