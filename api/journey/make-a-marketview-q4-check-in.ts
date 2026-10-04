/**
 * MAKES A MARKETVIEW Q4 TEST CHECK-IN ON THE LOCAL TEST DATABASE, with real conversations.
 *
 * The screens workspace needs a real local check-in of the subscriptions kind of work, so it can match
 * its board against docs/prototype/screens/G1-example-check-ins/mvq4.txt. It is made the way
 * journey/all-24/run.ts makes a scenario: a lead and two participants with names, their check-ins
 * answered by personas through the streamed route, and the report waited for until it is released.
 *
 * The system figures ("What the systems show") go in through the same road a connected system uses:
 * a credential issued to the organisation, a token from /api/org/v1/oauth/token, the objective
 * pushed with POST /subjects, the check-in linked with POST /checkins, and the numbers sent with
 * PUT /metrics, once as Paystack and once as MarketView. Nothing is written straight into
 * product_metrics.
 *
 * LOCAL ONLY. It refuses any database except gw_pw9_1786222102 on this machine. Run the API first,
 * on port 3009, with the same DATABASE_URL:
 *
 *   cd api && npm run build
 *   DATABASE_URL=postgresql://localhost/gw_pw9_1786222102 PORT=3009 NODE_ENV=development \
 *     EMAIL_SENDS_FOR_REAL=false GEMINI_LOCATION=global node --enable-source-maps dist/main
 *   DATABASE_URL=postgresql://localhost/gw_pw9_1786222102 EMAIL_SENDS_FOR_REAL=false GEMINI_LOCATION=global \
 *     npx ts-node -T journey/make-a-marketview-q4-check-in.ts
 *
 * It prints the check-in's id and the sign-in emails (never passwords). Nobody signs in with a
 * password: the people sign in by emailed link, as the screens handover says.
 */
import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { AnthropicService, ChatTurn } from '../src/modules/conversation/anthropic.service';
import { ApiAccessService } from '../src/modules/public-api/api-access.service';
import { thePersonaFor, AScenario, APerson } from './the-suite/scenarios';
import { hostOf, isOnThisMachine } from './stamp-said-word-for-word';
import { writeTheKinds } from './give-each-check-in-its-kind-of-work';

export const THE_ONLY_DATABASE = 'gw_pw9_1786222102';

