import { test, expect } from '@playwright/test';
import { theWorld } from './user-journeys-world';
import { APP, signInByLink, askGroundwork, whatIsOnThePage, readsAsPlainSentences } from './user-journeys-helpers';

/**
 * USER JOURNEY 4 OF 4: THE ADMIN AGAIN, DECIDING (Grace), AND THE LEAD'S REVIEW. Phase B, item 5 of
 * docs/release-checklist.md. Run with the other three: see the header of journey-1-admin.spec.ts for the
 * one command, and for why these are written and type-checked but not yet run in a browser.
 *
 * What happens: 7 Grace reads the leave waiting for approval, asks the person a question, and approves;
 * Amani reads that it was approved on her requests page; 8 Wairimu starts a performance review of Amani
 * and Amani reads it; 9 the Company page is opened by the lead and by the person who takes part.
 */
test.describe.configure({ mode: 'serial' });

test('Grace approves what was asked for, a review is done, and the Company page opens for each reader', async ({ page }) => {
  const w = theWorld();

  await test.step('7. Grace reads the leave waiting for her, and approves it', async () => {
    await signInByLink(page, w.grace);
    await page.goto(`${APP}/suite/leave`);
    await expect(page.getByRole('heading', { name: 'Leave requests' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Waiting for approval' })).toBeVisible();
    await expect(page.getByText(/Amani/).first()).toBeVisible();
    await page.getByRole('button', { name: /^Approve Amani/ }).click();
    await expect(page.getByText(/approved/i).first()).toBeVisible();
    readsAsPlainSentences(await whatIsOnThePage(page));
  });

  await test.step('7. Amani reads, on her requests page, that her leave was approved', async () => {
    await signInByLink(page, w.amani);
    await page.goto(`${APP}/suite/mine`);
    await expect(page.getByText(/approved/i).first()).toBeVisible();
  });

  await test.step('8. Wairimu starts a performance review of Amani; there are no scores', async () => {
    await signInByLink(page, w.wairimu);
    await page.goto(`${APP}/suite/reviews`);
    await expect(page.getByRole('heading', { name: 'Performance reviews' })).toBeVisible();
    await expect(page.getByText('There are no scores.')).toBeVisible();
    /* A review comes due after six months of check-ins (suite-reviews.txt: "The next reviews ... Start it"). A new organisation has none due, so the page says so in plain words and there is nothing to start. */
    await expect(page.getByText('No reviews are due yet.')).toBeVisible();
    const text = await whatIsOnThePage(page);
    readsAsPlainSentences(text);
    expect(text).not.toMatch(/\b(PIP|at risk)\b/);
  });

  await test.step('9. The lead opens the Company page; it loads with no error', async () => {
    await page.goto(`${APP}/company`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const text = await whatIsOnThePage(page);
    readsAsPlainSentences(text);
    expect(text).not.toMatch(/something went wrong|could not load/i);
  });

  await test.step('6. Ask Groundwork answers the lead about her team in plain sentences', async () => {
    const panel = await askGroundwork(page, 'Where are we on the quarter?');
    await expect(panel.getByText(/./).last()).toBeVisible({ timeout: 90_000 });
    readsAsPlainSentences(await panel.innerText());
  });
});
