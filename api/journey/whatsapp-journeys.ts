/**
 * EVERY CLIENT JOURNEY ON WHATSAPP, DRIVEN THROUGH THE LOCAL WEBHOOK WITH PROPERLY SIGNED MESSAGES
 * (Phase B, item 3).
 *
 * What is real: the running API (port 3006 by default), the webhook route, the signature check, the
 * add-on and platform gates, the conversation (the real model), the suites, the jobs (run here at set
 * clocks through the same code the schedules call) and the database.
 * What is not: Meta. Every outgoing send goes to a recorder in this script (the API is started with
 * WHATSAPP_GRAPH_BASE_URL pointing at it), so nothing reaches any phone, and every inbound message is
 * signed here with a TEST app secret exactly as Meta signs (X-Hub-Signature-256 over the raw body).
 *
 * Start the API first, from the main tree's api/, with TEST values for this run only:
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_whatsapp_journeys PORT=3006 \
 *   EMAIL_SENDS_FOR_REAL=false GEMINI_LOCATION=global \
 *   WHATSAPP_APP_SECRET=<test secret> WHATSAPP_WEBHOOK_VERIFY_TOKEN=<test token> \
 *   WHATSAPP_PHONE_NUMBER_ID=100000000000001 WHATSAPP_ACCESS_TOKEN=<test token> \
 *   WHATSAPP_GRAPH_BASE_URL=http://127.0.0.1:3996/graph WHATSAPP_APPROVED_TEMPLATES=<the 13 names> \
 *   node dist/main.js
 * then run this with the same values (it signs with the same secret and reads the same database):
 *   npx ts-node -T journey/whatsapp-journeys.ts
 *
 * It prints what each person receives, word for word, and the checks it made. A person judges.
 * Refuses anything that is not a local API, a local gw_ database and a loopback recorder.
 */
import * as crypto from 'crypto';
import * as http from 'http';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { NestFactory } from '@nestjs/core';
import { TEMPLATES, fill } from '../src/modules/whatsapp/a-message-outside-the-window';

const API = process.env.API ?? 'http://localhost:3006/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const SECRET = process.env.WHATSAPP_APP_SECRET ?? '';
const GRAPH = process.env.WHATSAPP_GRAPH_BASE_URL ?? '';
const RECORDER_PORT = Number(new URL(GRAPH || 'http://127.0.0.1:3996').port || 3996);

export interface Check { journey: string; what: string; ok: boolean; detail?: string }
export interface Sent { to: string; kind: 'text' | 'template' | 'interactive' | 'other'; text: string; template?: string; at: number }

const stamp = Date.now();
const PW = 'WhatsAppJourneys123!';
const DAY = 86_400_000;

