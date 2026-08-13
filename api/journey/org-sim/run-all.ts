/**
 * Eighteen grounds, one org, strictly in order.
 *
 * Sequential on purpose. The org accumulates state that only makes sense in
 * order: Sahar is new exactly once, most people are returning by ground five,
 * and the free allowance runs out at eleven. Run them in parallel and the
 * free/paid gate and the returning-versus-new recognition both stop meaning
 * anything. Sessions WITHIN a ground do run together, because those really are
 * independent people answering separately.
 *
 * Everything after the org and Sahar goes through the real HTTP API as the real
 * user, against the real model, so what is being tested is the journey a
 * customer gets rather than a convenient shortcut through the services.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { GROUNDS, GroundSpec } from './grounds';
import { PEOPLE, person } from './people';
import { turnsFor } from './turns';
import * as fs from 'fs';

/**
 * The gate runs its own build on its own port, so this cannot be hardcoded: pointing at whatever
 * happens to be on 3000 is how a run verifies a stale build and reports the old behaviour as new.
 */
const API = process.env.ORG_SIM_API ?? 'http://localhost:3000/api/v1';
const PW = 'OrgSim123!';
const OUT = process.env.OUT ?? 'journey/org-sim/out';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;

const tokens: Record<string, string> = {};
const seenBefore = new Set<string>();
type Finding = { ground: number; area: string; detail: string };
const findings: Finding[] = [];
const note = (ground: number, area: string, detail: string) => {
  findings.push({ ground, area, detail });
  console.log(`    [G${ground}] ${area}: ${detail.slice(0, 150)}`);
};

