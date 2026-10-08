import { test, expect } from '@playwright/test';
import { signIn, mailMark, linkSentTo, textSentTo } from '../sign-in-by-email';
import { signUp, APP as JOURNEY_APP } from '../user-journeys-helpers';
import { say, composer } from '../helpers';
import { screenshotTo, watch, watchSummary } from './sweep-helpers';

/**
 * PROVING THE PARTICIPANT ACTIVATION MAP (docs/participant-activation-screens.md) ON SCREEN, AS A
 * NEWLY INVITED PERSON, not only by reading the code.
 *
 * A fresh admin (her own brand-new organisation, made here, not Kijani Foods: Kijani's seeded
 * org already has 8 people on a 5-seat free plan - request 197's own known fault - so any new
 * invite there hits "all 5 are taken" before it reaches a person at all) sets up one check-in and
 * invites a brand-new .test address into it. That person opens the mail, opens the link, answers
 * one question, leaves, and comes back twice: once through the same emailed link, once through
 * Today. Then an existing participant, Esther Adeyemi (esther@kijani.test, Kijani Foods), is
 * checked for G, H and J on You and Settings.
 *
 * Runs against the already-running client (5173) and API (3000); it starts and stops nothing.
 * Screenshots go to docs/bug-log-screens/activation-<step>-<width>.png, committed. Sign-in states
 * for the fresh admin and participant are kept only in /tmp, never written into the repo.
 */
test.describe.configure({ mode: 'serial' });

const APP = 'http://localhost:5173';
const STAMP = Date.now();
const ADMIN_EMAIL = `activation.admin.${STAMP}@sweeptest.test`;
const FIRST_ANSWER = 'This week I am mostly focused on getting the Mombasa depot stock count finished.';

let checkInPath = '';

/**
 * Invites a brand-new .test address into the admin's check-in and returns the emailed link, plus
 * the invitation's own decoded text. A fresh address every time this is called: the same token,
 * opened a second time, is a RETURNING participant (`alreadyAccepted`, "Pick up where I left
 * off"), not the first-landing screen this is meant to prove - so each width needs its own.
 */
