import { test, expect } from '@playwright/test';
const APP = 'http://localhost:5173';
const PW = 'SimPass123!';

/**
 * FINISH WHATEVER IS STILL OPEN.
 *
 * "Complete session" only appears once the engine has offered a wrap-up, so a short conversation can
 * leave a session IN_PROGRESS with no way to close it from the script's first pass. This keeps talking
 * until the control appears, then closes it. Without this the ground never reaches a report.
 */
const OPEN: [string, string][] = [
  ['c1be3cdb-907e-4019-8d0f-8389c4b028f1', 'abubakar@northfield.test'],
  ['c1be3cdb-907e-4019-8d0f-8389c4b028f1', 'adam@northfield.test'],
  ['c1be3cdb-907e-4019-8d0f-8389c4b028f1', 'dara@northfield.test'],
  ['c1be3cdb-907e-4019-8d0f-8389c4b028f1', 'hafsah@northfield.test'],
  ['8ecd67f0-3e08-4371-be18-362c3449d696', 'dara@northfield.test'],
  ['8ecd67f0-3e08-4371-be18-362c3449d696', 'eric@northfield.test'],
  ['1be9c377-440a-41bb-b8b9-53d51c252659', 'dara@northfield.test'],
  ['1be9c377-440a-41bb-b8b9-53d51c252659', 'hafsah@northfield.test'],
];

test.describe.configure({ mode: 'default' });

for (const [gid, email] of OPEN) {
  test(`finish ${email.split('@')[0]} on ${gid.slice(0, 8)}`, async ({ browser }) => {
    test.setTimeout(10 * 60 * 1000);
    const c = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await c.newPage();
    await page.goto(`${APP}/auth`);
    await page.getByLabel(/^Email$/i).fill(email);
    await page.getByLabel(/Password/i).fill(PW);
    await page.getByRole('button', { name: /^Sign in$/ }).click();
    await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 20000 }).catch(() => {});

    await page.goto(`${APP}/grounds/${gid}/p`);
    await page.waitForTimeout(3000);
    for (const re of [/Check in for session/i, /Start (my )?check-?in/i, /Continue/i]) {
      const b = page.getByRole('button', { name: re }).first();
      if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(3000); break; }
    }

    /** Keep answering until the wrap-up control shows up, then take it. */
    for (let turn = 0; turn < 6; turn++) {
      const done = page.getByRole('button', { name: /Complete session/i }).first();
      if (await done.count()) break;
      const box = page.locator('input[type="text"]:visible, textarea:visible').last();
      if (!(await box.count()) || !(await box.isEditable().catch(() => false))) break;
      await box.fill(turn === 0
        ? 'That is my honest read of where this stands.'
        : 'Nothing further from me, that is everything.').catch(() => {});
      const send = page.getByRole('button', { name: /^(↑|Send)$/ }).last();
      if (await send.count()) await send.click().catch(() => {}); else await box.press('Enter').catch(() => {});
      const before = ((await page.textContent('body')) ?? '').length;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1500);
        const now = (await page.textContent('body')) ?? '';
        if (now.length > before + 60 && !/Thinking/i.test(now.slice(-400))) break;
      }
    }

    const done = page.getByRole('button', { name: /Complete session/i }).first();
    if (await done.count()) {
      await done.click().catch(() => {});
      await page.waitForTimeout(2500);
      const conf = page.getByRole('button', { name: /Finish check-?in|Confirm|Yes/i }).first();
      if (await conf.count()) { await conf.click().catch(() => {}); await page.waitForTimeout(4000); }
      console.log(`FINISHED ${email} on ${gid.slice(0, 8)}`);
    } else {
      console.log(`STILL OPEN ${email} on ${gid.slice(0, 8)}: no Complete session control appeared`);
    }
    await c.close();
    expect(true).toBe(true);
  });
}
