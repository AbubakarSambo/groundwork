import { Page, BrowserContext, Browser } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { Persona } from './personas';

export const APP = 'http://localhost:5173';
export const MAIL = 'http://localhost:1080';
export const PW = 'SimPass123!';
export const OUT = path.join(__dirname, '..', 'shots', 'org-sim');

/** Findings are appended to disk as they are found, so a run that dies mid-way keeps its evidence. */
const LOG = path.join(OUT, 'findings-live.md');

export function note(ground: number, tag: string, text: string) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(LOG, `\n### G${ground}-${tag}\n${text}\n`);
  console.log(`[G${ground}] ${tag}: ${text.split('\n')[0].slice(0, 140)}`);
}

export function shotDir(ground: number) {
  const d = path.join(OUT, `g${String(ground).padStart(2, '0')}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

/** Full page, so reports and boards are legible end to end rather than a thumbnail. */
export async function shot(page: Page, ground: number, name: string) {
  const f = path.join(shotDir(ground), `${name}.png`);
  await page.screenshot({ path: f, fullPage: true }).catch(() => {});
  return f;
}

export async function mailLink(to: string, match?: string): Promise<string | null> {
  const q = `${MAIL}/link?to=${encodeURIComponent(to)}${match ? `&match=${match}` : ''}`;
  for (let i = 0; i < 12; i++) {
    try {
      const r = await fetch(q);
      const j: any = await r.json();
      if (j?.link) return j.link;
    } catch { /* catcher not up yet */ }
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

export async function clearMail() {
  await fetch(`${MAIL}/clear`, { method: 'POST' }).catch(() => {});
}

export async function mailFor(to: string): Promise<any[]> {
  try {
    const r = await fetch(`${MAIL}/messages?to=${encodeURIComponent(to)}`);
    return (await r.json()) as any[];
  } catch { return []; }
}

/**
 * SIGN UP A PERSON THE WAY A PERSON DOES, then give them a password.
 *
 * The product's own signup leaves the account with NO password (see G1-01), so the only way a
 * returning admin or lead can sign in later is a fresh link from their inbox. Rather than seed a
 * password into the database, this drives the REAL "Forgot your password?" flow to set one - which is
 * exactly the workaround a real person in Sahar's position is forced into, and worth exercising for
 * that reason alone.
 */
export async function signUpThroughUI(page: Page, p: Persona, orgName?: string) {
  await page.goto(`${APP}/auth?mode=signup`);
  await page.getByLabel(/Your name/i).fill(p.name);
  await page.getByLabel(/^Email$/i).fill(p.email);
  if (orgName) await page.getByLabel(/Your organisation/i).fill(orgName);
  await page.getByRole('button', { name: /Create my account/i }).click();
  const link = await mailLink(p.email);
  if (!link) throw new Error(`no activation email for ${p.email}`);
  await page.goto(link);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
}

export async function setPasswordThroughUI(page: Page, p: Persona) {
  await page.goto(`${APP}/auth`);
  await page.getByRole('button', { name: /Forgot your password/i }).click();
  await page.getByRole('textbox').first().fill(p.email);
  await page.getByRole('button', { name: /Send|Reset|Email me/i }).first().click();
  await page.waitForTimeout(1500);
  const link = await mailLink(p.email, 'reset-password') ?? await mailLink(p.email, 'set-password');
  if (!link) return false;
  await page.goto(link);
  await page.waitForLoadState('domcontentloaded');
  const boxes = page.locator('input[type="password"]');
  const n = await boxes.count();
  if (n === 0) return false;
  for (let i = 0; i < n; i++) await boxes.nth(i).fill(PW);
  await page.getByRole('button', { name: /Set|Save|Continue|Choose/i }).first().click();
  await page.waitForTimeout(1500);
  return true;
}

export async function signIn(page: Page, p: Persona): Promise<boolean> {
  await page.goto(`${APP}/auth`);
  await page.getByLabel(/^Email$/i).fill(p.email);
  await page.getByLabel(/Password/i).fill(PW);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  try {
    await page.waitForURL(u => !u.pathname.startsWith('/auth'), { timeout: 12000 });
    return true;
  } catch { return false; }
}

export async function ctx(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 1280, height: 900 } });
}

/** Every visible string on the page, for the copy and dash sweeps. */
export async function pageText(page: Page): Promise<string> {
  return (await page.textContent('body').catch(() => '')) ?? '';
}

export function dashesIn(s: string): string[] {
  const out: string[] = [];
  const re = /.{0,40}[—–].{0,40}/g;
  let m;
  while ((m = re.exec(s))) out.push(m[0].replace(/\s+/g, ' ').trim());
  return out;
}
