import { Browser, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { signIn } from '../sign-in-by-email';

/**
 * ONE SIGN-IN PER PERSON FOR THE WHOLE PRIVACY SWEEP (L4-L8). The API allows five sign-in links a
 * minute, so each person's signed-in state is kept in the session's scratch folder (never in the
 * repo) and reused by every later spec. SWEEP_STATE_DIR must point at that folder.
 */
const DIR = process.env.SWEEP_STATE_DIR || '';

export function statePath(email: string) {
  if (!DIR) throw new Error('Set SWEEP_STATE_DIR to a scratch folder outside the repo.');
  return path.join(DIR, `state-${email.replace(/[^a-z0-9]/gi, '_')}.json`);
}

/** A page signed in as this person, by a kept state where one still works, otherwise by email link. */
export async function pageAs(browser: Browser, email: string, width = 1440, height = 900): Promise<Page> {
  const p = statePath(email);
  if (fs.existsSync(p)) {
    const ctx = await browser.newContext({ storageState: p, viewport: { width, height } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:5173/today');
    await page.waitForTimeout(1500);
    if (!/\/(auth|login|signin)/.test(new URL(page.url()).pathname)) return page;
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await signIn(page, email);
  await ctx.storageState({ path: p });
  return page;
}

/** The person's bearer token, read from a kept state, for reading what the API serves them. */
export function tokenOf(email: string): string {
  const s = JSON.parse(fs.readFileSync(statePath(email), 'utf8'));
  for (const o of s.origins || []) for (const kv of o.localStorage || []) if (kv.name === 'token') return kv.value;
  throw new Error(`No token kept for ${email}`);
}
