import { Page, expect } from '@playwright/test';
import { shot, linkFromEmail, signOut, composer } from './helpers';

/**
 * The parts of a ground journey that are the same whatever the ground is about.
 *
 * Lifted out of ground1.spec.ts once ground 2 needed all of it. Every comment
 * here was written against a real failure on a real run, so they are kept
 * verbatim rather than summarised: each one is the reason a check exists in the
 * shape it does, and the shapes are not obvious.
 *
 * The only thing that changes between grounds is which ground on the list to
 * open, so that is a parameter and nothing else is.
 */

/** Open a named ground from the list, the way a person would: by clicking it. */
export async function openGround(page: Page, label: string): Promise<void> {
  await page.getByText(label, { exact: false }).first().click();
  await page.waitForURL(/\/grounds\/[0-9a-f-]{8,}/, { timeout: 30_000 });
}

/** Sign in with a password already set, through the real form. */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await signOut(page);
  await page.goto('/auth');
  // Found by what the person sees: the field is labelled Email but its
  // placeholder is "you@company.com", so a /email/i placeholder match finds
  // nothing and the run dies on a blank sign-in form.
  await page.getByPlaceholder(/you@company/i).fill(email);
  await page.getByPlaceholder('••••••••').fill(password);

  /**
   * THE RATE LIMITER IS REAL, AND A TWELVE-SESSION JOURNEY TRIPS IT.
   *
   * A run died here at session eleven, forty minutes in, on the sign-in form
   * showing "ThrottlerException: Too Many Requests" - because this journey signs
   * two people in and out roughly twenty-four times inside an hour, which no
   * real person does and the limiter is right to refuse.
   *
   * So the limit is waited out rather than raised or switched off. Turning it
   * down for tests would mean the journey no longer runs against the product
   * that ships, and this is exactly the sort of thing worth finding: the screen
   * it produced was a bug, and it was only visible because the run hit it.
   */
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByRole('button', { name: /^Sign in$/i }).click();
    try {
      await page.waitForURL(/\/grounds|\/$/, { timeout: 20_000 });
      return;
    } catch {
      const rateLimited = await page.getByText(/too many/i).count();
      if (!rateLimited) throw new Error(`sign-in did not go through for ${email}`);
      console.log('[note] the rate limiter refused a sign-in. Waiting it out, as a person would.');
      await page.waitForTimeout(65_000);
    }
  }
  throw new Error(`sign-in stayed rate limited for ${email}`);
}

/**
 * Somebody who joined by link has no password and cannot come back for session 2
 * without one.
 *
 * The product already saw this: joining sends "Set a password for Groundwork"
 * unprompted. That email is followed here rather than shortcut, because a
 * participant's ability to RETURN is the whole difference between a one-off
 * survey and a ground that runs for a quarter - and it would be entirely
 * possible to ship a join flow that works once and strands the person after.
 */
export async function setPasswordFromEmail(page: Page, email: string, password: string): Promise<void> {
  await signOut(page);
  const link = await linkFromEmail(email, 'password');
  await page.goto(link);
  const pw = page.locator('input[type=password]');
  await expect(pw.first(), 'the password email led somewhere with no password field').toBeVisible({ timeout: 30_000 });
  await pw.nth(0).fill(password);
  await pw.nth(1).fill(password).catch(() => undefined);
  await page.getByRole('button', { name: /Set password/i }).click();
  await page.waitForURL(/\/grounds|\/chat|\/$/, { timeout: 60_000 });
}

/**
 * Does the ground still offer this person a next check-in?
 *
 * WAITS FOR A DEFINITIVE ANSWER, and this is the whole point of the function.
 *
 * The first version returned false when the "Start session N" button was not
 * visible within twenty seconds. But the next session's row is created just
 * after the previous one completes, so "not there yet" and "there is no next
 * session" look identical for a few seconds - and because this function is also
 * the loop's exit condition, a slow moment read as "the ground is finished".
 *
 * The run went green having completed ONE session of thirteen, printed "the
 * ground ran 1 sessions per person", and went on to read the report as though
 * the ground were done. A journey that can pass without doing the thing is worse
 * than no journey.
 *
 * THERE IS A THIRD STATE, and it is the normal one once a ground has more than
 * one person in it. When one person has finished every session and another is
 * still mid-check-in, the page correctly shows NEITHER a start button nor "every
 * session done": there is nothing for them to start and the ground is not over.
 * They are waiting on somebody else. So the wait is for the PAGE, not for a
 * particular answer on it, and "nothing for me right now" is a legitimate one.
 *
 * The anti-false-pass property is unaffected: a loop ending early is caught
 * afterwards, by requiring the ground to say it is finished.
 */
