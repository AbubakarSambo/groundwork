/**
 * THE HELPERS THE TESTERS USE (user journey sweep, 7 October 2026), as plain functions.
 *
 * `bed.ts` is the command line over these. A Playwright test can import them directly:
 *
 *   import { theBed } from '../journey/sweep/the-test-bed';
 *   import { sendWhatsApp, mailTo, moveTheClock } from '../journey/sweep/bed-lib';
 *
 * Everything is read from, and sent to, the copy's own API, mail catcher, recorder and clock (see
 * the-test-bed.ts). Nothing here reaches anything that is not on this computer.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { TEST_WHATSAPP, TheBed } from './the-test-bed';
import { TEMPLATES } from '../../src/modules/whatsapp/a-message-outside-the-window';

const API_DIR = path.join(__dirname, '..', '..');
const LOGS = path.join(__dirname, 'logs');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} answered ${res.status}: ${text.slice(0, 300)}`);
  return body;
}
const post = (url: string, body: unknown) => getJson(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

// ---------------------------------------------------------------------------------------------- start and stop

const pidFile = (bed: TheBed) => path.join(LOGS, `${bed.database}.pids.json`);
const alive = (pid?: number) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch { return false; } };
const readPids = (bed: TheBed): Record<string, number> => { try { return JSON.parse(fs.readFileSync(pidFile(bed), 'utf8')); } catch { return {}; } };

async function waitFor(what: string, test: () => Promise<boolean>, ms = 120_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { try { if (await test()) return; } catch { /* not yet */ } await sleep(500); }
  throw new Error(`${what} did not come up within ${Math.round(ms / 1000)} seconds. See ${LOGS}.`);
}

/** The names of the message templates the API treats as approved, so a message outside the 24 hours goes as a template. */
export const approvedTemplateNames = () => Object.values(TEMPLATES).map((t) => t.name).join(',');

/** Start the copy's mail catcher, WhatsApp recorder and API, each with its output in logs/. Safe to run twice. */
export async function bedUp(bed: TheBed, o: { api?: boolean; realScheduler?: boolean } = {}): Promise<Record<string, number>> {
  fs.mkdirSync(LOGS, { recursive: true });
  const pids = readPids(bed);
  const out = (name: string) => fs.openSync(path.join(LOGS, `${bed.database}.${name}.log`), 'a');

  if (!alive(pids.mail)) {
    const c = spawn('python3', [path.join(API_DIR, '..', 'groundwork_local_test', 'mailcatcher.py')], { detached: true, stdio: ['ignore', out('mail'), out('mail')], env: { ...process.env, MAILCATCHER_SMTP_PORT: String(bed.mailSmtpPort), MAILCATCHER_HTTP_PORT: String(bed.mailHttpPort) } });
    c.unref(); pids.mail = c.pid!;
  }
  if (!alive(pids.recorder)) {
    const c = spawn(path.join(API_DIR, 'node_modules', '.bin', 'ts-node'), ['-T', path.join(__dirname, 'recorder.ts')], { cwd: API_DIR, detached: true, stdio: ['ignore', out('recorder'), out('recorder')], env: { ...process.env, SWEEP: bed.name } });
    c.unref(); pids.recorder = c.pid!;
  }
  fs.writeFileSync(pidFile(bed), JSON.stringify(pids));
  await waitFor('The mail catcher', async () => (await getJson(`${bed.mail}/health`)).ok === true, 20_000);
  await waitFor('The WhatsApp recorder', async () => (await getJson(`${bed.recorder}/_health`)).ok === true, 60_000);

  if (o.api !== false && !alive(pids.api)) {
    const stripe = process.env.STRIPE_SECRET_KEY ?? '';
    if (/^(sk|rk)_live_/.test(stripe)) throw new Error('A live Stripe key is set in this shell. The test bed will not start with it.');
    if (!fs.existsSync(path.join(API_DIR, 'dist', 'main.js'))) throw new Error('api/dist/main.js is not built. Run: cd api && npx nest build');
    const log = fs.openSync(bed.logFile, 'a');
    fs.appendFileSync(bed.logFile, `\n=== API for ${bed.database} starting ${new Date().toISOString()} ===\n`);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      /* Where it points. These override anything in api/.env, which is read last and never wins over the real environment. */
      DATABASE_URL: bed.databaseUrl, PORT: String(bed.apiPort), NODE_ENV: 'development',
      FRONTEND_URL: bed.client, CORS_ORIGINS: bed.client, STRIPE_CALLBACK_URL: `${bed.client}/billing/callback`,
      /* Nothing leaves this computer: mail goes to the catcher, WhatsApp to the recorder. */
      EMAIL_SENDS_FOR_REAL: 'false', RESEND_API_KEY: '', MAIL_CATCHER_PORT: String(bed.mailSmtpPort),
      WHATSAPP_GRAPH_BASE_URL: `${bed.recorder}/graph`, WHATSAPP_APPROVED_TEMPLATES: approvedTemplateNames(),
      WHATSAPP_ACCESS_TOKEN: TEST_WHATSAPP.accessToken, WHATSAPP_PHONE_NUMBER_ID: TEST_WHATSAPP.phoneNumberId, WHATSAPP_APP_SECRET: TEST_WHATSAPP.appSecret,
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: TEST_WHATSAPP.verifyToken, WHATSAPP_DISPLAY_NUMBER: TEST_WHATSAPP.displayNumber,
      /* The clock and the scheduler control. */
      SWEEP_CLOCK_PORT: String(bed.clockPort), SWEEP_CLOCK_FILE: path.join(LOGS, `${bed.database}.clock`), SWEEP_REAL_SCHEDULER: o.realScheduler ? 'on' : 'off',
      NO_COLOR: '1', FORCE_COLOR: '0',
    };
    delete env.GOOGLE_SERVICE_ACCOUNT_JSON_LIVE;
    const c = spawn(process.execPath, ['-r', path.join(__dirname, 'clock.preload.js'), 'dist/main.js'], { cwd: API_DIR, detached: true, stdio: ['ignore', log, log], env });
    c.unref(); pids.api = c.pid!;
    fs.writeFileSync(pidFile(bed), JSON.stringify(pids));
    await waitFor('The API', async () => (await fetch(`http://127.0.0.1:${bed.apiPort}/health`)).ok, 180_000);
    await waitFor('The clock control', async () => !!(await getJson(`${bed.clock}/clock`)).apiNow, 20_000);
  }
  return pids;
}

