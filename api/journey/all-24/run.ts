/**
 * Runs each scenario end to end through the real API and keeps everything the lead and each
 * participant would actually read, so the board, the conversations and both reports can be rated
 * against what is known to be true.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { AnthropicService, ChatTurn } from '../../src/modules/conversation/anthropic.service';
import { THE_SCENARIOS as SUITE, thePersonaFor, AScenario, APerson } from '../the-suite/scenarios';
import { THE_REST } from './scenarios';
import { THE_ADVERSARIAL } from './adversarial-scenarios';
const THE_SCENARIOS: AScenario[] = [...SUITE, ...THE_REST, ...(THE_ADVERSARIAL as unknown as AScenario[])];
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

const API = process.env.API ?? 'http://localhost:3000/api/v1';
const PW = 'SuiteRun123!';
const OUT = process.env.OUT ?? 'journey/all-24/out';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const MAX_TURNS = Number(process.env.MAX_TURNS ?? 9);
/* Decision 68: SESSIONS=6 runs every scenario for six sessions, so patterns can reach three periods. */
const SESSIONS = process.env.SESSIONS ? Number(process.env.SESSIONS) : null;

const tokens: Record<string, string> = {};
const log = (s: string) => { console.log(s); fs.appendFileSync(`${OUT}/run.log`, s + '\n'); };

async function http(path: string, o: { method?: string; body?: any; token?: string; retries?: number } = {}): Promise<any> {
  const retries = o.retries ?? 4;
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
    /* THE LOGIN THROTTLE IS A MINUTE, NOT FIVE SECONDS. Six shards signing in at once trip it, and
       a 5s retry just trips it again - so a 429 waits out the window and everything else does not. */
    if (retries > 0 && /429|Too many tries/i.test(e.message ?? '')) {
      await new Promise((r) => setTimeout(r, 65000));
      return http(path, { ...o, retries: retries - 1 });
    }
    if (retries > 0 && /fetch failed|ECONN|socket|timeout|503/i.test(e.message ?? '')) {
      await new Promise((r) => setTimeout(r, 5000));
      return http(path, { ...o, retries: retries - 1 });
    }
    throw e;
  }
}

/*
 * THE RUNS GO THROUGH THE ROUTE PEOPLE USE. Hafsah, 28 September 2026: the screen sends every
 * message through the streamed route, and until today this runner used the plain one, so the runs
 * measured a route nobody used. The streamed route now runs the plain route's own code; this reads
 * it the way ChatPage does: the draft arrives in pieces, and `done` carries the reply the screen is
 * left showing, which is what is stored. ROUTE=plain keeps the old route, for comparison only.
 */
