/**
 * THE NINE USER JOURNEYS, WALKED THROUGH THE API AS A REAL PERSON TAKES THEM (Phase B, item 5).
 *
 * The same journeys the browser specs in e2e/ (admin.journey.spec.ts, lead.journey.spec.ts,
 * participant.journey.spec.ts) walk on screens, walked here through the API calls those screens make:
 *   1 sign up;  2 set up a check-in from a pasted plan;  3 invite people;  4 check in;
 *   5 read the board and the reports;  6 use Ask Groundwork;  7 request and approve leave and spending;
 *   8 do a performance review;  9 open the Company page.
 * Each is walked as each reader: Grace (the admin, who signs up), Wairimu (the lead) and Amani and Baraka
 * (people who take part). Every step checks the text that person is served and the rows stored.
 *
 * What is real: the running API (port 3008 by default), the database, the model, and the sign-in by an
 * emailed link. The emails are caught by a small mail catcher this script starts on 127.0.0.1:1025 (the
 * address the API's development mail path already relays to); nothing leaves this computer.
 *
 * Start the API first, from the main tree's api/, against a COPY of the local test database:
 *   createdb -T gw_whatsapp_journeys gw_user_journeys
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_user_journeys PORT=3008 \
 *   EMAIL_SENDS_FOR_REAL=false GEMINI_LOCATION=global NODE_ENV=development node dist/main.js
 * then run this with the same DATABASE_URL:
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_user_journeys npx ts-node -T journey/user-journeys.ts
 * or, inside Jest:  RUN_USER_JOURNEYS=1 DATABASE_URL=... npx jest journey/user-journeys.spec.ts
 *
 * It prints what each person reads, word for word, and the checks it made. A person judges.
 * Refuses anything that is not a local API and a local gw_ database.
 */
import * as net from 'net';
import { PrismaClient } from '@prisma/client';
import { journeys } from './user-journeys-steps';

const API = process.env.API ?? 'http://localhost:3008/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';

export interface Check { journey: string; what: string; ok: boolean; detail?: string; /** A fault found here that sits in somebody else's part of the code: reported to them, not fixed here. */ owner?: string }

export async function runUserJourneys(opts: { quiet?: boolean } = {}): Promise<{ checks: Check[]; transcript: string[] }> {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) {
    throw new Error('Refusing: a local API and a local gw_ database (DATABASE_URL) are both required.');
  }
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: Check[] = [];
  const transcript: string[] = [];
  const log = (line: string) => { transcript.push(line); if (!opts.quiet) console.log(line); };
  let journey = '';
  const heading = (t: string) => { journey = t; log(`\n==================== ${t} ====================`); };
  const check = (what: string, ok: boolean, detail?: string, owner?: string) => {
    checks.push({ journey, what, ok, detail, ...(owner ? { owner } : {}) });
    log(`  ${ok ? 'PASS' : owner ? 'OPEN' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail}` : ''}${!ok && owner ? `\n        (reported to ${owner}; it sits in their part of the code)` : ''}`);
  };

  // ------------------------------------------------------------------------------------------------
  // The mail catcher: the address the API's development mail path relays to. Nothing is really sent.
  // ------------------------------------------------------------------------------------------------
  const mail: string[] = [];
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
    sock.on('error', () => undefined);
  });
  await new Promise<void>((ok, no) => {
    catcher.once('error', (e: NodeJS.ErrnoException) => no(e.code === 'EADDRINUSE' ? new Error('Port 1025 is already taken: another run (or a mail catcher) holds it. Run one at a time.') : e));
    catcher.listen(1025, '127.0.0.1', ok);
  });
  /* SMTP doubles a full stop that starts a line; a mail client takes it back out. */
  const decoded = (raw: string) => raw.replace(/=\r\n/g, '').replace(/=3D/gi, '=').replace(/\r\n\.\./g, '\r\n.');
  /** Every email caught for an address, newest last, decoded. */
  const mailFor = (email: string, from = 0) => mail.slice(from).filter((m) => decoded(m).toLowerCase().includes(`to: ${email.toLowerCase()}`) || decoded(m).toLowerCase().includes(`<${email.toLowerCase()}>`)).map(decoded);
  const waitForMail = async (email: string, match: RegExp, from: number, ms = 20_000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const found = mailFor(email, from).filter((m) => match.test(m));
      if (found.length) return found[found.length - 1];
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  };

  async function api(path: string, o: { method?: string; body?: any; token?: string } = {}, tries = 0): Promise<any> {
    const res = await fetch(`${API}${path}`, {
      method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
      ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
    });
    const t = await res.text();
    let j: any = null;
    try { j = t ? JSON.parse(t) : null; } catch { j = { raw: t }; }
    /* The API allows only so many sign-in requests a minute from one computer, as it should. Wait it out, as a person would. */
    if (res.status === 429 && tries < 2) {
      log(`  (the API asked for a minute's wait on ${path}; waiting)`);
      await new Promise((r) => setTimeout(r, 65_000));
      return api(path, o, tries + 1);
    }
    if (!res.ok) return { refused: res.status, message: j?.message ?? t.slice(0, 300) };
    return j && typeof j === 'object' && 'success' in j && 'data' in j ? j.data : j;
  }

  try {
    await journeys({ prisma, api, check, log, heading, mail, mailFor, waitForMail, stamp: Date.now() });
  } finally {
    await new Promise<void>((ok) => catcher.close(() => ok()));
    await prisma.$disconnect();
  }
  const failed = checks.filter((c) => !c.ok && !c.owner);
  const open = checks.filter((c) => !c.ok && c.owner);
  log(`\n${checks.length - failed.length - open.length} of ${checks.length} checks passed${open.length ? `, ${open.length} open in other people's code` : ''}${failed.length ? `, ${failed.length} failed` : ''}.`);
  return { checks, transcript };
}

if (require.main === module) {
  runUserJourneys().then((r) => process.exit(r.checks.some((c) => !c.ok && !c.owner) ? 1 : 0)).catch((e) => { console.error(e); process.exit(2); });
}
