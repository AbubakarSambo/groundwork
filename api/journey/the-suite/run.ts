/**
 * Runs each scenario end to end through the real API and keeps everything the lead and each
 * participant would actually read, so the board, the conversations and both reports can be rated
 * against what is known to be true.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { AnthropicService, ChatTurn } from '../../src/modules/conversation/anthropic.service';
import { THE_SCENARIOS, thePersonaFor, AScenario, APerson } from './scenarios';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

const API = 'http://localhost:3000/api/v1';
const PW = 'SuiteRun123!';
const OUT = process.env.OUT ?? 'journey/the-suite/out';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const MAX_TURNS = Number(process.env.MAX_TURNS ?? 9);

const tokens: Record<string, string> = {};
const log = (s: string) => { console.log(s); fs.appendFileSync(`${OUT}/run.log`, s + '\n'); };

async function http(path: string, o: { method?: string; body?: any; token?: string; retries?: number } = {}): Promise<any> {
  const retries = o.retries ?? 2;
  try {
    const res = await fetch(`${API}${path}`, {
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
    if (retries > 0 && /fetch failed|ECONN|socket|timeout|503|429/i.test(e.message ?? '')) {
      await new Promise((r) => setTimeout(r, 5000));
      return http(path, { ...o, retries: retries - 1 });
    }
    throw e;
  }
}

async function runScenario(prisma: any, model: AnthropicService, s: AScenario) {
  const stamp = Date.now();
  const lead = s.people.find((p) => p.isLead)!;
  const others = s.people.filter((p) => !p.isLead);
  const email = (p: APerson) => `${p.key}.${stamp}@${s.key}.test`;

  const org = await prisma.organization.create({ data: { name: `${s.label} ${stamp}`, slug: `${s.key}-${stamp}`, email: email(lead) } });
  await prisma.user.create({
    data: {
      email: email(lead), organizationId: org.id,
      firstName: lead.name.split(' ')[0], lastName: lead.name.split(' ').slice(1).join(' ') || 'Lead',
      passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: 'ADMIN',
    },
  });
  /*
   * A COHORT DOES NOT FIT ON THE FREE PLAN, AND THAT IS A REAL FINDING, NOT A HARNESS PROBLEM.
   *
   * The first run of the asset-loan scenario died here: "The free plan covers 5 people, including
   * you, so you can invite 4 others." Eight borrowers is the scenario. COHORT_CHECK is one of the
   * twenty scenarios in the taxonomy and it cannot be run at all on a free organisation, which is
   * also what a real customer hit ("the free trial refusing invites past 5 people"). Recorded, and
   * the org is marked covered here so the rest of the scenario can actually be tested.
   */
  if (s.people.length > 5 && process.env.COVER_THE_ORG === '1') {
    await prisma.organization.update({
      where: { id: org.id },
      data: { freeUntil: new Date(Date.now() + 90 * 86400000), freePlan: 'GROWTH' as any },
    }).catch(async () => {
      await prisma.organization.update({ where: { id: org.id }, data: { freeUntil: new Date(Date.now() + 90 * 86400000) } }).catch(() => undefined);
    });
    log(`  NOTE: ${s.people.length} people, so this org was marked covered - the free plan caps a cohort at 5 including the lead.`);
  }
  tokens[email(lead)] = (await http('/auth/login', { body: { email: email(lead), password: PW } })).accessToken;

  const ground = await http('/grounds', {
    token: tokens[email(lead)],
    body: {
      label: s.label, scenario: s.scenario, moment: s.moment,
      timelineDays: s.timelineDays, cadence: s.cadence, workingDays: [1, 2, 3, 4, 5], brief: s.brief,
    },
  });
  const gid = ground.id;
  log(`\n${'#'.repeat(78)}\n${s.key.toUpperCase()}: ${s.label}\n  ground=${gid} scenario=${ground.scenario} cadence=${ground.cadence} sessions=${s.sessions} people=${s.people.length}`);

  for (const p of others) {
    await http(`/grounds/${gid}/participants`, {
      token: tokens[email(lead)],
      body: { email: email(p), roleAsDescribed: p.remit.slice(0, 120), note: p.remit.slice(0, 480) },
    });
  }

  const rows: Record<string, any> = {};
  for (const p of s.people) {
    const row = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: email(p) } });
    if (!row) { log(`  NO ROW for ${p.name}`); continue; }
    rows[p.key] = row;
    if (!p.isLead && row.inviteToken) {
      await http('/participants/accept', { body: { token: row.inviteToken, firstName: p.name.split(' ')[0], lastName: p.name.split(' ').slice(1).join(' ') || 'X' } }).catch(() => undefined);
      const u = await prisma.user.findUnique({ where: { email: email(p) } });
      if (u) {
        await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true } });
        tokens[email(p)] = (await http('/auth/login', { body: { email: email(p), password: PW } })).accessToken;
      }
    }
  }

  const record: any = { scenario: s, groundId: gid, orgId: org.id, emails: Object.fromEntries(s.people.map((p) => [p.key, email(p)])), sessions: [] };

  for (let n = 1; n <= s.sessions; n++) {
    log(`\n  --- session ${n} of ${s.sessions}`);
    const people: any[] = [];
    for (const p of s.people) {
      if (!rows[p.key] || !tokens[email(p)]) { people.push({ key: p.key, error: 'no sign-in' }); continue; }
      people.push(await runCheckIn(prisma, model, gid, s, p, rows[p.key], email(p), n));
    }
    let released = false;
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const probe = await http(`/grounds/${gid}/report`, { token: tokens[email(lead)] });
        if (probe?.releasedAt || probe?.sharedPicture) { released = true; break; }
      } catch { /* not yet */ }
    }
    const sess: any = { session: n, people, released };
    /* What the LEAD reads. */
    try { sess.leadReport = await http(`/grounds/${gid}/report`, { token: tokens[email(lead)] }); } catch (e: any) { sess.leadReportError = e.message.slice(0, 200); }
    try { sess.board = await http(`/grounds/${gid}/board`, { token: tokens[email(lead)] }); } catch (e: any) { sess.boardError = e.message.slice(0, 200); }
    /* And what ONE PARTICIPANT reads of the same thing, which is the other half of the test. */
    const firstOther = others[0];
    if (firstOther && tokens[email(firstOther)]) {
      try { sess.participantReport = await http(`/grounds/${gid}/report`, { token: tokens[email(firstOther)] }); } catch (e: any) { sess.participantReportError = e.message.slice(0, 200); }
      try { sess.participantBoard = await http(`/grounds/${gid}/board`, { token: tokens[email(firstOther)] }); } catch (e: any) { sess.participantBoardError = e.message.slice(0, 200); }
      sess.participantSeen = firstOther.key;
    }
    sess.patterns = await prisma.patternDetection.findMany({
      where: { groundId: gid },
      select: { code: true, status: true, seenInSessions: true, observationText: true, participant: { select: { email: true } } },
    }).catch(() => []);
    sess.commitments = await prisma.groundCommitment.findMany({
      where: { groundId: gid },
      select: { text: true, whenSaid: true, status: true, statedInSession: true, saidAgainIn: true, participant: { select: { email: true } } },
    }).catch(() => []);
    record.sessions.push(sess);
    fs.writeFileSync(`${OUT}/${s.key}.json`, JSON.stringify(record, null, 1));
    log(`    report ${released ? 'released' : 'NOT RELEASED'} · commitments ${Array.isArray(sess.commitments) ? sess.commitments.length : '?'} · patterns ${(sess.patterns ?? []).map((x: any) => `${x.code}/${x.status}`).join(' ') || 'none'}`);
  }
  return record;
}

