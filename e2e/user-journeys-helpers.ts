import { expect, Page } from '@playwright/test';
import { linkSentTo, mailMark } from './sign-in-by-email';

/**
 * THE STEPS THE THREE USER JOURNEYS SHARE, as a person takes them: sign up by the emailed link, sign in
 * by the emailed link, open an invitation, ask Groundwork a question. Everything is found by what a
 * person sees (a role and the words on it, taken from the prototype's screens in
 * docs/prototype/screens), never by a class or an id.
 */
export const APP = 'http://localhost:5173';

/** Sign up from nothing: the form, the email, the link. The organisation is made when the link is opened. */
export async function signUp(page: Page, o: { name: string; email: string; organisation: string }) {
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: 'New here? Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByLabel('Your name').fill(o.name);
  await page.getByLabel('Email', { exact: true }).fill(o.email);
  await page.getByLabel('Your organisation (optional)').fill(o.organisation);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Create account' }).click();
  /* The prototype's own words for the next screen. */
  await expect(page.getByText('Check your email')).toBeVisible();
  const link = await linkSentTo(page, o.email, /verify-email\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
}

/** Sign in as someone who already has a sign-in, by asking for the emailed link. */
export async function signInByLink(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto(`${APP}/auth`);
  await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* a private window */ } });
  await page.goto(`${APP}/auth`);
  await page.locator('input[type="email"]').first().fill(email);
  const since = await mailMark();
  await page.getByRole('button', { name: 'Email me a sign-in link instead' }).click();
  const link = await linkSentTo(page, email, /verify-email\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
}

/** Someone invited to the organisation opens the email, chooses a password, and is in. */
export async function acceptTheTeamInvitation(page: Page, email: string, since: number, password = 'JourneysTest123!') {
  const link = await linkSentTo(page, email, /set-password\?token=[0-9a-f]+/, since);
  await page.goto(link);
  await page.getByLabel(/^Password/).first().fill(password);
  const again = page.getByLabel(/Type it again/);
  if (await again.count()) await again.first().fill(password);
  await page.getByRole('button', { name: /Save|Set|Continue|Sign in/i }).first().click();
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
}

/*
 * Opens Ask from the page header and asks one question. Returns the panel.
 * Since decision 100 Ask is named for the organisation ("Ask Kito Foods"), not "Ask Groundwork", and its box reads
 * "Ask about the company, your work or your check-ins." (a check-in's own panel still says "Ask about this check-in"),
 * so the journeys look for the name with its first word, not for the old fixed words.
 */
export async function askGroundwork(page: Page, question: string) {
  const panel = page.getByRole('region', { name: /^Ask \S/ });
  if (!(await panel.isVisible().catch(() => false))) await page.getByRole('button', { name: /^Ask \S/ }).first().click();
  await expect(panel).toBeVisible();
  const box = panel.getByRole('textbox', { name: /Ask about the company, your work or your check-ins|Ask about this check-in/ });
  await box.fill(question);
  await box.press('Enter');
  return panel;
}

/** The words a page shows, so a step can say what a person reads. */
export async function whatIsOnThePage(page: Page): Promise<string> {
  return (await page.locator('main, #main, body').first().innerText()).replace(/\s+/g, ' ');
}

/** Nothing a person reads may be a broken seam. */
export function readsAsPlainSentences(text: string) {
  expect(text).not.toMatch(/undefined|\[object|NaN|\bnull\b/);
  expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);
}
