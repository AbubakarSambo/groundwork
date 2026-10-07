import { test } from '@playwright/test';
import { pageAs } from './privacy-sign-in-once';

/** Signs in every reader the L4-L8 privacy sweep uses, slowly enough to stay under five links a minute. */
const PEOPLE = (process.env.SWEEP_PEOPLE || '').split(',').filter(Boolean);

test('sign in every reader once', async ({ browser }) => {
  test.setTimeout(30 * 60 * 1000);
  for (const email of PEOPLE) {
    const t0 = Date.now();
    const page = await pageAs(browser, email);
    console.log(email, '->', page.url());
    await page.context().close();
    const spent = Date.now() - t0;
    if (spent > 3000) await new Promise((r) => setTimeout(r, Math.max(0, 13000 - spent)));
  }
});
