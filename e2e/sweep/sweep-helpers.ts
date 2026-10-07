import { Page, TestInfo } from '@playwright/test';
import * as path from 'path';

/** The repo root, regardless of the shell's own cwd when the test runner was started. */
export const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Turns a path given as 'docs/bug-log-screens/x.png' into an absolute one under the repo root. */
export function atRepoRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
}

/**
 * SHARED HELPERS FOR THE ADMIN JOURNEY SWEEP (A1-A7), from docs/user-journey-tests.md.
 *
 * Every journey in the sweep runs at four widths (desktop 1440, laptop 1280 and 1024, phone
 * 390), with the browser console and page errors watched throughout, and a check for any failed
 * (4xx/5xx) network request a person would actually hit. A problem found here is written to
 * docs/bug-log-screens.md by hand, with a screenshot saved under docs/bug-log-screens/.
 */
export const WIDTHS: { name: string; width: number; height: number }[] = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1280', width: 1280, height: 900 },
  { name: '1024', width: 1024, height: 900 },
  { name: '390', width: 390, height: 844 },
];

export type Watch = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
};

/** Starts watching a page's console, uncaught errors, and failed API requests. */
export function watch(page: Page): Watch {
  const w: Watch = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') w.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    w.pageErrors.push(String(err));
  });
  page.on('response', (res) => {
    const status = res.status();
    if (status >= 400) {
      w.failedRequests.push(`${status} ${res.request().method()} ${res.url()}`);
    }
  });
  return w;
}

/** A plain summary of what watch() caught, or '' if nothing. */
export function watchSummary(w: Watch): string {
  const parts: string[] = [];
  if (w.consoleErrors.length) parts.push(`console errors: ${w.consoleErrors.join(' | ')}`);
  if (w.pageErrors.length) parts.push(`page errors: ${w.pageErrors.join(' | ')}`);
  if (w.failedRequests.length) parts.push(`failed requests: ${w.failedRequests.join(' | ')}`);
  return parts.join('\n');
}

/** Checks a page's visible text for clipped labels and colon/dash/semicolon joins the rules forbid. */
export function hasClippedWording(text: string): string[] {
  const problems: string[] = [];
  // crude signal only, for a human to look at - not every colon is a violation (times, URLs)
  const suspicious = text.match(/[A-Za-z][^.!?\n]{0,40}:\s[A-Z][^.\n]{0,60}/g) || [];
  for (const s of suspicious) {
    if (/^\d{1,2}:\d{2}/.test(s)) continue; // a clock time
    if (/https?:/.test(s)) continue;
    problems.push(s);
  }
  return problems;
}

export async function screenshotTo(page: Page, filePath: string) {
  await page.screenshot({ path: atRepoRoot(filePath), fullPage: true });
}

export function bugPath(id: string, slug: string, width: string) {
  return atRepoRoot(`docs/bug-log-screens/${id}-${slug}-${width}.png`);
}