async function http(path: string, opts: { method?: string; body?: any; token?: string; retries?: number } = {}): Promise<any> {
  const retries = opts.retries ?? 2;
  try {
    const res = await fetch(`${API}${path}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    if (!res.ok) {
      const err: any = new Error(`${res.status} ${path} :: ${JSON.stringify(json)?.slice(0, 300)}`);
      err.status = res.status; err.body = json;
      throw err;
    }
    return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
  } catch (e: any) {
    if (retries > 0 && /fetch failed|ECONN|socket|timeout|503|429/i.test(e.message ?? '')) {
      await new Promise((r) => setTimeout(r, 4000));
      return http(path, { ...opts, retries: retries - 1 });
    }
    throw e;
  }
}

async function login(email: string) {
  const r = await http('/auth/login', { body: { email, password: PW } });
  const t = r.accessToken ?? r.token;
  tokens[email] = t;
  return t;
}

/** One ground, start to finish. Returns everything worth reporting on it. */
async function runGround(prisma: any, spec: GroundSpec) {
  console.log(`\n${'='.repeat(72)}\nGROUND ${spec.n}: ${spec.label}`);
  console.log(`  scenario=${spec.scenario} moment=${spec.moment} ${spec.sessions} sessions, ${spec.cadence.toLowerCase()}, ${spec.timelineDays}d`);
  const lead = person(spec.lead);
  const parts = spec.participants.map(person);
  const record: any = { spec, people: {}, sessions: [], reports: [], boards: [], blockers: [] };

  for (const p of [lead, ...parts]) {
    record.people[p.key] = { name: p.name, level: p.level, style: p.style, jargon: p.jargon, returning: seenBefore.has(p.key), note: p.note };
  }

  // ---- the paywall check, before anything is created
  const sahar = tokens['sahar@org.test'];
  let billing: any = null;
  try {
    billing = await http('/billing/can-create-ground', { token: sahar });
  } catch (e: any) {
    try { billing = await http('/billing/check-can-create-ground', { token: sahar, body: {} }); } catch { billing = { error: e.message.slice(0, 120) }; }
  }
  record.billing = billing;
  const allowed = billing?.allowed !== false;
  if (spec.expectPaid && allowed) {
    note(spec.n, 'PAYWALL', `Ground ${spec.n} should be paid but billing says it is allowed free (${JSON.stringify(billing).slice(0, 160)})`);
  }
  if (!spec.expectPaid && !allowed) {
    note(spec.n, 'PAYWALL', `Ground ${spec.n} should be free but billing refused: ${JSON.stringify(billing).slice(0, 160)}`);
  }

  // ---- create, with Sahar handing it to a lead
  let ground: any;
  try {
    ground = await http('/grounds/for-lead', {
      token: sahar,
      body: {
        leadEmail: lead.email, leadName: lead.name,
        leadRemit: `${lead.name} runs this ground.`,
        label: spec.label, scenario: spec.scenario, moment: spec.moment,
        timelineDays: spec.timelineDays, cadence: spec.cadence, brief: spec.brief,
        participants: parts.map((p) => ({ email: p.email, roleAsDescribed: `${p.name} - ${spec.subject}` })),
      },
    });
  } catch (e: any) {
    note(spec.n, 'BLOCKER', `could not create the ground: ${e.message.slice(0, 200)}`);
    record.blockers.push(e.message.slice(0, 300));
    return record;
  }
  const gid = ground.id;
  record.groundId = gid;
  record.isFree = ground.isFreeGround;
  record.freeReason = ground.freeReason;
  if (spec.expectPaid && ground.isFreeGround) {
    note(spec.n, 'PAYWALL', `created as FREE though it is ground ${spec.n} (reason=${ground.freeReason})`);
  }

  // does the ground come out the length that was asked for?
  if (ground.timelineDays !== spec.timelineDays) {
    note(spec.n, 'SETUP', `asked for ${spec.timelineDays} days, ground says ${ground.timelineDays}`);
  }

  // whether these people see each other
  try {
    await http(`/grounds/${gid}/people-work-together`, { method: 'PATCH', token: sahar, body: { together: spec.peopleWorkTogether } });
  } catch (e: any) { note(spec.n, 'SETUP', `could not set work-together: ${e.message.slice(0, 120)}`); }

  // ---- lead signs in and confirms
  await ensureAccount(prisma, lead.email, lead.name);
  await login(lead.email);
  const before = await http(`/grounds/${gid}`, { token: tokens[lead.email] });
  if (before.status === 'AWAITING_LEAD') {
    await http(`/grounds/${gid}/confirm-lead`, { token: tokens[lead.email], body: { remit: `${lead.name} runs this ground.` } });
  }

  // ---- participants accept and sign in
  for (const p of parts) {
    const row = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: p.email } });
    if (!row) { note(spec.n, 'BLOCKER', `no participant row for ${p.name}`); continue; }
    if (row.inviteToken) {
      const [first, ...rest] = p.name.split(' ');
      try {
        await http('/participants/accept', { body: { token: row.inviteToken, firstName: first, lastName: rest.join(' ') } });
      } catch (e: any) { note(spec.n, 'LINK', `${p.name} could not accept the invite: ${e.message.slice(0, 140)}`); }
    }
    await ensureAccount(prisma, p.email, p.name);
    await login(p.email);
  }

  // ---- the sessions. Within a ground these run together; people are independent.
  for (let s = 1; s <= spec.sessions; s++) {
    const roster = [lead, ...parts];
    const results = await Promise.all(roster.map((p) => runCheckIn(prisma, gid, p, spec, s)));
    record.sessions.push({ session: s, people: results });

    // let the async work land: extraction, mentions, synthesis, release
    let released = false;
    for (let i = 0; i < 22; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const probe = await http(`/grounds/${gid}/report`, { token: tokens[lead.email] });
        if (probe?.releasedAt || probe?.sharedPicture) { released = true; break; }
      } catch { /* not ready */ }
    }
    try {
      const rep = await http(`/grounds/${gid}/report`, { token: tokens[lead.email] });
      record.reports.push({ session: s, released, report: rep });
    } catch (e: any) { record.reports.push({ session: s, error: e.message.slice(0, 160) }); }
    try {
      const bd = await http(`/grounds/${gid}/board`, { token: tokens[lead.email] });
      record.boards.push({ session: s, board: bd });
    } catch (e: any) { record.boards.push({ session: s, error: e.message.slice(0, 160) }); }
    const closes = results.filter((r: any) => r.naturalClose).length;
    console.log(`    s${s}: ${results.length} check-ins, ${closes} closed naturally, report ${released ? 'released' : 'NOT RELEASED'}`);
  }

  for (const p of [lead, ...parts]) seenBefore.add(p.key);
  return record;
}

async function ensureAccount(prisma: any, email: string, name: string) {
  const bcrypt = require('bcrypt');
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) return;
  const [first, ...rest] = name.split(' ');
  await prisma.user.update({
    where: { id: u.id },
    data: { passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, firstName: first, lastName: rest.join(' ') || first },
  });
}

async function runCheckIn(prisma: any, gid: string, p: any, spec: GroundSpec, session: number) {
  const part = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: p.email } });
  if (!part) return { key: p.key, error: 'no participant row' };
  let ci = await prisma.checkIn.findFirst({ where: { participantId: part.id, sessionNumber: session } });
  if (!ci) {
    ci = await prisma.checkIn.create({
      data: { groundId: gid, participantId: part.id, sessionNumber: session, status: 'NOT_STARTED', availableFrom: new Date(Date.now() - 86400000) },
    });
  } else if (ci.availableFrom && ci.availableFrom > new Date()) {
    await prisma.checkIn.update({ where: { id: ci.id }, data: { availableFrom: new Date(Date.now() - 86400000) } });
  }
  if (ci.status === 'COMPLETED') return { key: p.key, skipped: true };

  const token = tokens[p.email];
  const convo: any[] = [];
  try {
    const opened = await http(`/check-ins/${ci.id}/open`, { method: 'POST', token, body: {}, retries: 3 });
    const first = opened?.turns?.length ? opened.turns[opened.turns.length - 1]?.content : opened?.reply;
    if (first) convo.push({ role: 'AI', content: first });
  } catch (e: any) {
    note(spec.n, 'BLOCKER', `${p.name} could not open s${session}: ${e.message.slice(0, 160)}`);
    return { key: p.key, error: e.message.slice(0, 200) };
  }

  let closed = false;
  for (const t of turnsFor(p, spec, session)) {
    if (closed) break;
    convo.push({ role: 'PERSON', content: t });
    try {
      const r = await http(`/check-ins/${ci.id}/messages`, { method: 'POST', token, body: { message: t }, retries: 3 });
      convo.push({ role: 'AI', content: r?.reply ?? '' });
      if (r?.sessionComplete || r?.complete) closed = true;
    } catch (e: any) {
      convo.push({ role: 'ERROR', content: e.message.slice(0, 200) });
      break;
    }
  }
  try { await http(`/check-ins/${ci.id}/complete`, { method: 'POST', token }); } catch { /* noted below if it matters */ }
  return { key: p.key, name: p.name, level: p.level, style: p.style, naturalClose: closed, turns: convo };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);

  await login('sahar@org.test');
  console.log('Sahar signed in.');

  const all: any[] = [];
  for (const spec of GROUNDS) {
    if (ONLY && !ONLY.includes(spec.n)) continue;
    let rec: any;
    try {
      rec = await runGround(prisma, spec);
    } catch (e: any) {
      console.log(`  GROUND ${spec.n} FAILED: ${e.message.slice(0, 240)}`);
      rec = { spec, fatal: e.message.slice(0, 400) };
    }
    all.push(rec);
    // written after every ground, so a crash later never loses what is done
    fs.writeFileSync(`${OUT}/grounds.json`, JSON.stringify(all, null, 1));
    fs.writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 1));
  }

  console.log(`\nDONE. ${all.length} grounds, ${findings.length} findings recorded.`);
  await app.close();
  process.exit(0);
}
main().catch((e) => { console.error('ORG SIM FAILED:', e.message); process.exit(1); });
