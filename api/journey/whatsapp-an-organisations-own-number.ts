/**
 * AN ORGANISATION'S OWN WHATSAPP NUMBER, END TO END ON THIS COMPUTER (piece 5, A).
 *
 * What is real: the running API, its routes (the Connections page's PUT, Meta's handshake and callback for one organisation, and the
 * callback for Groundwork's own number), the signature checks, the sealing of keys, the sender with its 24-hour window per business
 * number and its templates per organisation, STOP, and the database. What is not: Meta. Every send goes to a recorder on a loopback
 * port (the API is started with WHATSAPP_GRAPH_BASE_URL pointing at it), which writes down which number id and which token it was
 * sent with. Every inbound message is signed here, with the secret of the number it is for.
 *
 * Two organisations. Kito runs its own number; Plain uses Groundwork's. Ada is on Kito's roster and writes to BOTH numbers. Bola is on
 * Plain's roster and writes to Groundwork's number, and then to Kito's number, where she is nobody.
 *
 * Start the API first (a worktree's built dist, port of your own) with:
 *   DATABASE_URL=postgresql://<you>@localhost:5432/gw_wa_own PORT=3059 EMAIL_SENDS_FOR_REAL=false SETTINGS_ENCRYPTION_KEY=<32 bytes>
 *   WHATSAPP_APP_SECRET=<test> WHATSAPP_WEBHOOK_VERIFY_TOKEN=<test> WHATSAPP_PHONE_NUMBER_ID=100000000000001 WHATSAPP_ACCESS_TOKEN=<test>
 *   WHATSAPP_GRAPH_BASE_URL=http://127.0.0.1:3997/graph WHATSAPP_APPROVED_TEMPLATES=<names> node dist/main.js
 * then, with the same values:  npx ts-node -T journey/whatsapp-an-organisations-own-number.ts
 *
 * Refuses anything that is not a local API, a local gw_ database and a loopback recorder.
 */
import * as crypto from 'crypto';
import * as http from 'http';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3059/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const GRAPH = process.env.WHATSAPP_GRAPH_BASE_URL ?? '';
const PLATFORM = {
  appSecret: process.env.WHATSAPP_APP_SECRET ?? '', verifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '', accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
};
const KITO = {
  phoneNumberId: '700000000000042', accessToken: `KITO-token-${crypto.randomBytes(8).toString('hex')}`, appSecret: `kito-secret-${crypto.randomBytes(8).toString('hex')}`,
  displayNumber: '+254 700 000 042',
};
const PW = 'OwnNumber123!';
const stamp = Date.now();
/* Numbers that differ each run, so a second run on the same database does not meet the first one's people. */
const ADA = `+2547${String(stamp).slice(-8)}`;
const BOLA = `+2547${String(stamp + 1).slice(-8)}`;
const PORT = Number(new URL(GRAPH || 'http://127.0.0.1:3997').port || 3997);

interface Sent { phoneNumberId: string; authorization: string; to: string; kind: string; template?: string; text: string }

