import { test, expect } from '@playwright/test';
import { newWorld } from './user-journeys-world';
import { APP, signUp, signInByLink, askGroundwork, whatIsOnThePage, readsAsPlainSentences } from './user-journeys-helpers';

/**
 * USER JOURNEY 1 OF 4: THE ADMIN (Grace), FIRST HALF. Phase B, item 5 of docs/release-checklist.md.
 *
 * WRITTEN AND TYPE-CHECKED; NOT YET RUN IN A BROWSER. This computer cannot start the client, because
 * client/node_modules lacks @fontsource/atkinson-hyperlegible and @fontsource/literata, and installing
 * them needs Hafsah's yes. The same nine journeys were walked through the API instead
 * (api/journey/user-journeys.ts), which proves what each person is served and what is stored; these
 * specs prove the screens.
 *
 * THE ONE COMMAND, once the fonts are installed, with the API on port 3000 (see docs/screens-handover.md,
 * "How to run it") and the client on port 5173, from the repo root:
 *
 *   cd e2e && npx playwright test journey-1-admin journey-2-lead journey-3-participant journey-4-admin-decides --workers=1
 *
 * The four run in that order, one after the other, because each picks up where the last left off
 * (user-journeys-world.ts holds the made-up people). The admin has two files, because her second half
 * (deciding what people asked for) can only come after the lead and the participants have done theirs. Sign-in is only by emailed links, caught on
 * 127.0.0.1:1025 by the one catcher in sign-in-by-email.ts, so nothing else may be listening there. The
 * API allows five sign-in links a minute, so the journeys keep to that.
 *
 * What the admin does here: 1 signs up; 3 invites the lead and two people to take part; 7 switches on
 * leave and spending; 6 asks Groundwork; 9 opens the Company page. Journey 4 has her decide.
 */
test.describe.configure({ mode: 'serial' });

test('Grace signs up, invites her people, switches on leave and spending, and opens the Company page', async ({ page }) => {
  const w = newWorld();

  await test.step('1. She signs up and opens the link in her email', async () => {
    await signUp(page, { name: 'Grace Achieng', email: w.grace, organisation: w.organisation });
    await expect(page).not.toHaveURL(/\/auth/);
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('3. She invites the lead, and two people to take part, from People', async () => {
    await page.goto(`${APP}/org/members`);
    const list = page.getByLabel(/Write one person on each line, with their name and email/);
    await list.fill(`Wairimu Njoroge, ${w.wairimu}`);
    await page.getByRole('combobox', { name: 'Role' }).selectOption({ label: 'Can open check-ins' });
    await page.getByRole('button', { name: 'Send their invitations' }).click();
    /* Wait for the screen's own sentence before typing the next list: the send reads the box when the check ends, so typing sooner changes who is invited. */
    await expect(page.getByText(/1 person was invited\./).first()).toBeVisible();
    await list.fill(`Amani Wekesa, ${w.amani}\nBaraka Mutua, ${w.baraka}`);
    await page.getByRole('combobox', { name: 'Role' }).selectOption({ label: 'Takes part' });
    await page.getByRole('button', { name: 'Send their invitations' }).click();
    await expect(page.getByText(/2 people were invited\./).first()).toBeVisible();
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('7. She switches on leave and spending on the Suites page', async () => {
    await page.goto(`${APP}/settings/suites`);
    await expect(page.getByText('Only admins see this page.')).toBeVisible();
    for (const suite of ['Leave requests', 'Spending and budgets', 'Performance reviews']) {
      const panel = page.getByRole('region', { name: suite });
      await panel.getByRole('switch', { name: suite }).or(panel.getByRole('checkbox', { name: suite })).first().click();
      /* Some suites ask a question or two first: "Answer these first, and it switches on." */
      if (await panel.getByText('Answer these first, and it switches on.').isVisible().catch(() => false)) {
        for (const box of [...await panel.getByRole('textbox').all(), ...await panel.getByRole('spinbutton').all()]) await box.fill(suite === 'Leave requests' ? '21' : suite === 'Spending and budgets' ? '20000' : '6');
        for (const pick of await panel.getByRole('combobox').all()) await pick.selectOption({ index: 1 });
        await panel.getByRole('button', { name: 'Switch it on' }).click();
      }
      await expect(panel.getByText('On', { exact: true })).toBeVisible();
    }
  });

  await test.step('6. She asks Groundwork what it can do, and reads plain sentences', async () => {
    const panel = await askGroundwork(page, 'What can you help me with?');
    await expect(panel.getByText(/check-in|leave|spending/i).first()).toBeVisible({ timeout: 60_000 });
    readsAsPlainSentences(await panel.innerText());
  });

  await test.step('9. She opens the Company page and reads the company-wide picture without error', async () => {
    await page.goto(`${APP}/company`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const text = await whatIsOnThePage(page);
    readsAsPlainSentences(text);
    expect(text).not.toMatch(/something went wrong|could not load/i);
  });

  await test.step('A returning sign-in by the emailed link brings her back to the same organisation', async () => {
    await signInByLink(page, w.grace);
    await page.goto(`${APP}/today`);
    await expect(page).not.toHaveURL(/\/auth/);
  });
});