const ROUTE = process.env.ROUTE === 'plain' ? 'plain' : 'streamed';
async function send(checkInId: string, message: string, token: string, retries = 3): Promise<any> {
  if (ROUTE === 'plain') return http(`/check-ins/${checkInId}/messages`, { method: 'POST', token, body: { message }, retries });
  try {
    const res = await fetch(`${API}/check-ins/${checkInId}/messages/stream`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) { const e: any = new Error(`${res.status} /messages/stream :: ${(await res.text()).slice(0, 350)}`); e.status = res.status; throw e; }
    const text = await res.text();
    let done: any = null;
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      let evt: any; try { evt = JSON.parse(data); } catch { continue; }
      if (evt?.type === 'error') throw new Error(`stream error: ${evt.code ?? ''} ${evt.message ?? ''}`);
      if (evt?.type === 'done') done = evt;
    }
    if (!done) throw new Error('stream ended with no done event');
    return done;
  } catch (e: any) {
    if (retries > 0 && /429|Too many tries/i.test(e.message ?? '')) { await new Promise((r) => setTimeout(r, 65000)); return send(checkInId, message, token, retries - 1); }
    if (retries > 0 && /fetch failed|ECONN|socket|timeout|503/i.test(e.message ?? '')) { await new Promise((r) => setTimeout(r, 5000)); return send(checkInId, message, token, retries - 1); }
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

  const howMany = SESSIONS ?? s.sessions;
  for (let n = 1; n <= howMany; n++) {
    log(`\n  --- session ${n} of ${howMany}`);
    const people: any[] = [];
    for (const p of s.people) {
      if (!rows[p.key] || !tokens[email(p)]) { people.push({ key: p.key, error: 'no sign-in' }); continue; }
      people.push(await runCheckIn(prisma, model, gid, s, p, rows[p.key], email(p), n));
    }
    /*
     * WAIT FOR THE FINAL REPORT, NOT FOR ANY REPORT. (26 September 2026.)
     *
     * This used to stop at the first probe that came back with a `sharedPicture`. A report is
     * written after each person checks in, so the first one to exist is the one written after the
     * LEAD checked in - it says "Only you have checked in so far" and carries one finding. Run the
     * twenty-four one after another and the regeneration had usually caught up before this loop
     * ran, so it happened to read the finished report. Run six scenarios at once against one
     * server and it does not: the earlier report is already sitting there, the first probe returns
     * it, and the loop breaks on the first pass.
     *
     * What that produced, measured: a sharded run wrote 35 findings across the twenty-four where
     * the database held 73 - crisis 1 where the database had 3, cofounder 1 where it had 2 - and
     * every wording count came out flattering, because a lead-only report is a third of the text.
     * It cost most of an afternoon and a wrong conclusion about a prompt.
     *
     * So it waits for one finding per person who actually checked in this session, and settles for
     * what it has once three probes running have shown the same number, which is how a scenario
     * that genuinely produces fewer still finishes.
     */
    let released = false;
    const wanted = people.length;
    let written = 0;
    let unchanged = 0;
    let probes = 0;
    for (let i = 0; i < 75; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      probes = i + 1;
      try {
        const probe = await http(`/grounds/${gid}/report`, { token: tokens[email(lead)] });
        if (!probe?.releasedAt && !probe?.sharedPicture) continue;
        released = true;
        const now = Array.isArray(probe?.findings) ? probe.findings.length : 0;
        if (now >= wanted) { written = now; break; }
        unchanged = now === written ? unchanged + 1 : 0;
        written = now;
        /* Settled: a minute with the count not moving. See the note below. */
        if (unchanged >= 15) break;
      } catch { /* not yet */ }
    }
    /*
     * A SHORTFALL IS SAID OUT LOUD RATHER THAN QUIETLY WRITTEN TO THE FILE.
     *
     * The first version of this wait settled once three probes running showed the same number,
     * which is twelve seconds, and under six parallel shards regeneration is nowhere near done by
     * then - it settled at "1 finding for 3 people" and wrote that to the file as though it were
     * the report. There is no cheap signal for "this report is final".
     *
     * AND WAITING FOR ONE FINDING PER PERSON, FULL STOP, WAS TOO STRICT - my own change, and it
     * cost a run. Some scenarios genuinely produce fewer findings than people, because somebody
     * said nothing the report could use, so that rule spent the whole five minutes waiting for a
     * finding that was never coming, session after session. A run that used to take half an hour
     * was on course for several.
     *
     * So it stops on either: one finding per person, or a minute in which the count has not moved.
     * A minute is far longer than regeneration takes when it is going to arrive, and short enough
     * that a scenario which legitimately has fewer does not hold the run up. The line below still
     * says when it settled short, because that is the case where the numbers may be thin and it
     * should be visible rather than inferred from the database afterwards.
     */
    if (written < wanted) {
      log(`    *** REPORT SETTLED SHORT: ${written} finding(s) for ${wanted} person/people after ${probes * 4}s. Either somebody said nothing the report could use, or it had not finished. Check this one against the database before trusting its numbers. ***`);
    }
    /* And once more before the capture: wait (up to ten minutes) for a build still in progress to finish. */
    for (let i = 0; i < 150; i++) {
      try {
        const probe = await http(`/grounds/${gid}/report`, { token: tokens[email(lead)] });
        if (!probe?.beingWritten) break;
      } catch { break; }
      await new Promise((r) => setTimeout(r, 4000));
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
  /*
   * DECISION 68: WHAT EACH PERSON WOULD BE SHOWN, ONCE THE LAST SESSION HAS BEEN READ.
   * Patterns are read after a check-in ends, in the background, so the last session's reading may
   * not be done when the loop above stops. Wait until every check-in on this ground has been read
   * (up to ten minutes), then keep the patterns as they finally stand.
   */
  if (SESSIONS) {
    for (let i = 0; i < 150; i++) {
      const left = await prisma.checkIn.count({ where: { groundId: gid, status: 'COMPLETED' as any, patternsAnalyzedAt: null } }).catch(() => 0);
      if (left === 0) break;
      await new Promise((r) => setTimeout(r, 4000));
    }
    record.finalPatterns = await prisma.patternDetection.findMany({
      where: { groundId: gid },
      select: { code: true, status: true, seenInSessions: true, observationText: true, participant: { select: { email: true } } },
    }).catch(() => []);
    fs.writeFileSync(`${OUT}/${s.key}.json`, JSON.stringify(record, null, 1));
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
    /* A person may have a prepared first message (adversarial set): it is sent word for word, never shortened by the simulator. */
    const scripted = (p as any).firstSay as string | undefined;
    if (t === 0 && scripted) said = scripted;
    else try { said = (await model.respond(system, chat)).trim(); } catch { said = 'I would have to check that.'; }
    chat.push({ role: 'assistant', content: said });
    turns.push({ from: p.name.toUpperCase(), text: said });
    try {
      const r = await send(ci.id, said, token);
      asked = r?.reply ?? '';
      turns.push({ from: 'GROUNDWORK', text: asked, ...(Array.isArray(r?.suggestedAnswers) ? { suggestedAnswers: r.suggestedAnswers } : {}) });
      if (r?.sessionComplete || r?.complete) closed = true;
    } catch (e: any) { turns.push({ from: 'ERROR', text: e.message.slice(0, 220) }); break; }
  }
  try { await http(`/check-ins/${ci.id}/complete`, { method: 'POST', token }); } catch { /* fine */ }
  log(`    ${p.name}: ${turns.filter((x) => x.from === 'GROUNDWORK').length} questions, closed naturally=${closed}`);
  return { key: p.key, name: p.name, isLead: !!p.isLead, checkInId: ci.id, naturalClose: closed, turns };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  log(`Messages go through the ${ROUTE} route.`);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const model = app.get(AnthropicService);
  for (const s of THE_SCENARIOS) {
    /* ONLY accepts exact keys and a trailing star, so ONLY=adversarial-* runs the whole adversarial set. */
    if (ONLY && !ONLY.some((k) => (k.endsWith('*') ? s.key.startsWith(k.slice(0, -1)) : k === s.key))) continue;
    try { await runScenario(prisma, model, s); }
    catch (e: any) { log(`\n${s.key} FAILED: ${e?.message?.slice(0, 400)}`); }
  }
  log('\nALL DONE');
  await app.close();
  process.exit(0);
}
main().catch((e) => { console.error('SUITE FAILED:', e?.message ?? e); process.exit(1); });