export async function run(): Promise<{ checks: { what: string; ok: boolean; detail?: string }[]; transcript: string[] }> {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL) || !/^http:\/\/127\.0\.0\.1:\d+\//.test(GRAPH) || !PLATFORM.appSecret) {
    throw new Error('Refusing: a local API, a local gw_ database, a loopback recorder in WHATSAPP_GRAPH_BASE_URL and the platform test values are all required.');
  }
  const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
  const transcript: string[] = [];
  const checks: { what: string; ok: boolean; detail?: string }[] = [];
  const log = (l: string) => { transcript.push(l); console.log(l); };
  const check = (what: string, ok: boolean, detail?: string) => { checks.push({ what, ok, detail }); log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${!ok && detail ? `\n        ${detail}` : ''}`); };

  // The recorder: Meta's Graph API.
  const outbox: Sent[] = [];
  const readBody = (req: http.IncomingMessage) => new Promise<string>((res) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => res(b)); });
  const recorder = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST' && /\/messages$/.test(url.pathname)) {
      const body = JSON.parse((await readBody(req)) || '{}');
      const text = body.type === 'text' ? body.text?.body ?? '' : body.type === 'template' ? `[template ${body.template?.name}] ${(body.template?.components?.[0]?.parameters ?? []).map((p: any) => p.text).join(' | ')}` : '[other]';
      outbox.push({ phoneNumberId: url.pathname.split('/').slice(-2)[0], authorization: String(req.headers.authorization ?? ''), to: `+${body.to}`, kind: body.type, template: body.template?.name, text });
      res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: `wamid.out.${outbox.length}` }] }));
      return;
    }
    res.statusCode = 404; res.end('{}');
  });
  await new Promise<void>((ok) => recorder.listen(PORT, '127.0.0.1', ok));

  async function api(path: string, o: { method?: string; body?: any; token?: string } = {}): Promise<any> {
    const res = await fetch(`${API}${path}`, { method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) }, ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}) });
    const t = await res.text(); let j: any = null; try { j = t ? JSON.parse(t) : null; } catch { j = { raw: t }; }
    if (!res.ok) return { refused: res.status, message: j?.message ?? t.slice(0, 300) };
    return j && typeof j === 'object' && 'success' in j && 'data' in j ? j.data : j;
  }

  // The inbound door, signed as Meta signs, for one number.
  let counter = 0;
  const raw = (phoneNumberId: string, from: string, text: string) => JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: 'waba-test', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { display_phone_number: '15550000001', phone_number_id: phoneNumberId }, contacts: [{ wa_id: from.replace('+', ''), profile: { name: 'Test' } }], messages: [{ from: from.replace('+', ''), id: `wamid.in.${stamp}.${++counter}`, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }] } }] }] });
  const postTo = async (path: string, body: string, secret: string | null) => {
    const sig = secret ? crypto.createHmac('sha256', secret).update(body).digest('hex') : null;
    const res = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(sig ? { 'x-hub-signature-256': `sha256=${sig}` } : {}) }, body });
    return res.status;
  };
  const wait = (ms = 700) => new Promise((r) => setTimeout(r, ms));
  const writesToKito = async (orgId: string, from: string, text: string, secret = KITO.appSecret) => { const n = outbox.length; const status = await postTo(`/webhooks/whatsapp/${orgId}`, raw(KITO.phoneNumberId, from, text), secret); await wait(); return { status, got: outbox.slice(n).filter((s) => s.to === from) }; };
  const writesToGroundwork = async (from: string, text: string, secret = PLATFORM.appSecret) => { const n = outbox.length; const status = await postTo('/webhooks/whatsapp', raw(PLATFORM.phoneNumberId, from, text), secret); await wait(); return { status, got: outbox.slice(n).filter((s) => s.to === from) }; };
  const reads = (who: string, got: Sent[]) => { for (const g of got) log(`    ${who} reads (sent from number id ${g.phoneNumberId}${g.template ? `, template ${g.template}` : ''}): ${g.text}`); if (!got.length) log(`    ${who} reads: (nothing)`); };

  // ------------------------------------------------------------------------------------------------ the world
  log('\n==================== SETTING UP ====================');
  await prisma.platformSetting.upsert({ where: { key: 'whatsapp_enabled' }, create: { key: 'whatsapp_enabled', value: true as any, updatedBy: 'own-number-journey' }, update: { value: true as any } });
  const mkOrg = async (name: string, extra: any = {}) => prisma.organization.create({ data: { name: `${name} ${stamp}`, slug: `${name.toLowerCase()}-${stamp}`, email: `${name.toLowerCase()}.${stamp}@own.test`, ...extra } });
  const kito = await mkOrg('Kito');
  const plain = await mkOrg('Plain', { whatsappAddOnOn: true });
  const person = async (org: { id: string }, first: string, role: 'ADMIN' | 'MEMBER', phone: string | null) => {
    const u = await prisma.user.create({ data: { email: `${first.toLowerCase()}.${stamp}@own.test`, firstName: first, lastName: 'Test', organizationId: org.id, passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: role as any, phoneNumber: phone } });
    await prisma.organizationMembership.create({ data: { userId: u.id, organizationId: org.id, role: role as any } });
    await prisma.person.create({ data: { organizationId: org.id, sourceSystem: 'seed', externalId: first.toLowerCase(), userName: first.toLowerCase(), displayName: `${first} Test`, givenName: first, familyName: 'Test', email: u.email, phone, linkedUserId: u.id } });
    return u;
  };
  const kofi = await person(kito, 'Kofi', 'ADMIN', null);
  const ada = await person(kito, 'Ada', 'MEMBER', ADA);
  const bola = await person(plain, 'Bola', 'MEMBER', BOLA);
  const kofiToken = (await api('/auth/login', { body: { email: kofi.email, password: PW } }))?.accessToken;
  if (!kofiToken) throw new Error('Kofi could not sign in');
  log(`  Kito (admin Kofi; Ada) will keep its own number. Plain (Bola) uses Groundwork's.`);

  // ------------------------------------------------------------------------------------------------ 1. connect
  log('\n==================== 1. THE ORGANISATION SAVES ITS OWN NUMBER ON THE CONNECTIONS PAGE ====================');
  const saved = await api('/integrations/whatsapp', { method: 'PUT', token: kofiToken, body: { phoneNumberId: KITO.phoneNumberId, displayNumber: KITO.displayNumber, accessToken: KITO.accessToken, appSecret: KITO.appSecret } });
  log(`  Kofi saves it. The page is served: ${JSON.stringify(saved)}`);
  check('The save is accepted, and the callback address for this organisation is given', !saved?.refused && saved?.webhookPath === `/api/v1/webhooks/whatsapp/${kito.id}`, JSON.stringify(saved).slice(0, 300));
  check('Nothing secret comes back: not the token, not the app secret; only the last four letters of the token', !JSON.stringify(saved).includes(KITO.accessToken) && !JSON.stringify(saved).includes(KITO.appSecret) && saved?.connection?.tokenEndsWith === KITO.accessToken.slice(-4));
  const stored: any[] = await prisma.$queryRawUnsafe(`select access_token, app_secret, verify_token from whatsapp_connections where organization_id = '${kito.id}'`);
  check('In the database both keys are sealed (v1:...), and neither can be read there', /^v1:/.test(stored[0].access_token) && /^v1:/.test(stored[0].app_secret) && !JSON.stringify(stored).includes(KITO.accessToken) && !JSON.stringify(stored).includes(KITO.appSecret));
  const page = await api('/integrations/whatsapp', { token: kofiToken });
  check('The Connections page read afterwards holds no secret either', !JSON.stringify(page).includes(KITO.accessToken) && !JSON.stringify(page).includes(KITO.appSecret) && !JSON.stringify(page).includes(stored[0].access_token));
  const refused = await api('/integrations/whatsapp', { method: 'PUT', token: (await api('/auth/login', { body: { email: ada.email, password: PW } }))?.accessToken, body: { phoneNumberId: '700000000000043', accessToken: 'x', appSecret: 'y' } });
  check('A member (Ada) cannot save a number for the organisation (403)', refused?.refused === 403, JSON.stringify(refused));

  // ------------------------------------------------------------------------------------------------ 2. handshake and signatures
  log('\n==================== 2. META\'S HANDSHAKE AND SIGNATURES, FOR EACH NUMBER ====================');
  const verifyToken = stored[0].verify_token as string;
  const wrong = await fetch(`${API}/webhooks/whatsapp/${kito.id}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123`);
  check('The handshake with the wrong token is refused (403)', wrong.status === 403);
  const right = await fetch(`${API}/webhooks/whatsapp/${kito.id}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=abc123`);
  check('The handshake with the organisation\'s token answers the challenge, bare', right.status === 200 && (await right.text()) === 'abc123');
  const other = await fetch(`${API}/webhooks/whatsapp/${plain.id}?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=abc123`);
  check('The same token on an organisation with no number is refused (403)', other.status === 403);
  const body = raw(KITO.phoneNumberId, ADA, 'hello');
  check('A message to the organisation\'s address signed with the organisation\'s app secret is accepted (200)', (await postTo(`/webhooks/whatsapp/${kito.id}`, body, KITO.appSecret)) === 200);
  check('Signed with GROUNDWORK\'S secret it is refused (401)', (await postTo(`/webhooks/whatsapp/${kito.id}`, body, PLATFORM.appSecret)) === 401);
  check('Unsigned it is refused (401)', (await postTo(`/webhooks/whatsapp/${kito.id}`, body, null)) === 401);
  check('A message to GROUNDWORK\'S address signed with the organisation\'s secret is refused (401)', (await postTo('/webhooks/whatsapp', raw(PLATFORM.phoneNumberId, BOLA, 'hello'), KITO.appSecret)) === 401);
  const gwStatus = await postTo('/webhooks/whatsapp', raw(PLATFORM.phoneNumberId, BOLA, 'hi'), PLATFORM.appSecret);
  check('Signed with Groundwork\'s own secret it is accepted (any 2xx; Meta asks only for that)', gwStatus >= 200 && gwStatus < 300, String(gwStatus));
  await wait();
  outbox.length = 0;

  // ------------------------------------------------------------------------------------------------ 3. one number per conversation
  log('\n==================== 3. ONE NUMBER PER CONVERSATION: A REPLY GOES FROM THE NUMBER THE PERSON WROTE TO ====================');
  log('  Ada writes "stop" to KITO\'S number.');
  const adaStop = await writesToKito(kito.id, ADA, 'stop');
  reads('Ada', adaStop.got);
  check('Ada\'s answer is sent from Kito\'s number id, with Kito\'s token, and says what stop does', adaStop.got.length === 1 && adaStop.got[0].phoneNumberId === KITO.phoneNumberId && adaStop.got[0].authorization === `Bearer ${KITO.accessToken}` && /^Stopped\./.test(adaStop.got[0].text), JSON.stringify(adaStop.got));
  log('  Bola writes "hello" to GROUNDWORK\'S number.');
  const bolaHello = await writesToGroundwork(BOLA, 'hello');
  reads('Bola', bolaHello.got);
  check('Bola\'s answer is sent from Groundwork\'s number id, with Groundwork\'s token', bolaHello.got.length >= 1 && bolaHello.got.every((g) => g.phoneNumberId === PLATFORM.phoneNumberId && g.authorization === `Bearer ${PLATFORM.accessToken}`), JSON.stringify(bolaHello.got));
  log('  Bola (Plain) writes "hello" to KITO\'S number, where she is nobody.');
  const bolaToKito = await writesToKito(kito.id, BOLA, 'hello');
  reads('Bola', bolaToKito.got);
  check('She is told Groundwork does not know the number, from Kito\'s number, and nothing of Plain is said or crossed', bolaToKito.got.length === 1 && bolaToKito.got[0].phoneNumberId === KITO.phoneNumberId && /does not know this number/.test(bolaToKito.got[0].text) && !/Plain/.test(bolaToKito.got[0].text));
  log('  Ada writes "hello" to GROUNDWORK\'S number as well.');
  const adaToGw = await writesToGroundwork(ADA, 'start');
  reads('Ada', adaToGw.got);
  check('Whatever she is answered, it is sent from Groundwork\'s number with Groundwork\'s token, never Kito\'s', adaToGw.got.length === 0 || adaToGw.got.every((g) => g.phoneNumberId === PLATFORM.phoneNumberId && g.authorization === `Bearer ${PLATFORM.accessToken}`), JSON.stringify(adaToGw.got));
  check('No send anywhere used a token that is not the one for the number it left from', outbox.every((s) => (s.phoneNumberId === KITO.phoneNumberId && s.authorization === `Bearer ${KITO.accessToken}`) || (s.phoneNumberId === PLATFORM.phoneNumberId && s.authorization === `Bearer ${PLATFORM.accessToken}`)), JSON.stringify(outbox.map((s) => [s.phoneNumberId, s.authorization.slice(-6)])));
  const sendRows: any[] = await prisma.$queryRawUnsafe(`select phone, kind, sent_at is not null as sent from whatsapp_sends where phone = '${ADA}' order by created_at`);
  log(`  Sends recorded for Ada: ${JSON.stringify(sendRows)}`);

  // ------------------------------------------------------------------------------------------------ 3b. the halfway messages, on the organisation's own number
  log('\n==================== 3b. A CHECK-IN LEFT HALFWAY, ON THE ORGANISATION\'S OWN NUMBER ====================');
  const { remindThemToCarryOn, warnTheirPhone, tellThemTheClockClosedIt, ANSWERED_HERE } = await import('../src/modules/whatsapp/a-check-in-left-halfway');
  await prisma.platformSetting.upsert({ where: { key: 'release.time_running_out_warnings_from' }, create: { key: 'release.time_running_out_warnings_from', value: '2026-10-05T00:00:00Z' as any, updatedBy: 'own-number-journey' }, update: { value: '2026-10-05T00:00:00Z' as any } });
  await prisma.platformSetting.upsert({ where: { key: 'release.whatsappHalfwayMessages' }, create: { key: 'release.whatsappHalfwayMessages', value: { on: true } as any, updatedBy: 'own-number-journey' }, update: { value: { on: true } as any } });
  const ground = await prisma.ground.create({ data: { organizationId: kito.id, initiatorId: kofi.id, scenario: 'NEW_PROJECT' as any, moment: 'STARTING' as any, status: 'ACTIVE' as any, label: 'Kito sales team, Q4', timelineDays: 60, createdAt: new Date(Date.now() - 2 * 86_400_000) } });
  const party = await prisma.groundParticipant.create({ data: { groundId: ground.id, userId: ada.id, email: ada.email, partyType: 'PARTICIPANT' as any } });
  const session = await prisma.checkIn.create({ data: { groundId: ground.id, participantId: party.id, sessionNumber: 1, status: 'IN_PROGRESS' as any, availableFrom: new Date(Date.now() - 86_400_000), startedAt: new Date(Date.now() - 6 * 3_600_000) } });
  await prisma.whatsAppSend.create({ data: { organizationId: kito.id, phone: ADA, checkInId: session.id, kind: ANSWERED_HERE } });
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('../src/app.module');
  const { WhatsAppService } = await import('../src/modules/whatsapp/whatsapp.service');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const wa = app.get(WhatsAppService);
  const noon = new Date(); noon.setUTCHours(11, 0, 0, 0);
  const sentBefore = outbox.length;
  const reminded = await remindThemToCarryOn(prisma, wa as any, { id: session.id, warningFiredAt: null }, { createdAt: new Date(Date.now() - 4 * 3_600_000), role: 'AI' }, noon);
  await wait(300);
  const warned = await warnTheirPhone(prisma, wa as any, session.id, noon);
  await wait(300);
  const closed30 = await tellThemTheClockClosedIt(prisma, wa as any, session.id, 'quiet');
  await wait(300);
  const halfway = outbox.slice(sentBefore).filter((x) => x.to === ADA);
  reads('Ada', halfway);
  check('The three halfway messages (carry on, the 30-minute warning, closed by the clock) were all sent', reminded && warned && closed30 && halfway.length === 3, JSON.stringify({ reminded, warned, closed30, n: halfway.length }));
  check('All three left from Kito\'s own number with Kito\'s token, none from Groundwork\'s', halfway.every((g) => g.phoneNumberId === KITO.phoneNumberId && g.authorization === `Bearer ${KITO.accessToken}`));
  check('They say what they should: carry on, 30 minutes, and that it closed with what she said kept', /carry on/i.test(halfway[0]?.text ?? '') && /30 minutes/.test(halfway[1]?.text ?? '') && /closed/.test(halfway[2]?.text ?? '') && /report follows/.test(halfway[2]?.text ?? ''), halfway.map((g) => g.text).join(' || '));

  // ------------------------------------------------------------------------------------------------ 4. the 24 hours, per business number, and each side's own templates
  log('\n==================== 4. THE 24 HOURS PER BUSINESS NUMBER, AND EACH SIDE\'S OWN APPROVED TEMPLATES ====================');
  const OPEN = (name: string) => `Hi ${name}, your check-in for the sales team is open. It takes about five minutes, and you can answer right here. Reply START to begin.`;
  const sendTo = async (who: string, orgId: string, phone: string) => { const n = outbox.length; const r = await wa.sendFor(orgId, phone, OPEN(who), { kind: 'checkin-open', params: [who, 'the sales team'] }); await wait(300); return { r, got: outbox.slice(n).filter((x) => x.to === phone) }; };

  /* The halfway messages above are Groundwork writing first to Ada; the day's limit on those is the sender's rule, so it is cleared to try the next thing. */
  await prisma.$executeRawUnsafe(`delete from whatsapp_sends where phone = '${ADA}' and kind in ('carry-on', 'closes-in-half-an-hour', 'closed-by-the-clock')`);
  log('  Ada has just written to Kito\'s number, so its 24 hours are open, and Groundwork asks her to start a check-in.');
  const inside = await sendTo('Ada', kito.id, ADA);
  reads('Ada', inside.got);
  check('It goes as plain text from Kito\'s number, with Kito\'s token', inside.got.length === 1 && inside.got[0].kind === 'text' && inside.got[0].phoneNumberId === KITO.phoneNumberId && inside.got[0].authorization === `Bearer ${KITO.accessToken}`, JSON.stringify(inside));

  log('  Kito\'s 24 hours with Ada end (she wrote to Groundwork\'s number a minute ago, which does not count for Kito\'s number).');
  await prisma.$executeRawUnsafe(`update whatsapp_inbound_messages set handled_at = now() - interval '30 hours' where organization_id = '${kito.id}' and message_id like 'theirs:${ADA}:%'`);
  await prisma.$executeRawUnsafe(`update people set whatsapp_last_inbound_at = now() - interval '30 hours' where organization_id = '${kito.id}'`);
  const closed = await sendTo('Ada', kito.id, ADA);
  reads('Ada', closed.got);
  check('Outside Kito\'s 24 hours it is NOT sent as text, and NOT sent on Groundwork\'s approved list: Kito has approved no template yet, so it is recorded as not sent', closed.got.length === 0 && closed.r.sent === false, JSON.stringify(closed.r));
  const approved = await api('/integrations/whatsapp/templates', { method: 'POST', token: kofiToken, body: { approved: ['checkin_open'] } });
  check('Kofi records that Meta approved checkin_open for Kito\'s own app', JSON.stringify(approved?.approved) === '["checkin_open"]', JSON.stringify(approved));
  const asTemplate = await sendTo('Ada', kito.id, ADA);
  reads('Ada', asTemplate.got);
  check('Now it goes as that template, from Kito\'s number, with Kito\'s token', asTemplate.got.length === 1 && asTemplate.got[0].kind === 'template' && asTemplate.got[0].template === 'checkin_open' && asTemplate.got[0].phoneNumberId === KITO.phoneNumberId && asTemplate.got[0].authorization === `Bearer ${KITO.accessToken}`, JSON.stringify(asTemplate));

  log('  Bola (Plain, on Groundwork\'s number) was written to a minute ago, and then her 24 hours end.');
  const bolaIn = await sendTo('Bola', plain.id, BOLA);
  reads('Bola', bolaIn.got);
  check('Inside her 24 hours it goes as text from Groundwork\'s number, with Groundwork\'s token', bolaIn.got.length === 1 && bolaIn.got[0].kind === 'text' && bolaIn.got[0].phoneNumberId === PLATFORM.phoneNumberId && bolaIn.got[0].authorization === `Bearer ${PLATFORM.accessToken}`, JSON.stringify(bolaIn));
  await prisma.$executeRawUnsafe(`update whatsapp_inbound_messages set handled_at = now() - interval '30 hours' where organization_id = '${plain.id}'`);
  await prisma.$executeRawUnsafe(`update people set whatsapp_last_inbound_at = now() - interval '30 hours' where organization_id = '${plain.id}'`);
  await prisma.$executeRawUnsafe(`delete from whatsapp_sends where phone = '${BOLA}' and kind = 'checkin-open'`);
  const bolaOut = await sendTo('Bola', plain.id, BOLA);
  reads('Bola', bolaOut.got);
  check('Outside them it goes as Groundwork\'s approved template (the platform list), from Groundwork\'s number, never from Kito\'s', bolaOut.got.length === 1 && bolaOut.got[0].kind === 'template' && bolaOut.got[0].phoneNumberId === PLATFORM.phoneNumberId && bolaOut.got[0].authorization === `Bearer ${PLATFORM.accessToken}`, JSON.stringify(bolaOut));
  await app.close();

  // ------------------------------------------------------------------------------------------------ 5. the relay, for a customer whose number stays pointed at their own system
  log('\n==================== 5. THE RELAY: THEIR NUMBER STAYS THEIRS, THEIR SYSTEM HANDS US THE MESSAGES THAT ARE OURS ====================');
  await prisma.apiAccessRequest.create({ data: { organizationId: kito.id, requestedByUserId: kofi.id, whatFor: 'The relay journey', status: 'APPROVED' as any, acceptedTermsAt: new Date(), termsVersion: '2026-09-10', decidedAt: new Date() } });
  const cred = await api('/integrations/credentials', { method: 'POST', token: kofiToken, body: { name: 'Kito customer system', scopes: ['checkins:write'] } });
  const tokenRes = await fetch(`${API.replace(/\/api\/v1$/, '')}/api/org/v1/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify( { grant_type: 'client_credentials', client_id: cred?.clientId, client_secret: cred?.clientSecret }) });
  const tokJson: any = await tokenRes.json().catch(() => ({}));
  const tok = tokJson?.data ?? tokJson;
  const machine = tok?.access_token ?? tok?.accessToken;
  check('Kito\'s system is issued a credential and signs in with it', !!machine, JSON.stringify({ cred: Object.keys(cred ?? {}), tok: Object.keys(tok ?? {}), refused: cred?.refused ?? tok?.refused }));
  const sentBeforeRelay = outbox.length;
  const stranger = `+2547${String(stamp + 7).slice(-8)}`;
  const strangers = await api('/integrations/whatsapp/relay', { method: 'POST', token: machine, body: { from: stranger, text: 'hello, do you have this in blue?', messageId: 'wamid.stranger' } });
  log(`  A customer of Kito\'s writes to Kito\'s number; Kito\'s system passes it here. Groundwork answers: ${JSON.stringify(strangers)}`);
  check('A sender who is not one of Kito\'s people comes back "not ours", with no reply', strangers?.mine === false && !strangers?.reply, JSON.stringify(strangers));
  const kept: any[] = await prisma.$queryRawUnsafe(`select count(*)::int as n from whatsapp_inbound_messages where organization_id = '${kito.id}' and message_id like '%${stranger}%'`);
  const keptSends: any[] = await prisma.$queryRawUnsafe(`select count(*)::int as n from whatsapp_sends where phone = '${stranger}'`);
  check('Nothing about the stranger is stored: not the number, not the message, not the fact that they asked', kept[0].n === 0 && keptSends[0].n === 0);
  const adas = await api('/integrations/whatsapp/relay', { method: 'POST', token: machine, body: { from: ADA, text: 'hello', messageId: 'wamid.ada.relay' } });
  log(`  Ada writes to the same number; the relay answers: ${JSON.stringify(adas)}`);
  check('A person on Kito\'s roster comes back "ours" with the reply to send, and Groundwork sends nothing itself', adas?.mine === true && typeof adas?.reply === 'string' && adas.reply.length > 0 && outbox.length === sentBeforeRelay, JSON.stringify(adas));
  const noToken = await api('/integrations/whatsapp/relay', { method: 'POST', body: { from: ADA, text: 'hello' } });
  check('Without the credential the relay is refused (401)', noToken?.refused === 401, JSON.stringify(noToken));

  await prisma.$disconnect();
  recorder.close();
  const failed = checks.filter((c) => !c.ok);
  log(`\n${checks.length - failed.length} of ${checks.length} checks passed.`);
  return { checks, transcript };
}

if (require.main === module) run().then((r) => process.exit(r.checks.every((c) => c.ok) ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });
