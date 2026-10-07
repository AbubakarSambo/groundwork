import { test, expect, Page } from '@playwright/test';
import { signIn } from './sign-in-by-email';

/**
 * THE FLOATING FEEDBACK TRIGGER NEVER COVERS A CONTROL ON /start, AT 390px (reviewer, third round,
 * faults C1-C3).
 *
 * Read live at 375x812, signed in: the open "How many sessions" control's own help line ran past
 * the frame's edge and was clipped; "End session" (the quick-actions row) sat fully under the
 * trigger; and the trigger covered the end of the fork's second choice, "I check in once to set
 * the context, then only they check in". All three are fixed in gw-ui.css
 * (`.gwui-ec-sessions-count`, `.gwui-ec-quick-actions-end`, `.gwui-ec-fork`, each under
 * `max-width: 640px`) - this proves it against the real floating trigger
 * (`nothing-overlaps-at-in-between-widths.spec.ts` deliberately excludes that trigger from its own
 * checks, since a fixed corner is a known, separate problem; this is the dedicated check for it).
 *
 * Deep-links into each state with `gw_entry_session` rather than driving a live conversation
 * through the engine, the same fixture shape the page's own unit tests already seed - so this
 * stays fast and deterministic instead of depending on what the model happens to say.
 *
 * Run against the local servers (client on localhost:5173, API on 127.0.0.1:3000):
 *
 *   cd e2e && npx playwright test the-feedback-trigger-clears-start.spec.ts
 */

const APP = 'http://localhost:5173';
const ADMIN_EMAIL = 'juma.u8admin@example.test';

async function seedSession(page: Page, session: Record<string, unknown>) {
  await page.goto(`${APP}/start`);
  await page.evaluate((s) => localStorage.setItem('gw_entry_session', JSON.stringify(s)), session);
  await page.goto(`${APP}/start`);
  await page.waitForTimeout(500);
}

type Box = { x: number; y: number; width: number; height: number };

function boxesOverlap(a: Box, b: Box): boolean {
  const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return ix > 2 && iy > 2;
}

test.describe('the Feedback trigger clears /start at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('clears the open sessions control and "End session" (faults C1, C2)', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL);
    await seedSession(page, {
      scenario: 'PIP', closed: false, flowPath: 'self', onboardingStep: 7,
      history: [{ role: 'assistant', content: 'How is it going?' }],
      sessions: 1, cadence: 'WEEKLY', cadenceChosen: true,
      onboardingSelections: { mode: 'new', initial: 'x', classifiedScenario: 'PIP' },
    });

    const sessionsButton = page.getByRole('button', { name: /session,? planned|Edit number of sessions/ }).first();
    await sessionsButton.click();

    const helpLine = page.getByText('This is your plan for how many check-ins to run.', { exact: false });
    await expect(helpLine).toBeVisible();
    const frame = page.locator('.gwui-ec-frame');
    const helpBox = await helpLine.boundingBox();
    const frameBox = await frame.boundingBox();
    expect(helpBox, 'the help line has a box').not.toBeNull();
    expect(frameBox, 'the frame has a box').not.toBeNull();
    /* FAULT C1: the help line used to run to x=483, past the frame's own 390px-wide edge. */
    expect(helpBox!.x + helpBox!.width, 'the help line stays inside the frame, not clipped past its edge')
      .toBeLessThanOrEqual(frameBox!.x + frameBox!.width + 1);

    const endSession = page.getByRole('button', { name: 'End session' }).first();
    await expect(endSession).toBeVisible();
    const feedback = page.getByRole('button', { name: /Feedback/ }).first();
    await expect(feedback).toBeVisible();
    const endBox = await endSession.boundingBox();
    const fbBox = await feedback.boundingBox();
    expect(endBox).not.toBeNull();
    expect(fbBox).not.toBeNull();
    /* FAULT C2: "End session" used to sit fully under the Feedback trigger. */
    expect(
      boxesOverlap(endBox!, fbBox!),
      '"End session" does not overlap the Feedback trigger',
    ).toBe(false);
  });

  test('clears the fork\'s own choices (fault C3)', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL);
    await seedSession(page, {
      scenario: 'NEW_PROJECT', closed: false, history: [], onboardingStep: 3, onboardingReady: true,
      onboardingHistory: [
        { role: 'assistant', content: 'Tell me about it.' },
        { role: 'user', content: 'A new project with Daniel and Grace.' },
      ],
      onboardingSelections: {
        mode: 'new', initial: 'A new project with Daniel and Grace.', classifiedScenario: 'NEW_PROJECT',
        peopleNamed: ['Daniel', 'Grace'], goals: ['launch on time'],
      },
    });

    const second = page.getByRole('button', { name: /I check in once to set the context/ });
    await expect(second).toBeVisible();
    const feedback = page.getByRole('button', { name: /Feedback/ }).first();
    await expect(feedback).toBeVisible();
    const secondBox = await second.boundingBox();
    const fbBox = await feedback.boundingBox();
    expect(secondBox).not.toBeNull();
    expect(fbBox).not.toBeNull();
    expect(
      boxesOverlap(secondBox!, fbBox!),
      'the fork\'s second choice does not overlap the Feedback trigger',
    ).toBe(false);
  });
});
