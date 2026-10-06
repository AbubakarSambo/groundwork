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
/*
 * FROM THE BACK OFFICE (5 Oct 2026). With WHATSAPP_FROM_THE_BACK_OFFICE=1 the API is started with NO
 * WHATSAPP_* keys at all (only WHATSAPP_GRAPH_BASE_URL and WHATSAPP_APPROVED_TEMPLATES, which the page
 * does not hold, and SETTINGS_ENCRYPTION_KEY). This script makes TEST values here, a platform admin types
 * them in at /admin/whatsapp/settings, switches WhatsApp on at /admin/whatsapp, and every message is
 * signed with the app secret that was saved there. Without it, the old way: the secret from the env.
 */
const FROM_THE_BACK_OFFICE = process.env.WHATSAPP_FROM_THE_BACK_OFFICE === '1';
/*
 * THE SERVER SETTINGS ARE THERE TOO, AND DIFFERENT (Hafsah, 5 Oct 2026: prove the saved details win and the
 * server settings are only the fallback). With WHATSAPP_ENV_DIFFERS=1 the API and this script are both started
 * with DUMMY WHATSAPP_* values that differ from the ones saved on the page; the run shows every send, the
 * signature check and the handshake use the saved ones, then removes saved secrets one at a time and shows
 * each falls back to its server setting.
 */
const ENV_DIFFERS = FROM_THE_BACK_OFFICE && process.env.WHATSAPP_ENV_DIFFERS === '1';
const ENV = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
  appSecret: process.env.WHATSAPP_APP_SECRET ?? '',
  verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '',
};
const TEST = {
  appSecret: `test-app-secret-${crypto.randomBytes(12).toString('hex')}`,
  verifyToken: `test-verify-${crypto.randomBytes(12).toString('hex')}`,
  accessToken: `TEST-access-token-${crypto.randomBytes(12).toString('hex')}`,
  phoneNumberId: '100000000000002',
  businessAccountId: '200000000000002',
  displayNumber: '+44 7700 900123',
};
const SECRET = FROM_THE_BACK_OFFICE ? TEST.appSecret : (process.env.WHATSAPP_APP_SECRET ?? '');
const VERIFY_TOKEN = FROM_THE_BACK_OFFICE ? TEST.verifyToken : (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '');
const PHONE_NUMBER_ID = FROM_THE_BACK_OFFICE ? TEST.phoneNumberId : process.env.WHATSAPP_PHONE_NUMBER_ID;
const GRAPH = process.env.WHATSAPP_GRAPH_BASE_URL ?? '';
const RECORDER_PORT = Number(new URL(GRAPH || 'http://127.0.0.1:3996').port || 3996);

export interface Check { journey: string; what: string; ok: boolean; detail?: string }
export interface Sent { to: string; kind: 'text' | 'template' | 'interactive' | 'other'; text: string; template?: string; at: number }

const stamp = Date.now();
const PW = 'WhatsAppJourneys123!';
const DAY = 86_400_000;