export async function hasNextSession(page: Page, email: string, password: string, label: string): Promise<boolean> {
  await signIn(page, email, password);
  await openGround(page, label);

  await expect(
    page.getByRole('button', { name: 'Overview' }),
    `the ground page never loaded for ${email}`,
  ).toBeVisible({ timeout: 90_000 });

  const start = page.getByRole('button', { name: /Start session \d+/i });
  return start.isVisible({ timeout: 15_000 }).catch(() => false);
}

/**
 * One person's next check-in, entered the way they would enter it.
 *
 * Through the ground page and its own "Start session N" button - not by
 * navigating to a check-in URL. The button is the thing under test: if a
 * returning participant cannot find their way to session 4 from the screen they
 * land on, the cadence does not exist in practice however many rows are in the
 * database.
 */
export async function runNextSession(
  page: Page,
  email: string,
  password: string,
  label: string,
  answers: string[],
): Promise<void> {
  await signIn(page, email, password);
  await openGround(page, label);

  const start = page.getByRole('button', { name: /Start session \d+/i });
  await expect(
    start,
    `no way in to the next session from the ground page for ${email} - the cadence is unreachable`,
  ).toBeVisible({ timeout: 60_000 });
  const button = ((await start.textContent()) ?? '').trim();
  await start.click();
  await page.waitForURL(/\/checkin\/|\/chat\//, { timeout: 60_000 });

  await finishCheckIn(page, answers);
  await shot(page, `${email.split('@')[0]}-${button.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
}

/**
 * Answer a check-in until the engine says it has enough.
 *
 * MUST NOT SILENTLY DO NOTHING. The first version broke out of the loop whenever
 * the composer was not immediately visible-and-enabled, swallowed every error,
 * and returned quietly - so a run where the engine was still writing its opening
 * question sent zero answers, took a screenshot called "checkin-complete", and
 * passed. The database afterwards showed the check-in still NOT_STARTED with no
 * record entries.
 *
 * A journey that can succeed without doing the thing is worse than no journey, so
 * this now waits properly for the opener, and fails loudly if nothing was sent.
 *
 * The engine still decides when a session ends - two answers on one run, three on
 * another - so leftover prompts are simply not offered.
 */
export async function finishCheckIn(page: Page, answers: string[]): Promise<void> {
  const box = composer(page);

  // The opening question is a real model call; it is normal for this to take a
  // while, and NOT normal for it never to arrive.
  await expect(box, 'the check-in never became answerable').toBeVisible({ timeout: 120_000 });

  /**
   * PRESS "TRY AGAIN" IF OPENING FAILED, BECAUSE A PERSON WOULD.
   *
   * Opening a check-in is one request, and it intermittently does not happen - a
   * thirteen-session run died at session 9 with the check-in still NOT_STARTED
   * and zero turns recorded, while the same session opened first time when driven
   * by hand afterwards (201 Created). I could not reproduce it on demand.
   *
   * The product already handles this: the failure sets openFailed and renders a
   * "Try again" button. My journey did not know that button existed, so it waited
   * out the composer, then pressed the completion controls on a session that had
   * never opened - and reported the whole thing as a hang.
   *
   * Pressing it is not papering over the defect. It is what the screen asks the
   * person to do, and NOT doing it was the harness failing to drive the product
   * as written. The attempt is logged so an opening that needs a retry is still
   * visible as a finding rather than disappearing into a green run.
   */
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await box.isEnabled().catch(() => false)) break;
    const tryAgain = page.getByRole('button', { name: /Try again/i });
    if (await tryAgain.isVisible().catch(() => false)) {
      console.log('[finding] the check-in failed to open and offered "Try again". Pressing it, as a person would.');
      await tryAgain.click();
    }
    await box.isEnabled({ timeout: 60_000 }).catch(() => undefined);
  }

  await expect(box, 'the composer never enabled - no opening question arrived').toBeEnabled({ timeout: 180_000 });

  /**
   * A BUSY COMPOSER IS NOT A CLOSED SESSION, and reading it as one silently
   * truncated a check-in.
   *
   * This used to break out of the loop the moment the box was not enabled. But
   * the box is disabled for the whole time the engine is thinking, which on a
   * six-person ground is regularly longer than the previous wait allowed - and
   * that wait swallowed its own timeout. So the third answer was never typed, the
   * session sat on two, and sixty seconds later the run failed with "no way to
   * finish this check-in was ever offered" - blaming the product for a screen
   * that was working exactly as intended.
   *
   * The same shape as every other harness bug on this journey: absence taken as
   * an answer. Being disabled means "not yet"; only a completion control or a
   * finished session means "no more".
   */
  const sessionIsOver = async () =>
    (await page.getByRole('button', { name: /Back to grounds|Complete session|Finish check-in/i }).first().isVisible().catch(() => false));

  const readyForAnother = async (): Promise<boolean> => {
    for (let waited = 0; waited < 180; waited += 3) {
      if (await box.isEnabled().catch(() => false)) return true;
      if (await sessionIsOver()) return false;
      await page.waitForTimeout(3000);
    }
    return false;
  };

  let sent = 0;
  for (const answer of answers) {
    if (!(await readyForAnother())) break;   // the engine closed the session
    await box.fill(answer);
    await page.getByRole('button', { name: '↑' }).click();
    sent += 1;

    // Wait for the reply, or for the session to close - whichever comes first.
    await Promise.race([
      expect(box).toBeEnabled({ timeout: 180_000 }),
      expect(page.getByText(/record is here|session is complete|Thank you/i).first())
        .toBeVisible({ timeout: 180_000 }),
    ]).catch(() => undefined);
  }

  expect(sent, 'a check-in that sent no answers is not a check-in').toBeGreaterThan(0);

  /**
   * Declared here because BOTH the reply check below and the keep-talking loop
   * further down use it. It lived under the loop, which put it in the temporal
   * dead zone for the check that runs first - a runtime throw that no amount of
   * type checking would have caught.
   */
  const extraTurns = [
    'That is the main thing from my side this week.',
    'Nothing else outstanding that I can point to.',
    'That is everything from me for this session.',
  ];

  /**
   * THE ENGINE'S REPLY IS THE PROOF. THE PERSON'S OWN WORDS ARE NOT.
   *
   * Third version of this check, and the first two were both wrong in ways worth
   * recording, because each looked convincing.
   *
   *   v1 counted any long text on the page. The page chrome satisfied that on its
   *      own, so a session that recorded nothing still passed.
   *   v2 looked for the person's own words in the conversation. But the chat
   *      ECHOES WHAT YOU TYPE IMMEDIATELY, locally, before the server has been
   *      asked anything. So it passed on a check-in that never opened and never
   *      stored a syllable - which is exactly what happened to one session: it
   *      stayed NOT_STARTED with zero turns while the journey typed three answers
   *      into it and moved on.
   *
   * Only the assistant's reply requires a round trip. If new text appeared that
   * is not something we typed, the server was reached. If the only new text on
   * the page is our own, nothing left the browser.
   *
   * The general lesson, which cost two runs: proving a write landed means finding
   * something only the WRITER could have produced. Our own words came back
   * because the page is helpful, not because anything was saved.
   */
  const mine = answers.concat(extraTurns).map(a => a.toLowerCase());
  const engineReplied = await page.evaluate((typed: string[]) => {
    // Every visible line of the conversation, minus the ones we typed ourselves.
    const texts = Array.from(document.querySelectorAll('div'))
      .map(el => (el.textContent ?? '').trim())
      .filter(t => t.length > 40 && t.length < 4000);
    return texts.some(t => !typed.some(m => t.toLowerCase().includes(m)));
  }, mine);

  expect(
    engineReplied,
    'the only words in this conversation are the ones we typed, so nothing ever reached the server: the check-in never opened and the answers are lost',
  ).toBe(true);

  /**
   * KEEP TALKING UNTIL A WRAP-UP IS OFFERED, which is what a person does.
   *
   * There are two ways to reach the confirm step, and both need the session to be
   * in a state that offers one: the engine closing the session itself ("Complete
   * session"), or three answers on record ("Not seeing a wrap-up? Complete
   * session"). If the engine has not closed and fewer than three answers landed,
   * neither appears - and the scripted answers have run out.
   *
   * That is not a defect, it is the engine deciding it does not have enough yet.
   * The person in the chair would carry on answering, so this does: a few more
   * turns, each one a real thing someone would say, until a way to finish is
   * offered. Failing here without trying would report a product problem where
   * there is only a script that ran dry.
   */
  const completionOffered = () => page.getByRole('button', { name: /Complete session/i });
  const alreadyFinished = () => page.getByRole('button', { name: /Back to grounds/i });

  for (const extra of extraTurns) {
    if (await completionOffered().isVisible().catch(() => false)) break;
    if (await alreadyFinished().isVisible().catch(() => false)) break;
    if (!(await readyForAnother())) break;
    await box.fill(extra);
    await page.getByRole('button', { name: '↑' }).click();
    await expect(box).toBeEnabled({ timeout: 180_000 }).catch(() => undefined);
  }

  /**
   * A session the engine already closed is FINISHED, not stuck.
   *
   * Since the "already complete" fix, a check-in the server has closed shows its
   * record card and "Back to grounds" - and correctly offers neither completion
   * control, because there is nothing left to complete. The journey used to
   * insist on the two-step dance and failed on a session that was already done.
   */
  if (await alreadyFinished().isVisible().catch(() => false)) {
    await expect(
      page.getByRole('button', { name: /Complete session|Finish check-in/i }),
      'a finished session must not still be offering a way to finish',
    ).toHaveCount(0);
    return;
  }

  /**
   * Finishing is TWO deliberate steps, and that is by design.
   *
   *   "Complete session ✓"  ->  a confirm panel  ->  "Finish check-in ✓"
   *
   * The panel says why: "Once you finish, this session's record is locked in and
   * cross-referenced with the others." Locking someone's account behind a single
   * click would be the wrong trade, so the product asks twice.
   *
   * I clicked only the first and treated the session as done. Both check-ins sat
   * at IN_PROGRESS, nothing was extracted, and no report could exist - a journey
   * that looked complete and had finished nothing.
   *
   * The confirm panel may already be open, in which case there is no "Complete
   * session" to press - that button is what OPENS the panel, and both are hidden
   * while it is up. Insisting on pressing it first fails on a screen that is
   * already showing exactly what we want.
   */
  const finish = page.getByRole('button', { name: /Finish check-in/i });

  if (!(await finish.isVisible().catch(() => false))) {
    const complete = completionOffered();
    await expect(
      complete,
      'no way to finish this check-in was ever offered, after every scripted answer and three more besides',
    ).toBeVisible({ timeout: 60_000 });
    await complete.click();
  }

  await expect(finish, 'the confirm step never appeared').toBeVisible({ timeout: 60_000 });
  await finish.click();

  /**
   * IF THE SERVER SAYS KEEP TALKING, KEEP TALKING.
   *
   * Completing can be refused, on purpose and correctly:
   *
   *   400 "A few more exchanges are needed before this check-in can close - the
   *        record is still thin. Answer one or two more questions."
   *
   * That is the product protecting the record from a session with nothing in it,
   * and the message says exactly what to do. A person would answer another
   * question and press finish again, so this does.
   */
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await finish.isVisible().catch(() => false))) break;
    if (!(await box.isEnabled().catch(() => false))) break;

    /**
     * SAY WHAT WAS OBSERVED, NOT WHAT WAS ASSUMED.
     *
     * This printed "completing was refused as too thin" whenever the finish
     * button was still on screen a moment after being clicked - which is also
     * what a slow close looks like, and completing takes minutes on a full
     * record. So it reported a server refusal that had not happened.
     *
     * It cried wolf about forty times in one run and I quoted the number as
     * evidence of a product defect. There WAS a real defect underneath it, and
     * it is fixed; this line was not the thing that proved it. The API log was.
     */
    console.log('[note] the finish button is still on screen. Answering once more and pressing again, as a person would.');
    await box.fill('One more thing worth putting down: the work I described is what I actually spent the week on.');
    await page.getByRole('button', { name: '↑' }).click();
    await expect(box).toBeEnabled({ timeout: 180_000 }).catch(() => undefined);

    const again = page.getByRole('button', { name: /Complete session/i });
    if (await again.isVisible().catch(() => false)) await again.click();
    if (await finish.isVisible().catch(() => false)) await finish.click();
  }

  /**
   * Completion is what writes the record and cross-references it. If this never
   * arrives, nothing downstream - report or board - can exist.
   *
   * It is also SLOW, and it gets slower for the lead. Measured across one ground,
   * seconds from start to completed:
   *
   *     session 1   lead  25    participant 39
   *     session 2   lead  29    participant 37
   *     session 3   lead 206    participant 39
   *
   * The participant's is flat. The lead's grew to three and a half minutes by
   * session 3 and exceeded this wait at session 4, which is what killed the run.
   * Whatever completion does for the lead scales with the record; the
   * participant's does not.
   *
   * Eight minutes here so the journey measures the product rather than my
   * patience. The wait itself is logged as a finding, not accepted: for those
   * three and a half minutes the screen still shows a "Finish check-in" button,
   * which reads as a click that did not register.
   */
  const closing = Date.now();
  await expect(
    finish,
    'the session never closed, so nothing was written to the record',
  ).toBeHidden({ timeout: 8 * 60_000 });
  const took = Math.round((Date.now() - closing) / 1000);
  if (took > 60) console.log(`[finding] completing this check-in took ${took}s with a "Finish check-in" button on screen throughout.`);
}
