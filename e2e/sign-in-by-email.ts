import { expect, Page } from '@playwright/test';
import * as net from 'net';

/**
 * ONE MAIL CATCHER FOR THE WHOLE RUN (Hafsah, 30 September 2026: "so two can never fight over the
 * sign-in emails again").
 *
 * The local API relays every email to 127.0.0.1:1025 in development. Each of the newer browser
 * tests used to start its own little catcher there in beforeAll and close it in afterAll. Two
 * things went wrong:
 *
 *   - Within one run, a file's catcher was closed without waiting and without ending the
 *     connection the API's mailer keeps open, so the next file's sign-in email could land in the
 *     previous file's list, where nobody was looking, and the sign-in timed out.
 *   - Two runs at once (two commands, or two helpers) both wanted port 1025; whichever got it
 *     took the other's emails.
 *
 * Now there is one catcher, started once for the worker (the config runs a single worker, one test
 * at a time), and every file reads the same list. If port 1025 is already taken, another run is
 * going: the test stops at once with that sentence, instead of waiting for an email that went
 * somewhere else. No link or token is ever written down or printed.
 */

const mail: string[] = [];
let started: Promise<void> | null = null;

function startCatcher(): Promise<void> {
  if (started) return started;
  started = new Promise<void>((ok, no) => {
    const catcher = net.createServer((sock) => {
      let data = false;
      let buf = '';
      sock.write('220 localhost\r\n');
      sock.on('data', (chunk) => {
        const s = chunk.toString('utf8');
        if (data) {
          buf += s;
          if (buf.includes('\r\n.\r\n')) { mail.push(buf); buf = ''; data = false; sock.write('250 OK\r\n'); }
          return;
        }
        for (const line of s.split('\r\n').filter(Boolean)) {
          const cmd = line.slice(0, 4).toUpperCase();
          if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250 localhost\r\n');
          else if (cmd === 'DATA') { data = true; sock.write('354 go\r\n'); }
          else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
          else sock.write('250 OK\r\n');
        }
      });
      sock.on('error', () => {});
    });
    catcher.once('error', (e: NodeJS.ErrnoException) => {
      started = null;
      no(e.code === 'EADDRINUSE'
        ? new Error('Port 1025 is already taken, so another browser test run is going. Run one at a time: wait for it to finish, then run this again.')
        : e);
    });
    catcher.listen(1025, '127.0.0.1', () => {
      catcher.unref(); // the worker can end when the tests are done
      ok();
    });
  });
  return started;
}

function linkFor(email: string, since: number): string | null {
  for (let i = mail.length - 1; i >= since; i--) {
    if (!mail[i].toLowerCase().includes(email.toLowerCase())) continue;
    const found = mail[i].replace(/=\r\n/g, '').replace(/=3D/gi, '=').match(/https?:\/\/localhost:5173\/verify-email\?token=[0-9a-f]+/i);
    if (found) return found[0];
  }
  return null;
}

/*
 * ONE SIGN-IN PER PERSON PER RUN. The API lets one computer ask for at most 5 sign-in links a
 * minute (auth.controller.ts, member-signin), a security limit this test must not loosen. The
 * button test opens eight screens, several as the same person, so asking for a new link each
 * time ran into that limit and the later screens timed out waiting for an email. Now the first
 * sign-in's signed-in state (cookies and the page's saved storage) is kept, in memory only, for
 * the rest of the run and given to that person's next page. If it no longer works, it signs in
 * by email again. Nothing is written to disk.
 */
type Kept = Awaited<ReturnType<import('@playwright/test').BrowserContext['storageState']>>;
const kept = new Map<string, Kept>();

async function stillSignedIn(page: Page, app: string): Promise<boolean> {
  await page.goto(`${app}/today`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  return !/\/(auth|login|signin)/.test(new URL(page.url()).pathname);
}

/** Signs in as this local test account by the emailed link, the way a person does. */
export async function signIn(page: Page, email: string, app = 'http://localhost:5173') {
  const state = kept.get(email.toLowerCase());
  if (state) {
    await page.context().addCookies(state.cookies);
    await page.context().addInitScript((origins: Kept['origins']) => {
      for (const o of origins) {
        if (o.origin !== location.origin) continue;
        for (const { name, value } of o.localStorage) {
          if (window.localStorage.getItem(name) === null) window.localStorage.setItem(name, value);
        }
      }
    }, state.origins);
    if (await stillSignedIn(page, app)) return;
  }
  await startCatcher();
  const since = mail.length;
  await page.goto(`${app}/auth`);
  await page.locator('input[type="email"]').first().fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link instead' }).click();
  let link: string | null = null;
  for (let t = 0; t < 40 && !link; t++) { await page.waitForTimeout(500); link = linkFor(email, since); }
  expect(link, `a sign-in email for ${email}`).not.toBeNull();
  await page.goto(link!);
  await page.waitForTimeout(2500);
  kept.set(email.toLowerCase(), await page.context().storageState());
}

/**
 * FOR THE USER JOURNEYS (journey-1-admin.spec.ts and its two companions): the same one catcher, read
 * for ANY emailed link, not only a sign-in. A sign-up, an invitation to a team, an invitation to a
 * check-in and a returning sign-in each arrive as a message to an address, with a link in it.
 */
export async function mailMark(): Promise<number> {
  await startCatcher();
  return mail.length;
}

/** The newest link to the app in a message sent to this address since `since`, matching `pattern`. */
export async function linkSentTo(page: Page, email: string, pattern: RegExp, since: number): Promise<string> {
  await startCatcher();
  for (let t = 0; t < 80; t++) {
    for (let i = mail.length - 1; i >= since; i--) {
      const text = mail[i].replace(/=\r\n/g, '').replace(/=3D/gi, '=');
      if (!text.toLowerCase().includes(email.toLowerCase())) continue;
      const found = text.match(new RegExp(`https?://localhost:5173/${pattern.source}`, pattern.flags.replace('g', '')));
      if (found) return found[0];
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`No email with a ${pattern} link reached ${email} within 40 seconds.`);
}