export async function runWhatsAppJourneys(opts: { quiet?: boolean } = {}): Promise<{ checks: Check[]; transcript: string[] }> {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL) || !/^http:\/\/127\.0\.0\.1:\d+\//.test(GRAPH) || !SECRET) {
    throw new Error('Refusing: a local API, a local gw_ database, a loopback recorder address in WHATSAPP_GRAPH_BASE_URL and a test WHATSAPP_APP_SECRET are all required.');
  }
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: Check[] = [];
  const transcript: string[] = [];
  const log = (line: string) => { transcript.push(line); if (!opts.quiet) console.log(line); };
  let journey = '';
  const heading = (t: string) => { journey = t; log(`\n==================== ${t} ====================`); };
  const check = (what: string, ok: boolean, detail?: string) => {
    checks.push({ journey, what, ok, detail });
    log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail}` : ''}`);
  };

  // ------------------------------------------------------------------------------------------------
  // The recorder: Meta's Graph API, on this machine. Sends are recorded; media is served from memory.
  // ------------------------------------------------------------------------------------------------
  const outbox: Sent[] = [];
  const files = new Map<string, { buffer: Buffer; mime: string }>();
  const readBody = (req: http.IncomingMessage) => new Promise<string>((res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => res(b)); });
  const recorder = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST' && /\/messages$/.test(url.pathname)) {
      const body = JSON.parse((await readBody(req)) || '{}');
      let text = '';
      let kind: Sent['kind'] = 'other';
      let template: string | undefined;
      if (body.type === 'text') { kind = 'text'; text = body.text?.body ?? ''; }
      else if (body.type === 'template') {
        kind = 'template';
        template = body.template?.name;
        const params: string[] = (body.template?.components?.[0]?.parameters ?? []).map((p: any) => p.text);
        const t = Object.values(TEMPLATES).find((x) => x.name === template);
        text = t ? fill(t.body, params) : `[template ${template}] ${params.join(' | ')}`;
      } else if (body.type === 'interactive') {
        kind = 'interactive';
        const rows = body.interactive?.action?.sections?.flatMap((s: any) => s.rows) ?? [];
        text = `${body.interactive?.body?.text ?? ''}\n${rows.map((r: any) => `[${r.title}]`).join(' ')}`;
      }
      outbox.push({ to: `+${body.to}`, kind, text, template, at: Date.now() });
      res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: `wamid.out.${outbox.length}` }] }));
      return;
    }
    const media = url.pathname.match(/\/graph\/(media-[\w-]+)$/);
    if (req.method === 'GET' && media) {
      const f = files.get(media[1]);
      if (!f) { res.statusCode = 404; res.end('{}'); return; }
      res.end(JSON.stringify({ url: `http://127.0.0.1:${RECORDER_PORT}/file/${media[1]}`, mime_type: f.mime, file_size: f.buffer.length }));
      return;
    }
    const file = url.pathname.match(/\/file\/(media-[\w-]+)$/);
    if (req.method === 'GET' && file && files.get(file[1])) {
      res.setHeader('content-type', files.get(file[1])!.mime);
      res.end(files.get(file[1])!.buffer);
      return;
    }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise<void>((ok) => recorder.listen(RECORDER_PORT, '127.0.0.1', ok));

  // ------------------------------------------------------------------------------------------------
  // The inbound door, signed as Meta signs.
  // ------------------------------------------------------------------------------------------------
  let counter = 0;
  /* How long Meta would wait for the answer to a webhook call. Meta redelivers a message it did not get a quick 200 for. */
  const slowest = { ms: 0, what: '' };
  const post = async (value: any, o: { badSignature?: boolean; unsigned?: boolean } = {}) => {
    const t0 = Date.now();
    try { return await postOnce(value, o); } finally {
      const ms = Date.now() - t0;
      if (ms > slowest.ms) { slowest.ms = ms; slowest.what = String(value?.messages?.[0]?.text?.body ?? value?.messages?.[0]?.type ?? '').slice(0, 40); }
    }
  };
  const postOnce = async (value: any, o: { badSignature?: boolean; unsigned?: boolean } = {}) => {
    const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'waba-test', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { display_phone_number: '15550000001', phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID }, ...value } }] }] });
    const sig = crypto.createHmac('sha256', o.badSignature ? 'not-the-secret' : SECRET).update(raw).digest('hex');
    const res = await fetch(`${API}/webhooks/whatsapp`, { method: 'POST', headers: { 'content-type': 'application/json', ...(o.unsigned ? {} : { 'x-hub-signature-256': `sha256=${sig}` }) }, body: raw });
    return res.status;
  };
  const message = (from: string, m: any) => ({ contacts: [{ wa_id: from.replace('+', ''), profile: { name: 'Test' } }], messages: [{ from: from.replace('+', ''), id: `wamid.in.${stamp}.${++counter}`, timestamp: String(Math.floor(Date.now() / 1000)), ...m }] });
  const since = (n: number) => outbox.slice(n);
  const waitQuiet = async (ms = 400) => new Promise((r) => setTimeout(r, ms));

  /** Writes to Groundwork's number as this person, and returns what they were sent back (in order). */
  const writes = async (who: { first: string; phone: string }, m: any, label?: string) => {
    const before = outbox.length;
    log(`  ${who.first} ${label ?? (m.type === 'text' ? `writes: "${m.text.body}"` : `sends a ${m.type}`)}`);
    const status = await post(message(who.phone, m));
    await waitQuiet();
    const got = since(before).filter((s) => s.to === who.phone);
    for (const g of got) log(`    ${who.first} reads${g.kind === 'template' ? ` [template ${g.template}]` : ''}:\n${g.text.split('\n').map((l) => `        ${l}`).join('\n')}`);
    if (!got.length) log(`    ${who.first} reads: (nothing)`);
    return { status, got, text: got.map((g) => g.text).join('\n\n') };
  };
  const says = (who: { first: string; phone: string }, text: string) => writes(who, { type: 'text', text: { body: text } });

  /** What went to this person since a point, also logged. */
  const received = (who: { first: string; phone: string }, from: number) => {
    const got = since(from).filter((s) => s.to === who.phone);
    for (const g of got) log(`    ${who.first} reads${g.kind === 'template' ? ` [template ${g.template}]` : ''}:\n${g.text.split('\n').map((l) => `        ${l}`).join('\n')}`);
    if (!got.length) log(`    ${who.first} reads: (nothing)`);
    return got;
  };

  async function api(path: string, o: { method?: string; body?: any; token?: string } = {}): Promise<any> {
    const res = await fetch(`${API}${path}`, {
      method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
      ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
    });
    const t = await res.text();
    let j: any = null;
    try { j = t ? JSON.parse(t) : null; } catch { j = { raw: t }; }
    if (!res.ok) return { refused: res.status, message: j?.message ?? t.slice(0, 300) };
    return j && typeof j === 'object' && 'success' in j && 'data' in j ? j.data : j;
  }

  // ------------------------------------------------------------------------------------------------
  // The world.
  // ------------------------------------------------------------------------------------------------
  heading('SETTING UP');
  /* The platform's own switch, as a platform admin turns it on in the back office. */
  await prisma.platformSetting.upsert({ where: { key: 'whatsapp_enabled' }, create: { key: 'whatsapp_enabled', value: true as any, updatedBy: 'whatsapp-journeys' }, update: { value: true as any } });

  const orgs = {
    on: await prisma.organization.create({ data: { name: `Kito Foods ${stamp}`, slug: `kito-${stamp}`, email: `office.${stamp}@kito.test`, whatsappAddOnOn: true } }),
    off: await prisma.organization.create({ data: { name: `Plain Goods ${stamp}`, slug: `plain-${stamp}`, email: `office.${stamp}@plain.test`, whatsappAddOnOn: false } }),
  };
  type Someone = { first: string; last: string; userId: string; personId: string; token: string; email: string; externalId: string; phone: string; orgId: string };
  let phoneCounter = 0;
  const make = async (first: string, last: string, role: 'ADMIN' | 'LEAD' | 'MEMBER', org: { id: string }, dom: string, p: { department?: string; manager?: string } = {}): Promise<Someone> => {
    const email = `${first.toLowerCase()}.${stamp}@${dom}.test`;
    const user = await prisma.user.create({ data: { email, organizationId: org.id, firstName: first, lastName: last, passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role } as any });
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: org.id, role: role as any } });
    const externalId = `staff-${first.toLowerCase()}-${stamp}`;
    const phone = `+2547${String(stamp % 1_000_000).padStart(6, '0').slice(-5)}${String(++phoneCounter).padStart(2, '0')}`.slice(0, 13);
    const person = await prisma.person.create({
      data: { organizationId: org.id, externalId, sourceSystem: 'hr-directory', userName: email, displayName: `${first} ${last}`, givenName: first, familyName: last, email, phone, linkedUserId: user.id, active: true, department: p.department ?? null, managerExternalId: p.manager ?? null } as any,
    });
    return { first, last, userId: user.id, personId: person.id, token: '', email, externalId, phone, orgId: org.id };
  };
  /* Signing in is throttled per address, so it is done only for the people who need the app, and waits when told to. */
  const signIn = async (p: Someone) => {
    if (p.token) return p.token;
    for (let i = 0; i < 3; i++) {
      const login = await api('/auth/login', { body: { email: p.email, password: PW } });
      if (login?.accessToken) { p.token = login.accessToken; return p.token; }
      if (login?.refused === 429) { log(`  (sign-in is throttled; waiting a minute for ${p.first})`); await new Promise((r) => setTimeout(r, 65_000)); continue; }
      throw new Error(`${p.first} could not sign in: ${JSON.stringify(login).slice(0, 200)}`);
    }
    throw new Error(`${p.first} could not sign in`);
  };
  const grace = await make('Grace', 'Achieng', 'ADMIN', orgs.on, 'kito', { department: 'Management' });
  const wairimu = await make('Wairimu', 'Njoroge', 'LEAD', orgs.on, 'kito', { department: 'Sales' });
  const amani = await make('Amani', 'Wekesa', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId });
  const chidi = await make('Chidi', 'Okeke', 'MEMBER', orgs.on, 'kito', { department: 'Sales', manager: wairimu.externalId });
  const baraka = await make('Baraka', 'Mutua', 'MEMBER', orgs.on, 'kito', { department: 'Operations' });
  const nia = await make('Nia', 'Kamau', 'LEAD', orgs.off, 'plain', { department: 'Sales' });
  const otto = await make('Otto', 'Mwangi', 'MEMBER', orgs.off, 'plain', { department: 'Sales', manager: nia.externalId });
  log('  Kito Foods has WhatsApp turned on: Grace (admin), Wairimu (lead and line manager), Amani, Chidi, Baraka.');
  log('  Plain Goods has not turned WhatsApp on: Nia (lead), Otto.');

  /* Jobs run in this process, through the same code the schedules call, against the same database. */
  const app = await NestFactory.createApplicationContext((await import('../src/app.module')).AppModule, { logger: ['error'] });
  const { GroundsCron } = await import('../src/modules/grounds/grounds.cron');
  const cron: any = app.get(GroundsCron, { strict: false });

  const ctx = { slowest, app, make, signIn, prisma, api, outbox, since, writes, says, received, check, log, heading, post, message, files, cron, stamp, PW, orgs, grace, wairimu, amani, chidi, baraka, nia, otto, waitQuiet, DAY };
  try {
    const { journeys } = await import('./whatsapp-journeys-steps');
    await journeys(ctx as any);
  } finally {
    await app.close().catch(() => undefined);
    await new Promise<void>((ok) => recorder.close(() => ok()));
    await prisma.$disconnect();
  }
  log(`\nThe slowest webhook call took ${(slowest.ms / 1000).toFixed(1)} seconds (the message was "${slowest.what}"). Meta redelivers a message it does not get a 200 for in good time; this is the time to measure once hosted.`);
  const failed = checks.filter((c) => !c.ok);
  log(`\n${checks.length - failed.length} of ${checks.length} checks passed.`);
  return { checks, transcript };
}

if (require.main === module) {
  runWhatsAppJourneys().then((r) => process.exit(r.checks.some((c) => !c.ok) ? 1 : 0)).catch((e) => { console.error(e); process.exit(2); });
}
