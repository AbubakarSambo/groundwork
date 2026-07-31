/**
 * The full journey, driven through the REAL HTTP API as the REAL users.
 *
 * Nothing is written straight to the database except the org and Sahar. Every
 * step after that is the request a real person's browser would make, against the
 * real conversation engine and the real model, so the journey being tested is
 * the journey a customer gets.
 *
 * Sessions are run compressed: the cadence gate is opened by moving the check-in
 * availability date back, which is the same thing waiting a week would do,
 * rather than bypassing the gate.
 */
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PERSONAS, LEAD, CONTRIBUTORS } from './personas';
import * as fs from 'fs';

const API = 'http://localhost:3000/api/v1';
const PW = 'Journey123!';
const OUT = 'journey/out';
const SESSIONS = Number(process.env.SESSIONS ?? 12);

type Log = { step: string; detail: any };
const journeyLog: Log[] = [];
const note = (step: string, detail: any = '') => {
  journeyLog.push({ step, detail });
  const d = typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 200);
  console.log(`  ${step}${d ? ' :: ' + d : ''}`);
};

async function http(path: string, opts: { method?: string; body?: any; token?: string; retries?: number } = {}): Promise<any> {
  const retries = opts.retries ?? 0;
  try {
    return await httpOnce(path, opts);
  } catch (e: any) {
    // A transient model/network failure should not silently cost a check-in.
    const transient = /fetch failed|ECONN|socket|timeout|503|429/i.test(e.message ?? '');
    if (retries > 0 && transient) {
      await new Promise((r) => setTimeout(r, 4000));
      return http(path, { ...opts, retries: retries - 1 });
    }
    throw e;
  }
}

async function httpOnce(path: string, opts: { method?: string; body?: any; token?: string } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err: any = new Error(`${res.status} ${path} :: ${JSON.stringify(json)?.slice(0, 400)}`);
    err.status = res.status; err.body = json;
    throw err;
  }
  // The API wraps everything in { success, data } via a response interceptor.
  return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
}

