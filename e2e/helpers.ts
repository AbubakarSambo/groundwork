import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Shared machinery for the ground journeys.
 *
 * Two rules hold everywhere in here:
 *
 * 1. NOTHING IS SEEDED. Accounts are created by filling the real form, links are
 *    followed out of real emails, participants are added through the real screen.
 *    If a step is impossible through the interface, the test fails and that is
 *    the finding - the alternative is a green run that proves nothing.
 *
 * 2. EVERY STEP IS PHOTOGRAPHED. These runs get read afterwards, by someone
 *    deciding whether a report is worth acting on. A pass with no picture of the
 *    screen cannot answer that.
 */

export const MAILCATCHER = 'http://localhost:1080';
export const SHOTS = path.join(__dirname, 'shots');

let shotIndex = 0;

/** Photograph the full page, numbered so the sequence reads in order. */
export async function shot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(SHOTS, { recursive: true });
  shotIndex += 1;
  const file = path.join(SHOTS, `${String(shotIndex).padStart(2, '0')}-${name}.png`);
  // Full page, not the viewport: reports and boards are long, and a thumbnail of
  // the top of one is exactly the thing that hides whether it is any good.
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

/** The newest link sent to an address, followed out of the real email. */
export async function linkFor(to: string, match?: string): Promise<string> {
  const url = `${MAILCATCHER}/link?to=${encodeURIComponent(to)}${match ? `&match=${match}` : ''}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const body = (await res.json()) as { link?: string };
      if (body.link) return body.link;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No emailed link arrived for ${to} within 20s - the flow depends on it`);
}

export async function clearMail(): Promise<void> {
  await fetch(`${MAILCATCHER}/clear`, { method: 'POST' });
}

/**
 * The link out of a SPECIFIC email, chosen by what its subject says.
 *
 * linkFor() takes the newest message, which is right when a person has one thing
 * waiting for them. On a six-person ground it is not: by the time the fourth
 * person opens their invitation, other mail has landed on top of it, and taking
 * the newest opens something else entirely.
 *
 * That is how the release bug surfaced, and it is worth saying which part was
 * the product and which was the harness. Eric really was sent "Your shared record
 * is ready" before he had checked in - that is the product, and it is fixed. What
 * the harness did was follow that email instead of his invitation, and then report
 * a missing join page. Following the wrong link would have been a real person's
 * mistake too, but a journey should say which envelope it opened.
 */
export async function linkFromEmail(to: string, subjectFragment: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const res = await fetch(`${MAILCATCHER}/messages?to=${encodeURIComponent(to)}`);
    if (res.ok) {
      const messages = (await res.json()) as { subject: string; links: string[] }[];
      const wanted = messages.find(
        (m) => m.subject?.toLowerCase().includes(subjectFragment.toLowerCase()) && m.links?.length,
      );
      if (wanted) return wanted.links[0];
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const res = await fetch(`${MAILCATCHER}/messages?to=${encodeURIComponent(to)}`);
  const seen = res.ok ? ((await res.json()) as { subject: string }[]).map((m) => m.subject) : [];
  throw new Error(
    `No email to ${to} with "${subjectFragment}" in the subject arrived within 20s. What did arrive: ${seen.join(' | ') || 'nothing'}`,
  );
}

export async function allMail(): Promise<{ to_header: string; subject: string }[]> {
  const res = await fetch(`${MAILCATCHER}/messages`);
  return res.ok ? ((await res.json()) as any[]) : [];
}

/**
 * Type into the check-in / onboarding box and send.
 *
 * The composer is a plain `input`, not a textarea, and the send control is the
 * arrow button - both found by what the user sees rather than by test ids, so the
 * test breaks if the actual affordance disappears.
 */
/**
 * The box a person types into, on either surface.
 *
 * Onboarding says "Type your response, or add a document with + Doc"; a check-in
 * says "Share what you have been working on." Having two literals in the journey
 * meant a healthy check-in timed out for three minutes against an element that
 * was never going to appear, and read as though the engine had hung. One
 * definition, used everywhere.
 */
export function composer(page: Page) {
  return page.getByPlaceholder(/Type your response|Share what you have been working on/i);
}

export async function say(page: Page, text: string): Promise<void> {
  const box = composer(page);
  await expect(box).toBeVisible({ timeout: 60_000 });
  await expect(box).toBeEnabled({ timeout: 120_000 });
  await box.fill(text);
  await page.getByRole('button', { name: '↑' }).click();

  /**
   * Wait for the engine to come back - OR for the conversation to have ended.
   *
   * The first version waited only for the composer to be re-enabled, which is
   * wrong at a natural ending: when the engine has what it needs it says so,
   * disables the composer and offers the next choice instead. The run then sat
   * for two minutes against a box that was never going to re-enable, and failed -
   * on the product behaving correctly.
   *
   * Ending after two answers rather than three is also normal. The engine stops
   * when it has enough, not after a fixed number of turns, so a journey must not
   * assume a turn count.
   */
  await Promise.race([
    expect(box).toBeEnabled({ timeout: 120_000 }),
    expect(page.getByRole('button', { name: /I'm setting this up for my team|This is my situation/i }).first())
      .toBeVisible({ timeout: 120_000 }),
  ]);
}

/** True when the engine has finished asking and is offering the next choice. */
export async function conversationEnded(page: Page): Promise<boolean> {
  return page
    .getByRole('button', { name: /I'm setting this up for my team|This is my situation/i })
    .first()
    .isVisible()
    .catch(() => false);
}

/** Say something only if the engine is still asking. */
export async function sayIfStillAsking(page: Page, text: string): Promise<boolean> {
  if (await conversationEnded(page)) return false;
  await say(page, text);
  return true;
}

/** Wait until the assistant has actually replied (message count grew). */
export async function waitForReply(page: Page, previousCount: number): Promise<number> {
  await expect
    .poll(async () => (await page.locator('text=/./').allTextContents()).length, { timeout: 120_000, intervals: [2000] })
    .toBeGreaterThan(previousCount);
  return (await page.locator('text=/./').allTextContents()).length;
}

/** Sign a person out without touching anyone else's session. */
export async function signOut(page: Page): Promise<void> {
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}

/** Who the app currently thinks is signed in - read from the real auth store. */
export async function whoAmI(page: Page): Promise<{ email?: string; role?: string }> {
  return page.evaluate(() => {
    try {
      const a = JSON.parse(localStorage.getItem('auth-storage-v2') || '{}');
      return { email: a?.state?.user?.email, role: a?.state?.user?.role };
    } catch { return {}; }
  });
}