/** Stop what `bedUp` started for this copy. The database is left as it is. */
export async function bedDown(bed: TheBed, o: { apiOnly?: boolean } = {}): Promise<string[]> {
  const pids = readPids(bed); const stopped: string[] = [];
  for (const k of o.apiOnly ? ['api'] : ['api', 'recorder', 'mail']) {
    if (alive(pids[k])) { try { process.kill(pids[k], 'SIGTERM'); stopped.push(k); } catch { /* gone */ } }
  }
  const going = o.apiOnly ? ['api'] : Object.keys(pids);
  for (let i = 0; i < 20 && going.some((k) => alive(pids[k])); i++) await sleep(500);
  for (const k of going) if (alive(pids[k])) { try { process.kill(pids[k], 'SIGKILL'); } catch { /* gone */ } }
  fs.writeFileSync(pidFile(bed), JSON.stringify(o.apiOnly ? Object.fromEntries(Object.entries(pids).filter(([k]) => k !== 'api')) : {}));
  return stopped;
}

export function bedStatus(bed: TheBed) {
  const p = readPids(bed);
  return { copy: bed.name, database: bed.database, api: { pid: p.api ?? null, running: alive(p.api), url: bed.api }, mailCatcher: { pid: p.mail ?? null, running: alive(p.mail), smtp: bed.mailSmtpPort, http: bed.mail }, recorder: { pid: p.recorder ?? null, running: alive(p.recorder), url: bed.recorder }, clock: bed.clock, client: bed.client, log: bed.logFile };
}

// ---------------------------------------------------------------------------------------------- WhatsApp

export type Inbound =
  | { type: 'text'; text: string }
  | { type: 'image' | 'document'; file: string; caption?: string; mime?: string }
  | { type: 'interactive-reply'; id: string; title: string };

/** The API's own time, so a message carries the moved clock's time. */
async function apiNow(bed: TheBed): Promise<number> {
  try { return new Date((await getJson(`${bed.clock}/clock`)).apiNow).getTime(); } catch { return Date.now(); }
}

/** Where a signed message goes: Groundwork's own number, or an organisation's own connection (pass its id). */
export interface SendOptions { organizationId?: string; replyToMessageId?: string; badSignature?: boolean; unsigned?: boolean; messageId?: string; wait?: boolean | { quietMs?: number; maxMs?: number } }
export interface Sent { n: number; at: string; to: string; kind: string; text: string; template?: string }