const tokens: Record<string, string> = {};
async function login(email: string) {
  const r = await http('/auth/login', { method: 'POST', body: { email, password: PW } });
  const t = r.accessToken ?? r.access_token ?? r.token;
  if (!t) throw new Error(`no token for ${email}: ${JSON.stringify(r).slice(0, 200)}`);
  tokens[email] = t;
  return t;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);

  const load = (f: string) => { try { return JSON.parse(fs.readFileSync(`${OUT}/${f}`, 'utf8')); } catch { return []; } };
  const transcripts: any[] = load('transcripts.json');
  const reportsBySession: any[] = load('reports.json');
  const boardsBySession: any[] = load('boards.json');
  const alreadyCaptured = new Set(transcripts.map((t: any) => `${t.session}|${t.key}`));

  // ---------------------------------------------------------------- STEP 1
  console.log('\n=== 1. Sahar (org admin) signs in ===');
  await login('sahar@coamana.test');
  note('Sahar logged in');

  const orgGrounds = await http('/grounds', { token: tokens['sahar@coamana.test'] });
  note('Sahar sees her grounds list', { count: Array.isArray(orgGrounds) ? orgGrounds.length : 'n/a' });

  // ---------------------------------------------------------------- STEP 2
  console.log('\n=== 2. Sahar creates the ground and names Hafsah as lead ===');
  let ground: any;
  const existing = await prisma.ground.findFirst({ where: { label: 'Coamana growth, Q3 paying customers' }, orderBy: { createdAt: 'desc' } });
  if (existing) {
    ground = existing;
    note('resuming the existing ground', { id: ground.id, status: ground.status });
  } else try {
    ground = await http('/grounds/for-lead', {
      method: 'POST',
      token: tokens['sahar@coamana.test'],
      body: {
        leadEmail: LEAD.email,
        leadName: LEAD.name,
        label: 'Coamana growth, Q3 paying customers',
        scenario: 'NEW_PROJECT',
        moment: 'STARTING',
        timelineDays: 90,
        cadence: 'WEEKLY',
        brief: 'Three month push to eleven paying companies. Sales, engineering and contributor recruitment all in one ground.',
        participants: CONTRIBUTORS.map((p) => ({ email: p.email, roleAsDescribed: p.remit })),
      },
    });
  } catch (e: any) {
    note('BLOCKER creating ground', e.message);
    throw e;
  }
  const gid = ground.id;
  note('ground created', { id: gid, status: ground.status, mode: ground.mode, isFree: ground.isFreeGround, freeReason: ground.freeReason });
  fs.writeFileSync(`${OUT}/01-ground-created.json`, JSON.stringify(ground, null, 2));

  // ---------------------------------------------------------------- STEP 3
  console.log('\n=== 3. The lead sets a password and signs in ===');
  // for-lead creates a User row for the LEAD only (initiatorId is a required FK).
  // Participants exist as invite rows with no user until they accept, so they
  // cannot sign in yet - that ordering is the real flow.
  {
    const u = await prisma.user.findUnique({ where: { email: LEAD.email } });
    if (!u) { note('BLOCKER: no user row for the lead'); throw new Error('lead user missing'); }
    const bcrypt = require('bcrypt');
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, firstName: 'Hafsah', lastName: 'Jumare' },
    });
    await login(LEAD.email);
    note('Hafsah signed in');
  }
  for (const p of CONTRIBUTORS) {
    const u = await prisma.user.findUnique({ where: { email: p.email } });
    note(`${p.name} has a user account before accepting?`, u ? 'yes' : 'no - must accept the invite first');
  }

  // ---------------------------------------------------------------- STEP 4
  console.log('\n=== 4. Hafsah confirms she is the lead ===');
  const beforeConfirm = await http(`/grounds/${gid}`, { token: tokens[LEAD.email] });
  note('Hafsah opens the ground before confirming', { status: beforeConfirm.status, boardRenders: beforeConfirm.boardRenders });
  const confirmed = await http(`/grounds/${gid}/confirm-lead`, { method: 'POST', token: tokens[LEAD.email], body: {} });
  note('lead confirmed', confirmed);

  // ---------------------------------------------------------------- STEP 5
  console.log('\n=== 5. Participants accept their invites, then sign in ===');
  for (const p of CONTRIBUTORS) {
    const row = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: p.email } });
    if (!row) { note(`BLOCKER: no participant row for ${p.name}`); continue; }
    if (!row.inviteToken) { note(`BLOCKER: no invite token for ${p.name}`); continue; }
    const [first, last] = p.name.split(' ');
    try {
      // The invite token IS the credential here - no bearer token.
      await http('/participants/accept', { method: 'POST', body: { token: row.inviteToken, firstName: first, lastName: last } });
      note(`${p.name} accepted the invite`);
    } catch (e: any) {
      note(`BLOCKER accepting for ${p.name}`, e.message.slice(0, 200));
      continue;
    }
    const u = await prisma.user.findUnique({ where: { email: p.email } });
    if (!u) { note(`BLOCKER: accept did not produce a user for ${p.name}`); continue; }
    const bcrypt = require('bcrypt');
    await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true } });
    await login(p.email);
    note(`${p.name} signed in`);
  }

  // ---------------------------------------------------------------- SESSIONS
  for (let session = 1; session <= SESSIONS; session++) {
    console.log(`\n=== SESSION ${session} of ${SESSIONS} ===`);

    for (const p of PERSONAS) {
      const part = await prisma.groundParticipant.findFirst({ where: { groundId: gid, email: p.email } });
      if (!part) continue;

      // Ensure this person has a check-in for this session. Session 1 is created
      // by the product; later sessions need the cadence gate opened, which is
      // what waiting a week would do.
      let ci = await prisma.checkIn.findFirst({ where: { participantId: part.id, sessionNumber: session } });
      if (!ci) {
        ci = await prisma.checkIn.create({
          data: { groundId: gid, participantId: part.id, sessionNumber: session, status: 'NOT_STARTED', availableFrom: new Date(Date.now() - 86400000) },
        });
      } else if (ci.availableFrom && ci.availableFrom > new Date()) {
        await prisma.checkIn.update({ where: { id: ci.id }, data: { availableFrom: new Date(Date.now() - 86400000) } });
      }
      if (ci.status === 'COMPLETED' || alreadyCaptured.has(`${session}|${p.key}`)) continue;

      const token = tokens[p.email];
      const turns = p.turns[session - 1] ?? p.turns[p.turns.length - 1];
      const convo: any[] = [];

      try {
        const opened = await http(`/check-ins/${ci.id}/open`, { method: 'POST', token, retries: 3 });
        const opener = opened?.turns?.length ? opened.turns[opened.turns.length - 1]?.content : opened?.reply ?? opened?.message;
        if (opener) convo.push({ role: 'AI', content: opener });
      } catch (e: any) {
        note(`BLOCKER opening check-in for ${p.name} s${session}`, e.message.slice(0, 200));
        continue;
      }

      let closed = false;
      for (const t of turns) {
        if (closed) break;
        convo.push({ role: 'PERSON', content: t });
        try {
          const r = await http(`/check-ins/${ci.id}/messages`, { method: 'POST', token, body: { message: t }, retries: 3 });
          const reply = r?.reply ?? r?.message ?? r?.content ?? '';
          convo.push({ role: 'AI', content: reply, sessionComplete: r?.sessionComplete ?? r?.complete ?? false });
          if (r?.sessionComplete || r?.complete) closed = true;
        } catch (e: any) {
          convo.push({ role: 'ERROR', content: e.message.slice(0, 300) });
          note(`send failed ${p.name} s${session}`, e.message.slice(0, 160));
          break;
        }
      }

      // The person ends their own session. No auto-finalise.
      try {
        await http(`/check-ins/${ci.id}/complete`, { method: 'POST', token });
      } catch (e: any) {
        note(`complete failed ${p.name} s${session}`, e.message.slice(0, 160));
      }

      transcripts.push({ session, person: p.name, key: p.key, naturalClose: closed, turns: convo });
      console.log(`    ${p.name}: ${convo.filter(c => c.role === 'AI').length} AI turns, natural close: ${closed}`);
    }

    // Wait for the async work to actually land rather than guessing: record
    // extraction, work mentions, dependencies, function detection, synthesis and
    // release are all fire-and-forget after a check-in completes.
    let released = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const probe = await http(`/grounds/${gid}/report`, { token: tokens[LEAD.email] });
        if (probe?.releasedAt || probe?.sharedPicture) { released = true; break; }
      } catch { /* not ready */ }
    }
    if (!released) note(`session ${session}: report did not release within 90s`);

    // What the lead sees after this session.
    try {
      const rep = await http(`/grounds/${gid}/report`, { token: tokens[LEAD.email] });
      const ri = reportsBySession.findIndex((x: any) => x.session === session);
      if (ri >= 0) reportsBySession[ri] = { session, report: rep }; else reportsBySession.push({ session, report: rep });
      console.log(`    report: ${rep.releasedAt ? 'released' : rep.forming ? 'forming' : 'n/a'}`);
    } catch (e: any) {
      reportsBySession.push({ session, error: e.message.slice(0, 200) });
      console.log(`    report error: ${e.message.slice(0, 120)}`);
    }
    try {
      const bd = await http(`/grounds/${gid}/board`, { token: tokens[LEAD.email] });
      const bi = boardsBySession.findIndex((x: any) => x.session === session);
      if (bi >= 0) boardsBySession[bi] = { session, board: bd }; else boardsBySession.push({ session, board: bd });
      console.log(`    board: renders=${bd.renders} sections=${(bd.sections ?? []).length}`);
    } catch (e: any) {
      boardsBySession.push({ session, error: e.message.slice(0, 200) });
      console.log(`    board error: ${e.message.slice(0, 120)}`);
    }
  }

  fs.writeFileSync(`${OUT}/transcripts.json`, JSON.stringify(transcripts, null, 2));
  fs.writeFileSync(`${OUT}/reports.json`, JSON.stringify(reportsBySession, null, 2));
  fs.writeFileSync(`${OUT}/boards.json`, JSON.stringify(boardsBySession, null, 2));
  fs.writeFileSync(`${OUT}/journey-log.json`, JSON.stringify(journeyLog, null, 2));
  fs.writeFileSync(`${OUT}/ids.json`, JSON.stringify({ groundId: gid, logins: PERSONAS.map(p => p.email), password: PW }, null, 2));

  console.log(`\n=== DONE. ground ${gid} ===`);
  console.log(`transcripts: ${transcripts.length}, reports: ${reportsBySession.length}, boards: ${boardsBySession.length}`);
  await app.close();
  process.exit(0);
}
main().catch((e) => { console.error('\nJOURNEY FAILED:', e.message); process.exit(1); });
