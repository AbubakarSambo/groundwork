import { test } from '@playwright/test';
import { pageAs } from './privacy-sign-in-once';

/**
 * ENGINE'S SIX SCREEN ITEMS AND PIECE 7 (review, 9 October): sign each person in once, keeping the
 * signed-in state in the session's scratch folder (SWEEP_STATE_DIR), never in the repo. Five links a
 * minute at most, so it waits between people.
 */
const PEOPLE = (process.env.PEOPLE || 'tendai@kijani.test,naomi@kijani.test,esther@kijani.test,amina@suites.test,daniel@suites.test,grace@suites.test').split(',');

test('sign each person in once', async ({ browser }) => {
  for (const [i, email] of PEOPLE.entries()) {
    if (i > 0 && i % 4 === 0) await new Promise((r) => setTimeout(r, 65000));
    const page = await pageAs(browser, email);
    await page.context().close();
  }
});