/** Whether this address is the one local test database, and nothing else. */
export function itIsTheLocalTestDatabase(url: string | undefined): boolean {
  if (!url || !isOnThisMachine(url) || !hostOf(url)) return false;
  try {
    return new URL(url).pathname.replace(/^\//, '') === THE_ONLY_DATABASE;
  } catch {
    return false;
  }
}

const API = process.env.API ?? 'http://127.0.0.1:3009/api/v1';
const ORG_API = API.replace(/\/api\/v1$/, '/api/org/v1');
const PW = 'SuiteRun123!';
const GOAL = 'Will MarketView reach 40 paying subscribers and 200 weekly users this quarter?';

const THE_SCENARIO: AScenario = {
  key: 'mvq4',
  label: 'MarketView, Q4',
  scenario: 'OKR_ALIGNMENT',
  moment: 'STARTING',
  cadence: 'DAILY',
  timelineDays: 90,
  sessions: 1,
  brief:
    `${GOAL} This is MarketView's subscriptions: sales and product work to get 40 paying subscribers on Paystack and 200 weekly users this quarter. `
    + 'Numbers come from MarketView and Paystack. I want to know which subscriptions are really paid and which are only said, '
    + 'and whether what sales and product tell me matches what the systems show.',
  theDecision:
    'Sales said three new subscriptions this week, and Paystack shows two paid and one invoice open (Sahel Agro, due Friday). '
    + 'Product said usage is up since the new dashboard, and MarketView shows weekly users went from 148 to 162. '
    + 'A right board shows 31 of 40 paid, 162 of 200 weekly users, names the unpaid sale, and does not choose for the head of sales.',
  people: [
    {
      key: 'wairimu', name: 'Wairimu Kamau', isLead: true,
      remit: 'Head of sales. Owns the quarter goal of 40 paying subscribers and 200 weekly users for MarketView.',
      truth:
        'It is week 8 of 13 in the quarter. Paystack shows 31 paying subscribers against the goal of 40, and MarketView shows 162 weekly users against 200. '
        + 'She is not sure the pace will reach 40: nine subscriptions are still to come in five weeks. Two renewals due this week are not paid yet. '
        + 'She relies on Otieno for the sales count and on Naliaka for usage. She has not checked Otieno\'s count of three new subscriptions against Paystack herself. '
        + 'She will decide on Friday whether to keep the target or change it.',
      manner: 'Direct and practical. Short sentences. Gives a number when asked for one.',
    },
    {
      key: 'otieno', name: 'Otieno Mwangi',
      remit: 'Sales lead for subscriptions. Brings in new paying subscribers and chases renewals.',
      truth:
        'He closed three new subscriptions this week: Amana Foods, Kano Millers and Sahel Agro. Amana Foods and Kano Millers have paid. '
        + 'Sahel Agro has an invoice out and has promised to pay on Friday, but it has not paid yet, and he counts it as sold anyway. '
        + 'Two renewals due this week have not paid; he has reminded both. He thinks nine more subscriptions in five weeks is hard but possible if Sahel Agro and the renewals pay.',
      manner: 'Upbeat, quick, rounds up. Says "sold" when he means "signed". Honest when asked directly whether something has paid.',
    },
    {
      key: 'naliaka', name: 'Naliaka Wekesa',
      remit: 'Product manager for MarketView. Owns weekly users and the new dashboard.',
      truth:
        'Weekly active users went from 148 last week to 162 this week, since the new dashboard went out. She believes the dashboard caused it, but she has not tested that and ' +
        'a campaign email also went out the same week. Reports downloaded are at 418 this week, up 12 percent. She cannot see which reports were downloaded, only the count. ' +
        'She does not see payments and does not know which sales have paid.',
      manner: 'Careful and precise. Says what she knows and what she is guessing.',
    },
  ],
};

const tokens: Record<string, string> = {};
const say = (s: string) => console.log(s);

async function http(base: string, path: string, o: { method?: string; body?: any; token?: string; retries?: number } = {}): Promise<any> {
  const retries = o.retries ?? 3;
  try {
    const res = await fetch(`${base}${path}`, {
      method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
      ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    if (!res.ok) { const e: any = new Error(`${res.status} ${path} :: ${JSON.stringify(json)?.slice(0, 350)}`); e.status = res.status; throw e; }
    return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
  } catch (e: any) {
    if (retries > 0 && /429|Too many tries/i.test(e.message ?? '')) { await new Promise((r) => setTimeout(r, 65000)); return http(base, path, { ...o, retries: retries - 1 }); }
    if (retries > 0 && /fetch failed|ECONN|socket|timeout|503/i.test(e.message ?? '')) { await new Promise((r) => setTimeout(r, 5000)); return http(base, path, { ...o, retries: retries - 1 }); }
    throw e;
  }
}
const api = (path: string, o: Parameters<typeof http>[2] = {}) => http(API, path, o);

/** One message through the streamed route, read as ChatPage reads it. */
async function send(checkInId: string, message: string, token: string): Promise<any> {
  const res = await fetch(`${API}/check-ins/${checkInId}/messages/stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`${res.status} /messages/stream :: ${(await res.text()).slice(0, 300)}`);
  let done: any = null;
  for (const line of (await res.text()).split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (!data || data === '[DONE]') continue;
    let evt: any; try { evt = JSON.parse(data); } catch { continue; }
    if (evt?.type === 'error') throw new Error(`stream error: ${evt.code ?? ''} ${evt.message ?? ''}`);
    if (evt?.type === 'done') done = evt;
  }
  if (!done) throw new Error('stream ended with no done event');
  return done;
}

async function checkIn(prisma: any, model: AnthropicService, gid: string, p: APerson, row: any, email: string) {
  let ci = await prisma.checkIn.findFirst({ where: { participantId: row.id, sessionNumber: 1 } });
  if (!ci) ci = await prisma.checkIn.create({ data: { groundId: gid, participantId: row.id, sessionNumber: 1, status: 'NOT_STARTED', availableFrom: new Date(Date.now() - 86400000) } });
  const token = tokens[email];
  const opened = await api(`/check-ins/${ci.id}/open`, { method: 'POST', token, body: {} });
  let asked = opened?.turns?.length ? opened.turns[opened.turns.length - 1]?.content : (opened?.reply ?? '');
  const system = thePersonaFor(p, THE_SCENARIO, 1);
  const chat: ChatTurn[] = [];
  let closed = false;
  for (let t = 0; t < 9 && !closed; t++) {
    chat.push({ role: 'user', content: asked });
    let said = '';
    try { said = (await model.respond(system, chat)).trim(); } catch { said = 'I would have to check that.'; }
    chat.push({ role: 'assistant', content: said });
    const r = await send(ci.id, said, token);
    asked = r?.reply ?? '';
    if (r?.sessionComplete || r?.complete) closed = true;
  }
  try { await api(`/check-ins/${ci.id}/complete`, { method: 'POST', token }); } catch { /* fine */ }
  say(`  ${p.name}: finished (closed naturally: ${closed}).`);
}

async function main() {
  if (!itIsTheLocalTestDatabase(process.env.DATABASE_URL)) {
    console.error(`This script runs only on the local test database ${THE_ONLY_DATABASE}, on this machine. DATABASE_URL is not that, so nothing was read or written.`);
    process.exit(1);
  }
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const model = app.get(AnthropicService);
  const access = app.get(ApiAccessService);
  try {
    const s = THE_SCENARIO;
    const stamp = Date.now();
    const lead = s.people.find((p) => p.isLead)!;
    const others = s.people.filter((p) => !p.isLead);
    /* The same sign-in emails each time they are free; a remake on a database that has them gets a stamped set. */
    const taken = await prisma.user.findUnique({ where: { email: `${lead.key}.mvq4@example.test` } });
    const suffix = taken ? `.${stamp}` : '';
    const email = (p: APerson) => `${p.key}.mvq4${suffix}@example.test`;

    const org = await prisma.organization.create({ data: { name: `Baridi Appliances MarketView Q4 ${stamp}`, slug: `mvq4-${stamp}`, email: email(lead) } });
    await prisma.user.create({
      data: {
        email: email(lead), organizationId: org.id, firstName: 'Wairimu', lastName: 'Kamau',
        passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: 'ADMIN',
      },
    });
    tokens[email(lead)] = (await api('/auth/login', { body: { email: email(lead), password: PW } })).accessToken;
    const leadToken = tokens[email(lead)];

    const ground = await api('/grounds', {
      token: leadToken,
      body: { label: s.label, scenario: s.scenario, moment: s.moment, timelineDays: s.timelineDays, cadence: s.cadence, workingDays: [1, 2, 3, 4, 5], brief: s.brief },
    });
    const gid = ground.id;
    say(`Check-in ${gid} made for ${s.label}.`);

    /* The system figures, through a connected system's own road. */
    await access.ask(org.id, (await prisma.user.findUnique({ where: { email: email(lead) } }))!.id, 'Send MarketView weekly users and Paystack paid subscriptions to the MarketView Q4 check-in, so the board can set them beside what people say.', true);
    const request = await prisma.apiAccessRequest.findUnique({ where: { organizationId: org.id } });
    await access.decide(request!.id, 'APPROVED' as any, request!.requestedByUserId, 'Local test organisation.');
    const cred = await api('/integrations/credentials', {
      token: leadToken,
      body: { name: 'MarketView and Paystack feed', scopes: ['subjects:write', 'checkins:write', 'graph:write'], sourceSystem: 'marketview-feed' },
    });
    const machine = (await http(ORG_API, '/oauth/token', { body: { grant_type: 'client_credentials', client_id: cred.clientId, client_secret: cred.clientSecret } })).access_token;
    const subjectId = 'mvq4-subscriptions-and-weekly-users';
    await http(ORG_API, '/subjects', {
      token: machine,
      body: { externalId: subjectId, sourceSystem: 'marketview-feed', type: 'OBJECTIVE', title: GOAL, measure: 'Paying subscribers and weekly users', target: '40 paying subscribers and 200 weekly users this quarter' },
    });
    await http(ORG_API, '/checkins', { token: machine, body: { groundId: gid, subjectExternalId: subjectId } });
    const today = new Date(); today.setUTCHours(6, 0, 0, 0);
    const lastWeek = new Date(today.getTime() - 7 * 86400000);
    await http(ORG_API, '/metrics', {
      method: 'PUT', token: machine,
      body: {
        sourceSystem: 'Paystack',
        metrics: [
          { key: 'paid_subscriptions', says: 'Paid subscriptions this quarter, against a goal of 40', value: 31, unit: 'subscriptions', asOf: today.toISOString(), subjectExternalId: subjectId },
          { key: 'renewals_paid', says: 'Renewals paid, of 9 due', value: 7, unit: 'renewals', asOf: today.toISOString(), subjectExternalId: subjectId },
        ],
      },
    });
    await http(ORG_API, '/metrics', {
      method: 'PUT', token: machine,
      body: {
        sourceSystem: 'MarketView',
        metrics: [
          { key: 'weekly_active_users', says: 'Weekly active users, against a goal of 200', value: 148, unit: 'users', asOf: lastWeek.toISOString(), subjectExternalId: subjectId },
          { key: 'weekly_active_users', says: 'Weekly active users, against a goal of 200', value: 162, unit: 'users', asOf: today.toISOString(), subjectExternalId: subjectId },
          { key: 'reports_downloaded', says: 'Reports downloaded this week, up 12 percent', value: 418, unit: 'downloads', asOf: today.toISOString(), subjectExternalId: subjectId },
        ],
      },
    });
    say('  System figures sent through the connected-system road (Paystack and MarketView).');

    /* The people. */
    for (const p of others) {
      await api(`/grounds/${gid}/participants`, { token: leadToken, body: { email: email(p), roleAsDescribed: p.remit.slice(0, 120), note: p.remit.slice(0, 480) } });
    }
    const rows: Record<string, any> = {};
    for (const p of s.people) {
      const row = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: email(p) } });
      if (!row) throw new Error(`No participant row for ${p.name}.`);
      rows[p.key] = row;
      if (!p.isLead && row.inviteToken) {
        await api('/participants/accept', { body: { token: row.inviteToken, firstName: p.name.split(' ')[0], lastName: p.name.split(' ').slice(1).join(' ') || 'X' } }).catch(() => undefined);
        const u = await prisma.user.findUnique({ where: { email: email(p) } });
        if (u) {
          await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true } });
          tokens[email(p)] = (await api('/auth/login', { body: { email: email(p), password: PW } })).accessToken;
        }
      }
    }

    /* The kind of work. The lead's own control comes first; MarketView Q4 is hidden at release, so on a database where it is
       not offered the control refuses, and the kind is given the way give-each-check-in-its-kind-of-work.ts gives it. The
       read of the setup words runs in the background and can finish late and clear it, so this is done after the setup has
       settled and checked again before the boards are served. */
    const giveTheKind = async () => {
      const now = await prisma.ground.findUnique({ where: { id: gid }, select: { kindOfWork: true } });
      if (now?.kindOfWork === 'MarketView Q4') return;
      try {
        await api(`/grounds/${gid}/kind-of-work`, { method: 'PATCH', token: leadToken, body: { kind: 'MarketView Q4' } });
        say('  Kind of work set by the lead: MarketView Q4.');
      } catch (e: any) {
        await writeTheKinds(prisma, { checkIns: 1, alreadyHad: 0, left: [], toGive: [{ groundId: gid, label: s.label, kind: 'MarketView Q4' }] });
        say(`  The lead's control did not offer MarketView Q4 (${e.message.slice(0, 120)}), so the kind was given as a kind read from setup.`);
      }
    };
    await new Promise((r) => setTimeout(r, 45000));
    await giveTheKind();

    for (const p of s.people) {
      if (!tokens[email(p)]) { say(`  ${p.name}: no sign-in, skipped.`); continue; }
      await checkIn(prisma, model, gid, p, rows[p.key], email(p));
    }

    /* Wait for a report with a finding for each person, and for it to stop being written. */
    let released = false;
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const probe = await api(`/grounds/${gid}/report`, { token: leadToken });
        if (!probe?.releasedAt && !probe?.sharedPicture) continue;
        released = true;
        if ((Array.isArray(probe?.findings) ? probe.findings.length : 0) >= s.people.length && !probe?.beingWritten) break;
      } catch { /* not yet */ }
    }
    say(`  Report ${released ? 'released' : 'NOT RELEASED'}.`);

    await giveTheKind();
    /* The boards, as the lead and as the first participant read them. */
    const out = process.env.OUT ?? 'journey/out/mvq4';
    fs.mkdirSync(out, { recursive: true });
    const leadBoard = await api(`/grounds/${gid}/board`, { token: leadToken });
    const participantBoard = await api(`/grounds/${gid}/board`, { token: tokens[email(others[0])] });
    fs.writeFileSync(`${out}/lead-board.json`, JSON.stringify(leadBoard, null, 1));
    fs.writeFileSync(`${out}/participant-board.json`, JSON.stringify(participantBoard, null, 1));
    fs.writeFileSync(`${out}/made.json`, JSON.stringify({ checkInId: gid, title: s.label, lead: email(lead), participants: others.map(email) }, null, 1));
    say(`\nCheck-in id: ${gid}\nTitle: ${s.label}\nLead: ${lead.name} <${email(lead)}>`);
    for (const p of others) say(`Takes part: ${p.name} <${email(p)}>`);
    say(`Boards kept in ${out}.`);
  } finally {
    await app.close();
  }
  process.exit(0);
}

if (require.main === module) {
  main().catch((e) => { console.error('FAILED:', e?.message ?? e); process.exit(1); });
}