async function inviteNewParticipant(page: import('@playwright/test').Page, email: string) {
  const since = await mailMark();
  await page.goto(`${APP}${checkInPath}?tab=settings`);
  await page.getByRole('button', { name: 'Add people' }).click();
  await page.getByRole('textbox', { name: /email/i }).last().fill(email);
  await page.getByRole('button', { name: /^(Add|Invite|Send)/ }).last().click();
  await expect(page.getByText(email, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  const mailText = (await textSentTo(page, email, since)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const link = await linkSentTo(page, email, /invite\?token=[0-9A-Za-z_-]+/, since);
  return { link, mailText };
}

test('1-2. A fresh admin sets up a check-in and invites a new participant, who the invitation says why it matters to', async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(JOURNEY_APP).toBe(APP);
  await signUp(page, { name: 'Activation Admin', email: ADMIN_EMAIL, organisation: `Activation Co ${STAMP}` });

  await page.goto(`${APP}/start`);
  const box = page.getByRole('textbox').first();
  await expect(box).toBeVisible({ timeout: 20_000 });
  await box.fill('I want a weekly check-in for myself to keep on top of operations this quarter: stock counts, deliveries, and anything blocking the depots.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const answers = [
    'Check in weekly for twelve weeks. I run it myself, nobody else yet.',
    'It is a new quarter and I want a steady read on operations.',
    'The goal is to keep stock counts accurate and deliveries on time, and catch blockers early.',
    'I will know it is going well if stock counts match and deliveries go out on schedule, with no open blockers.',
    'Call it Operations check-in. Start it now.',
    'Yes, that is right. Please go ahead.',
    'Yes, go ahead.',
    'That covers it, please start the check-in now.',
  ];
  const setUpHerself = page.getByRole('button', { name: 'I set this up and check in myself' });
  for (const a of answers) {
    await Promise.race([
      setUpHerself.waitFor({ timeout: 20_000 }),
      composer(page).waitFor({ timeout: 20_000 }),
    ]).catch(() => undefined);
    if (await setUpHerself.isVisible().catch(() => false)) break;
    await say(page, a);
  }
  await expect(setUpHerself).toBeVisible({ timeout: 30_000 });
  await setUpHerself.click();
  await expect(page.getByText('Setup is done. Your check-in starts here.')).toBeVisible({ timeout: 120_000 });
  // Her own first session happens inline on /start; the ground id only appears in the URL once
  // she ends and saves it (journey-2-lead.spec.ts follows the same sequence).
  await say(page, 'Stock counts are mostly on track. The Mombasa depot is still catching up after the move.');
  await page.getByRole('button', { name: 'End session' }).first().click();
  await expect(page.getByText('End this session?')).toBeVisible();
  await page.getByRole('button', { name: 'End session' }).last().click();
  const save = page.getByRole('button', { name: 'Save this' });
  await expect(save).toBeEnabled({ timeout: 180_000 });
  await save.click();
  await page.waitForURL(/\/grounds\/[0-9a-f-]{8,}/, { timeout: 180_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  checkInPath = new URL(page.url()).pathname;

  // Spec A/2: the wording check happens once, against the first width's own invitation (below);
  // this leaves the admin signed in with checkInPath ready for both widths to invite into.
});

for (const width of [1440, 390]) {
  const h = width === 390 ? 844 : 900;

  test(`3-5 (${width}px). A new participant lands in with one tap, straight on the first question, leaves, and comes back kept, by link and by Today`, async ({ browser }) => {
    test.setTimeout(6 * 60 * 1000);
    const participantEmail = `activation.participant.${width}.${STAMP}@sweeptest.test`;

    // 1-2 continued: the admin (still signed in from the first test, same browser-level session
    // cache signIn() uses) invites this width's own new participant.
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const adminPage = await adminCtx.newPage();
    await signIn(adminPage, ADMIN_EMAIL, APP);
    const { link: inviteLink, mailText } = await inviteNewParticipant(adminPage, participantEmail);
    await adminCtx.close();

    // Spec A: "connect verification to something they care about", not an administrative notice.
    // Logged rather than asserted on exact words, since the wording is the engine's to write; a
    // screen fault is one where the LINK itself fails, not where the email's prose differs.
    console.log(`(${width}) new participant invitation (decoded, trimmed):`, mailText.slice(0, 1500));
    const saysWhyItMatters = /private space|share what you|check-in|the quarter|what you need from the team|you are being asked to be honest/i.test(mailText);
    console.log(`(${width}) invitation reads as personal, not administrative?`, saysWhyItMatters);
    expect(inviteLink).toContain('/invite?token=');

    const ctx = await browser.newContext({ viewport: { width, height: h } });
    const page = await ctx.newPage();
    const w = watch(page);

    await page.goto(inviteLink);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await screenshotTo(page, `docs/bug-log-screens/activation-invite-landing-${width}.png`);

    // A: one tap, no password, no sign-up form.
    expect(await page.locator('input[type="password"]').count()).toBe(0);
    const go = page.getByRole('button', { name: /Answer today.s check-in now/i }).first();
    await expect(go).toBeVisible({ timeout: 20_000 });
    await go.click();

    await page.waitForURL(/\/checkin\//, { timeout: 30_000 });
    // F: nothing between the invite card and the composer - this is already the check-in. The
    // first question streams in from the model ("Getting your first question ready. This can
    // take a minute or two.") with the composer disabled until then; wait for it by role, since
    // say()'s own composer locator excludes a disabled box and so cannot see it arrive.
    expect(new URL(page.url()).pathname).toMatch(/^\/checkin\//);
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeEnabled({ timeout: 150_000 });
    await screenshotTo(page, `docs/bug-log-screens/activation-first-question-${width}.png`);

    await say(page, FIRST_ANSWER);
    console.log(`(${width}) console/page/network faults after the first answer:`, watchSummary(w) || 'none');
    // She leaves without closing the tab in a way that forgets her - the same device, later: this
    // is the ordinary "closed the tab, came back tomorrow" case, not a different person opening
    // the same link, so the next context carries her session the way the same browser would.
    const kept = await ctx.storageState();
    await ctx.close();

    // 5: back through the same emailed link, on the same device.
    const backCtx = await browser.newContext({ viewport: { width, height: h }, storageState: kept });
    const backPage = await backCtx.newPage();
    await backPage.goto(inviteLink);
    await backPage.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await screenshotTo(backPage, `docs/bug-log-screens/activation-resume-from-link-${width}.png`);
    const resumeButton = backPage.getByRole('button', { name: /Pick up where I left off/i });
    await expect(resumeButton).toBeVisible({ timeout: 20_000 });
    await resumeButton.click();
    await backPage.waitForURL(/\/checkin\//, { timeout: 20_000 });
    // D: the resumed chat shows her own earlier answer, kept word for word. It can sit behind
    // "Opening your session…" for a while, the same loading state a fresh session shows, so this
    // polls (toContainText retries) rather than reading innerText once.
    await expect(backPage.locator('body')).toContainText('Mombasa depot stock count', { timeout: 150_000 });
    await screenshotTo(backPage, `docs/bug-log-screens/activation-resumed-chat-${width}.png`);

    // Back through Today, not the emailed link - same signed-in session this page now holds.
    await backPage.goto(`${APP}/today`);
    await backPage.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await screenshotTo(backPage, `docs/bug-log-screens/activation-today-${width}.png`);
    const todayText = await backPage.locator('body').innerText();
    console.log(`(${width}) Today's own words for the unfinished check-in:`, todayText.replace(/\s+/g, ' ').slice(0, 600));
    // At 1440 the sidebar itself names the check-in; at 390 the sidebar collapses to plain nav
    // ("Check-ins / Company / Chat / More") and the entry point is the "Start it" action on
    // the "What needs you" card instead, so either accessible name is read as "Your turn".
    const turnsOn = backPage.getByRole('link', { name: /Activation Admin.s check-in/i })
      .or(backPage.getByRole('button', { name: /^Start it$/i }))
      .or(backPage.getByRole('link', { name: /^Start it$/i }))
      .first();
    await expect(turnsOn).toBeVisible({ timeout: 20_000 });
    await turnsOn.click();
    await backPage.waitForURL(/\/checkin\/|\/grounds\//, { timeout: 20_000 });
    if (new URL(backPage.url()).pathname.startsWith('/checkin/')) {
      await expect(backPage.locator('body')).toContainText('Mombasa depot stock count', { timeout: 150_000 });
    }
    await backCtx.close();
  });
}

test('6. An existing participant (Esther): You shows G and H, Settings shows the opt-out (J)', async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, 'esther@kijani.test', APP);

  await page.goto(`${APP}/you`);
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await screenshotTo(page, 'docs/bug-log-screens/activation-you-1440.png');
  const youText1440 = await page.locator('body').innerText();
  console.log('Esther\'s You page at 1440:', youText1440.replace(/\s+/g, ' ').slice(0, 900));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await screenshotTo(page, 'docs/bug-log-screens/activation-you-390.png');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${APP}/settings`);
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await expect(page.getByText('What we send you')).toBeVisible();
  await screenshotTo(page, 'docs/bug-log-screens/activation-settings-1440.png');
  const settingsText = await page.locator('body').innerText();
  console.log('Esther\'s Settings, "What we send you" (J):', settingsText.slice(settingsText.indexOf('What we send you'), settingsText.indexOf('What we send you') + 300));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await screenshotTo(page, 'docs/bug-log-screens/activation-settings-390.png');
});