async function runCheckIn(prisma: any, model: AnthropicService, gid: string, s: AScenario, p: APerson, row: any, email: string, n: number) {
  let ci = await prisma.checkIn.findFirst({ where: { participantId: row.id, sessionNumber: n } });
  if (!ci) {
    ci = await prisma.checkIn.create({ data: { groundId: gid, participantId: row.id, sessionNumber: n, status: 'NOT_STARTED', availableFrom: new Date(Date.now() - 86400000) } });
  } else if (ci.availableFrom && ci.availableFrom > new Date()) {
    await prisma.checkIn.update({ where: { id: ci.id }, data: { availableFrom: new Date(Date.now() - 86400000) } });
  }
  if (ci.status === 'COMPLETED') return { key: p.key, skipped: true };

  const token = tokens[email];
  const turns: any[] = [];
  let asked = '';
  try {
    const opened = await http(`/check-ins/${ci.id}/open`, { method: 'POST', token, body: {}, retries: 3 });
    asked = opened?.turns?.length ? opened.turns[opened.turns.length - 1]?.content : (opened?.reply ?? '');
  } catch (e: any) { return { key: p.key, error: `open: ${e.message.slice(0, 180)}` }; }
  turns.push({ from: 'GROUNDWORK', text: asked });

  const system = thePersonaFor(p, s, n);
  const chat: ChatTurn[] = [];
  let closed = false;
  for (let t = 0; t < MAX_TURNS && !closed; t++) {
    chat.push({ role: 'user', content: asked });
    let said = '';
    try { said = (await model.respond(system, chat)).trim(); } catch { said = 'I would have to check that.'; }
    chat.push({ role: 'assistant', content: said });
    turns.push({ from: p.name.toUpperCase(), text: said });
    try {
      const r = await http(`/check-ins/${ci.id}/messages`, { method: 'POST', token, body: { message: said }, retries: 3 });
      asked = r?.reply ?? '';
      turns.push({ from: 'GROUNDWORK', text: asked });
      if (r?.sessionComplete || r?.complete) closed = true;
    } catch (e: any) { turns.push({ from: 'ERROR', text: e.message.slice(0, 220) }); break; }
  }
  try { await http(`/check-ins/${ci.id}/complete`, { method: 'POST', token }); } catch { /* fine */ }
  log(`    ${p.name}: ${turns.filter((x) => x.from === 'GROUNDWORK').length} questions, closed naturally=${closed}`);
  return { key: p.key, name: p.name, isLead: !!p.isLead, checkInId: ci.id, naturalClose: closed, turns };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const model = app.get(AnthropicService);
  for (const s of THE_SCENARIOS) {
    if (ONLY && !ONLY.includes(s.key)) continue;
    try { await runScenario(prisma, model, s); }
    catch (e: any) { log(`\n${s.key} FAILED: ${e?.message?.slice(0, 400)}`); }
  }
  log('\nALL DONE');
  await app.close();
  process.exit(0);
}
main().catch((e) => { console.error('SUITE FAILED:', e?.message ?? e); process.exit(1); });