export async function runWhatsAppJourneys(opts: { quiet?: boolean } = {}): Promise<{ checks: Check[]; transcript: string[] }> {
  if (ENV_DIFFERS && (!ENV.accessToken || !ENV.phoneNumberId || !ENV.appSecret || !ENV.verifyToken || ENV.phoneNumberId === TEST.phoneNumberId)) {
    throw new Error('Refusing: with WHATSAPP_ENV_DIFFERS=1, set all four dummy WHATSAPP_ values, different from the saved ones.');
  }
  if (FROM_THE_BACK_OFFICE && !ENV_DIFFERS && Object.keys(process.env).some((k) => /^WHATSAPP_(ACCESS_TOKEN|PHONE_NUMBER_ID|APP_SECRET|WEBHOOK_VERIFY_TOKEN|DISPLAY_NUMBER)$/.test(k))) {
    throw new Error('Refusing: from the back office, no WHATSAPP_ key that the page holds may be set, or the run would not prove the saved settings are the ones used.');
  }
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL) || !/^http:\/\/127\.0\.0\.1:\d+\//.test(GRAPH) || !SECRET) {
    throw new Error('Refusing: a local API, a local gw_ database, a loopback recorder address in WHATSAPP_GRAPH_BASE_URL and a test WHATSAPP_APP_SECRET are all required.');
  }
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const checks: Check[] = [];
  /* The platform admin's session, kept for the end of the run (journey 14). */
  let staffToken = '';
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
  /* Which phone number ID and token every send used, so the run can prove they were the saved ones. */
  const sentWith: { phoneNumberId: string; authorization: string }[] = [];
  const tokenSeen: string[] = [];
  const files = new Map<string, { buffer: Buffer; mime: string }>();
  const readBody = (req: http.IncomingMessage) => new Promise<string>((res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => res(b)); });
  const recorder = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST' && /\/messages$/.test(url.pathname)) {
      sentWith.push({ phoneNumberId: url.pathname.split('/').slice(-2)[0], authorization: String(req.headers.authorization ?? '') });
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
    /* The back office's "Is it connected?": one read of the phone number ID with the saved token. */
    const numberRead = url.pathname.match(/\/graph\/(\d+)$/);
    if (req.method === 'GET' && numberRead) {
      const ok = numberRead[1] === TEST.phoneNumberId && req.headers.authorization === `Bearer ${TEST.accessToken}`;
      tokenSeen.push(String(req.headers.authorization ?? ''));
      if (!ok) { res.statusCode = 401; res.end(JSON.stringify({ error: { type: 'OAuthException', code: 190 } })); return; }
      res.end(JSON.stringify({ display_phone_number: TEST.displayNumber, verified_name: 'Groundwork', id: TEST.phoneNumberId }));
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
  const post = async (value: any, o: { badSignature?: boolean; unsigned?: boolean; secret?: string } = {}) => {
    const t0 = Date.now();
    try { return await postOnce(value, o); } finally {
      const ms = Date.now() - t0;
      if (ms > slowest.ms) { slowest.ms = ms; slowest.what = String(value?.messages?.[0]?.text?.body ?? value?.messages?.[0]?.type ?? '').slice(0, 40); }
    }
  };
  const postOnce = async (value: any, o: { badSignature?: boolean; unsigned?: boolean; secret?: string } = {}) => {
    const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'waba-test', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { display_phone_number: '15550000001', phone_number_id: PHONE_NUMBER_ID }, ...value } }] }] });
    const sig = crypto.createHmac('sha256', o.badSignature ? 'not-the-secret' : (o.secret ?? SECRET)).update(raw).digest('hex');
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
  if (FROM_THE_BACK_OFFICE) await setUpFromTheBackOffice();
  else {
    /* The platform's own switch, as a platform admin turns it on in the back office. */
    await prisma.platformSetting.upsert({ where: { key: 'whatsapp_enabled' }, create: { key: 'whatsapp_enabled', value: true as any, updatedBy: 'whatsapp-journeys' }, update: { value: true as any } });
  }

  /**
   * GROUNDWORK'S NUMBER, TYPED IN BY STAFF. Ama is a platform admin (made here, on a gw_ copy). She has a
   * week's back-office pass written straight into the copy, because the emailed code is a separate door
   * this run is not about. Everything else goes through the routes the page calls.
   */
  async function setUpFromTheBackOffice() {
    heading('0. GROUNDWORK STAFF SET GROUNDWORK\'S WHATSAPP NUMBER IN THE BACK OFFICE');
    const staffOrg = await prisma.organization.create({ data: { name: `Groundwork staff ${stamp}`, slug: `gw-staff-${stamp}`, email: `staff.${stamp}@groundwork.test` } });
    const email = `ama.${stamp}@groundwork.test`;
    const ama = await prisma.user.create({ data: { email, organizationId: staffOrg.id, firstName: 'Ama', lastName: 'Staff', passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: 'ADMIN', isPlatformAdmin: true } as any });
    await prisma.organizationMembership.create({ data: { userId: ama.id, organizationId: staffOrg.id, role: 'ADMIN' as any } });
    await (prisma as any).backOfficePass.create({ data: { userId: ama.id, via: 'email', expiresAt: new Date(Date.now() + 7 * DAY) } });
    const login = await api('/auth/login', { body: { email, password: PW } });
    const token = login?.accessToken;
    if (!token) throw new Error(`Ama could not sign in: ${JSON.stringify(login).slice(0, 200)}`);
    const orgAdminEmail = `ops.${stamp}@kito-admin.test`;
    const notStaff = await prisma.user.create({ data: { email: orgAdminEmail, organizationId: staffOrg.id, firstName: 'Ops', lastName: 'Admin', passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: 'ADMIN' } as any });
    await prisma.organizationMembership.create({ data: { userId: notStaff.id, organizationId: staffOrg.id, role: 'ADMIN' as any } });
    const notStaffToken = (await api('/auth/login', { body: { email: orgAdminEmail, password: PW } }))?.accessToken;

    const before = await api('/admin/whatsapp/settings', { token });
    log(`  Before anything is saved, the page says: ${before?.secrets?.accessToken?.saying} ${before?.switch?.saying}`);
    if (ENV_DIFFERS) check('Before anything is saved, each secret is the server setting, and the page says so', ['accessToken', 'appSecret', 'verifyToken'].every((k) => before?.secrets?.[k]?.from === 'server') && before?.fields?.phoneNumberId?.value === ENV.phoneNumberId, JSON.stringify(before?.secrets));
    else check('Before anything is saved, nothing is set and WhatsApp is not live', before?.secrets?.accessToken?.state === 'not set' && before?.switch?.live === false, JSON.stringify(before).slice(0, 400));
    const refused = await api('/admin/whatsapp/settings', { method: 'PUT', token: notStaffToken, body: { accessToken: 'x'.repeat(30) } });
    check('An admin of an organisation who is not Groundwork staff is refused (403) and nothing is saved', refused?.refused === 403, JSON.stringify(refused));

    const saved = await api('/admin/whatsapp/settings', { method: 'PUT', token, body: { displayNumber: TEST.displayNumber, phoneNumberId: TEST.phoneNumberId, businessAccountId: TEST.businessAccountId, accessToken: TEST.accessToken, appSecret: TEST.appSecret, verifyToken: TEST.verifyToken } });
    log(`  Ama saves the number, the two IDs and the three secrets. The page says: ${saved?.saved}`);
    for (const k of ['accessToken', 'appSecret', 'verifyToken']) log(`    ${saved?.secrets?.[k]?.saying}`);
    log(`    ${saved?.webhook?.saying}`);
    check('Each secret reads "set", saved here', ['accessToken', 'appSecret', 'verifyToken'].every((k) => saved?.secrets?.[k]?.state === 'set' && saved?.secrets?.[k]?.from === 'here'), JSON.stringify(saved?.secrets));
    check('No secret comes back in what the page is served', ![TEST.accessToken, TEST.appSecret, TEST.verifyToken].some((s) => JSON.stringify(saved).includes(s)));
    const row = await prisma.platformSetting.findUnique({ where: { key: 'whatsapp.groundworksNumber' } });
    check('The stored row holds no secret in the clear', !!row && ![TEST.accessToken, TEST.appSecret, TEST.verifyToken].some((s) => JSON.stringify(row.value).includes(s)), JSON.stringify(row?.value).slice(0, 200));
    check('The webhook address to give Meta is shown', /^The webhook address to give Meta is http.*\/api\/v1\/webhooks\/whatsapp\.$|PUBLIC_API_URL is not set/.test(saved?.webhook?.saying ?? ''), saved?.webhook?.saying);

    const connection = await api('/admin/whatsapp/settings/connection', { token });
    log(`  "Is it connected?" ${connection?.saying}`);
    check('"Is it connected?" reads Connected, from one read of the saved number ID with the saved token', connection?.connected === true && connection?.saying === `Connected. Meta has this number as ${TEST.displayNumber}, under the name Groundwork.` && tokenSeen.at(-1) === `Bearer ${TEST.accessToken}`, JSON.stringify(connection));

    const testFrom = outbox.length;
    const test = await api('/admin/whatsapp/settings/test', { token, body: { to: '+44 7700 900999' } });
    await waitQuiet();
    const tested = since(testFrom);
    log(`  The test message: ${test?.saying}`);
    for (const t of tested) log(`    ${t.to} reads:\n        ${t.text}`);
    check('The test message goes to the typed number only, from the saved number ID with the saved token', tested.length === 1 && tested[0].to === '+447700900999' && tested[0].text === "This is a test message from Groundwork. If you can read it, Groundwork's WhatsApp number is working." && sentWith.at(-1)?.phoneNumberId === TEST.phoneNumberId && sentWith.at(-1)?.authorization === `Bearer ${TEST.accessToken}`, JSON.stringify({ test, tested, with: sentWith.at(-1)?.phoneNumberId }));
    const testRow = await prisma.whatsAppSend.findFirst({ where: { phone: '+447700900999' }, orderBy: { createdAt: 'desc' } });
    check('The test is written down with the staff member who sent it', testRow?.kind === `admin-test:${ama.id}`, JSON.stringify(testRow?.kind));

    const on = await api('/admin/whatsapp', { method: 'PATCH', token, body: { enabled: true } });
    log(`  Ama switches WhatsApp on. live: ${on?.live}`);
    const after = await api('/admin/whatsapp/settings', { token });
    log(`  The page now says: ${after?.switch?.saying}`);
    check('WhatsApp is live once Ama switches it on', on?.live === true && after?.switch?.saying === 'WhatsApp is on for everyone. Messages go from this number.', JSON.stringify(after?.switch));
    staffToken = token;

    if (ENV_DIFFERS) {
      heading('0b. THE SAVED DETAILS WIN OVER THE DIFFERENT SERVER SETTINGS');
      const base = API;
      const hs = async (t: string) => { const r = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(t)}&hub.challenge=4242`); return { status: r.status, body: await r.text() }; };
      const savedHs = await hs(TEST.verifyToken);
      const envHs = await hs(ENV.verifyToken);
      log(`  Handshake with the saved verify token: ${savedHs.status}; with the server's: ${envHs.status}`);
      check("Meta's handshake accepts the saved verify token and refuses the server setting's", savedHs.status === 200 && savedHs.body === '4242' && envHs.status === 403, JSON.stringify({ savedHs, envHs }));
      const ping = { statuses: [{ id: 'wamid.status', status: 'delivered' }] };
      const withEnv = await post(ping, { secret: ENV.appSecret });
      const withSaved = await post(ping);
      log(`  A webhook post signed with the server's app secret: ${withEnv}; with the saved one: ${withSaved}`);
      check('The webhook refuses a post signed with the server setting\'s app secret and accepts one signed with the saved app secret', withEnv === 401 && withSaved < 300, JSON.stringify({ withEnv, withSaved }));
    }
  }

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

  const ctx = { verifyToken: VERIFY_TOKEN, sentWith, TEST, FROM_THE_BACK_OFFICE, slowest, app, make, signIn, prisma, api, outbox, since, writes, says, received, check, log, heading, post, message, files, cron, stamp, PW, orgs, grace, wairimu, amani, chidi, baraka, nia, otto, waitQuiet, DAY };
  try {
    /* WHATSAPP_ONLY_ENDINGS=1 runs only journey 16, how a check-in ends (and stops halfway), on a copy that already has the world set up here. */
    const onlyTheEndings = process.env.WHATSAPP_ONLY_ENDINGS === '1';
    if (!onlyTheEndings) {
      const { journeys } = await import('./whatsapp-journeys-steps');
      await journeys(ctx as any);
      const { moreJourneys } = await import('./whatsapp-journeys-more');
      await moreJourneys(ctx as any);
    }
    if (process.env.WHATSAPP_JOURNEYS_106 !== '0') {
      const { decision106, howItEnds } = await import('./whatsapp-journeys-106');
      if (!onlyTheEndings) await decision106(ctx as any);
      const endings = await howItEnds(ctx as any);
      require('fs').writeFileSync(process.env.WHATSAPP_ENDINGS_OUT ?? '/dev/null', endings.join('\n'));
    }
    if (FROM_THE_BACK_OFFICE) {
      heading('EVERY SEND USED THE SAVED NUMBER AND TOKEN');
      const other = sentWith.filter((w) => w.phoneNumberId !== TEST.phoneNumberId || w.authorization !== `Bearer ${TEST.accessToken}`);
      check(`All ${sentWith.length} sends went from the saved phone number ID with the saved access token`, sentWith.length > 0 && other.length === 0, JSON.stringify(other.slice(0, 3)));
      if (ENV_DIFFERS) check('Not one send went with the server setting\'s phone number ID or token', !sentWith.some((w) => w.phoneNumberId === ENV.phoneNumberId || w.authorization === `Bearer ${ENV.accessToken}`));
    }
    if (ENV_DIFFERS) {
      heading('14. A SAVED SECRET REMOVED ON THE PAGE FALLS BACK TO THE SERVER SETTING');
      const remove = async (k: string) => {
        const page = await api('/admin/whatsapp/settings', { method: 'PUT', token: staffToken, body: { remove: [k] } });
        log(`  Ama removes the saved ${k}. The page says: ${page?.secrets?.[k]?.saying}`);
        return page;
      };
      const ping = { statuses: [{ id: 'wamid.status.2', status: 'read' }] };
      const p1 = await remove('appSecret');
      const envNow = await post(ping, { secret: ENV.appSecret });
      const savedNow = await post(ping, { secret: TEST.appSecret });
      log(`  Signed with the server's app secret: ${envNow}; with the one that was saved: ${savedNow}`);
      check('With the saved app secret removed, the page says the server setting is used, and the webhook now takes the server\'s app secret and refuses the removed one', p1?.secrets?.appSecret?.from === 'server' && envNow < 300 && savedNow === 401, JSON.stringify({ from: p1?.secrets?.appSecret, envNow, savedNow }));
      const p2 = await remove('verifyToken');
      const envHs = await fetch(`${API}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(ENV.verifyToken)}&hub.challenge=77`);
      const oldHs = await fetch(`${API}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(TEST.verifyToken)}&hub.challenge=77`);
      check('With the saved verify token removed, the handshake takes the server\'s verify token and refuses the removed one', p2?.secrets?.verifyToken?.from === 'server' && envHs.status === 200 && oldHs.status === 403, JSON.stringify({ env: envHs.status, old: oldHs.status }));
      const p3 = await remove('accessToken');
      const n = sentWith.length;
      const t = await api('/admin/whatsapp/settings/test', { token: staffToken, body: { to: '+44 7700 900998' } });
      await waitQuiet();
      const last = sentWith.slice(n);
      log(`  The test message after removing the saved access token: ${t?.saying}`);
      check('With the saved access token removed, a send carries the server\'s token, and still the saved phone number ID', p3?.secrets?.accessToken?.from === 'server' && last.length === 1 && last[0].authorization === `Bearer ${ENV.accessToken}` && last[0].phoneNumberId === TEST.phoneNumberId, JSON.stringify(last));
    }
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