/**
 * Write to Groundwork's WhatsApp number as this person. Signed with the test app secret exactly as Meta
 * signs (X-Hub-Signature-256 over the raw body). Then, unless `wait` is false, waits for what comes
 * back: the webhook answers at once and the work goes on after, so it waits for the first message to this
 * number, then for three quiet seconds, up to a minute.
 */
export async function sendWhatsApp(bed: TheBed, from: string, what: string | Inbound, o: SendOptions = {}): Promise<{ status: number; messageId: string; replies: Sent[] }> {
  const input: Inbound = typeof what === 'string' ? { type: 'text', text: what } : what;
  const digits = from.replace(/\D/g, '');
  const messageId = o.messageId ?? `wamid.in.${crypto.randomBytes(8).toString('hex')}`;
  const ts = String(Math.floor((await apiNow(bed)) / 1000));
  let m: Record<string, unknown>;
  if (input.type === 'text') m = { type: 'text', text: { body: input.text } };
  else if (input.type === 'interactive-reply') m = { type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: input.id, title: input.title } } };
  else {
    const buf = fs.readFileSync(input.file);
    const mime = input.mime ?? (input.type === 'image' ? 'image/png' : 'application/pdf');
    const { id } = await post(`${bed.recorder}/_media`, { base64: buf.toString('base64'), mime });
    m = { type: input.type, [input.type]: { id, mime_type: mime, ...(input.caption ? { caption: input.caption } : {}), ...(input.type === 'document' ? { filename: path.basename(input.file) } : {}) } };
  }
  const before = (await getJson(`${bed.recorder}/_mark`)).mark as number;
  const raw = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: 'waba-test', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { display_phone_number: '15550000001', phone_number_id: TEST_WHATSAPP.phoneNumberId }, contacts: [{ wa_id: digits, profile: { name: 'Test' } }], messages: [{ from: digits, id: messageId, timestamp: ts, ...(o.replyToMessageId ? { context: { id: o.replyToMessageId } } : {}), ...m }] } }] }],
  });
  const sig = crypto.createHmac('sha256', o.badSignature ? 'not-the-secret' : TEST_WHATSAPP.appSecret).update(raw).digest('hex');
  const res = await fetch(`${bed.api}/webhooks/whatsapp${o.organizationId ? `/${o.organizationId}` : ''}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(o.unsigned ? {} : { 'x-hub-signature-256': `sha256=${sig}` }) }, body: raw });
  const replies = o.wait === false ? [] : await waitForReplies(bed, from, before, typeof o.wait === 'object' ? o.wait : {});
  return { status: res.status, messageId, replies };
}

async function waitForReplies(bed: TheBed, to: string, since: number, o: { quietMs?: number; maxMs?: number }): Promise<Sent[]> {
  const quiet = o.quietMs ?? 3000; const max = o.maxMs ?? 60_000;
  const start = Date.now(); let last = 0; let count = 0;
  while (Date.now() - start < max) {
    const got = await sentToNumber(bed, to, since);
    if (got.length !== count) { count = got.length; last = Date.now(); }
    if (count > 0 && Date.now() - last >= quiet) break;
    await sleep(400);
  }
  return sentToNumber(bed, to, since);
}

/** Everything the recorder holds for this number, after sequence number `since` (see whatsAppMark). */
export async function sentToNumber(bed: TheBed, to: string, since = 0): Promise<Sent[]> {
  return (await getJson(`${bed.recorder}/_sent?to=${encodeURIComponent(to)}&since=${since}`)).map((s: any) => ({ n: s.n, at: s.at, to: s.to, kind: s.kind, text: s.text, ...(s.template ? { template: s.template } : {}) }));
}
export const whatsAppMark = async (bed: TheBed): Promise<number> => (await getJson(`${bed.recorder}/_mark`)).mark;

// ---------------------------------------------------------------------------------------------- mail

export interface Mail { id: number; received: string; from: string; to: string[]; subject: string; text: string; html: string; links: string[] }
/** Every message the catcher holds for this address, newest first. */
export async function mailTo(bed: TheBed, address: string): Promise<Mail[]> {
  return getJson(`${bed.mail}/messages?to=${encodeURIComponent(address)}`);
}
/** The first link in the newest message to this address, optionally the first that contains `match`. */
export async function linkFor(bed: TheBed, address: string, match?: string): Promise<string | null> {
  const m = (await mailTo(bed, address))[0];
  if (!m) return null;
  return (match ? m.links.filter((l) => l.toLowerCase().includes(match.toLowerCase())) : m.links)[0] ?? null;
}
export const clearMail = async (bed: TheBed) => post(`${bed.mail}/clear`, {});

// ---------------------------------------------------------------------------------------------- the clock

export const clockNow = (bed: TheBed) => getJson(`${bed.clock}/clock`);
/** Move the clock only (no jobs run). `to` is a date and time; `by` is like "1d", "3h" or milliseconds; reset puts it back. */
export const setTheClock = (bed: TheBed, m: { to?: string; by?: string | number; reset?: boolean }) => post(`${bed.clock}/clock`, m);
export const scheduledJobs = (bed: TheBed): Promise<{ name: string; cron: string; timeZone: string }[]> => getJson(`${bed.clock}/jobs`);
/** Run one scheduled job now, the way the scheduler runs it (the job's own method on the live API). */
export const runJob = (bed: TheBed, job: string) => post(`${bed.clock}/run`, { job });
/**
 * Move the clock forward and run, in time order and at their own times, every scheduled job whose time
 * falls in between. `skip` and `only` are lists of patterns on "Class.method".
 */
export async function moveTheClock(bed: TheBed, m: { to?: string; by?: string | number; skip?: string[]; only?: string[]; onProgress?: (p: { done: number; planned: number; current: string | null }) => void }): Promise<any> {
  const { onProgress, ...ask } = m;
  await post(`${bed.clock}/advance`, ask);
  /* It can take minutes: a night's jobs write reports with the model. So it is asked how it is getting on, until it says it is done. */
  for (;;) {
    await sleep(1500);
    const p = await getJson(`${bed.clock}/advance`);
    onProgress?.({ done: p.done, planned: p.planned, current: p.current });
    if (!p.running) return { ...p, ran: p.done };
  }
}

// ---------------------------------------------------------------------------------------------- the log

/** Remember where the log is now. Returns the mark (a byte position) and keeps it in a file as the latest. */
export function logMark(bed: TheBed): number {
  const size = fs.existsSync(bed.logFile) ? fs.statSync(bed.logFile).size : 0;
  fs.mkdirSync(LOGS, { recursive: true });
  fs.writeFileSync(bed.markFile, String(size));
  return size;
}
/** A Nest log line at warn or error level, or the process's own warnings and crashes. The SQL the database client prints is not a level, so a word inside it does not count. */
const LEVEL = /^\[Nest\] .*\s(WARN|ERROR|FATAL)\s+\[|^\(node:\d+\) \w*Warning|^(Error|TypeError|RangeError|ReferenceError)\b|[Uu]ncaught ?[Ee]xception|[Uu]nhandled ?([Pp]romise )?[Rr]ejection|^\s*(WARN|ERROR|FATAL)\b/;
const DEV_MAIL = /\[DEV EMAIL\]/;
export interface LogLine { level: string; line: string; position: number }
/** Every line at warn or error level since a mark (default: the last mark, else the start). The expected "[DEV EMAIL]" lines are counted, not listed, unless `all`. */
export function logWarnings(bed: TheBed, o: { since?: number; all?: boolean } = {}): { lines: LogLine[]; devMailHidden: number; since: number } {
  const since = o.since ?? (fs.existsSync(bed.markFile) ? Number(fs.readFileSync(bed.markFile, 'utf8')) : 0);
  if (!fs.existsSync(bed.logFile)) return { lines: [], devMailHidden: 0, since };
  const buf = fs.readFileSync(bed.logFile);
  const text = buf.subarray(Math.min(since, buf.length)).toString('utf8');
  const lines: LogLine[] = []; let hidden = 0; let pos = since;
  for (const line of text.split('\n')) {
    const at = pos; pos += Buffer.byteLength(line) + 1;
    if (!line.trim() || !LEVEL.test(line)) continue;
    if (!o.all && DEV_MAIL.test(line)) { hidden += 1; continue; }
    const level = (/\s(WARN|ERROR|FATAL)\s+\[/.exec(line)?.[1]) ?? (/Warning/.test(line) ? 'WARN' : 'ERROR');
    lines.push({ level, line, position: at });
  }
  return { lines, devMailHidden: hidden, since };
}
