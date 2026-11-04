/**
 * REALISTIC DUMPS THROUGH EVERY WAY IN, ON THE LOCAL TEST DATABASE ONLY.
 *
 * Usage (API on 3005, started from api/ with DATABASE_URL pointing at a local copy):
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_dumps_1 node journey/dumps/run-dumps.mjs <dump> <path>
 * dump: sales | onboarding | project | planning.  path: ask | chat | plan | doc | checkin.
 * It refuses any database that is not on this machine, and any API that is not on port 3005.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL ?? '';
if (!/@?(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url) || !/\/gw_[a-z0-9_]+$/.test(url)) { console.error('Refusing: DATABASE_URL must be a local gw_ database.'); process.exit(1); }
const API = 'http://localhost:3005/api/v1';
const p = new PrismaClient();
const [dump, via] = process.argv.slice(2);
const truth = JSON.parse(fs.readFileSync(path.join(here, 'truth.json'), 'utf8'))[dump];
const text = fs.readFileSync(path.join(here, `${dump}.txt`), 'utf8').trim();
if (!truth || !via) { console.error('dump and path needed'); process.exit(1); }

async function call(tok, method, p2, body) {
  const r = await fetch(API + p2, { method, headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  return { status: r.status, ok: r.ok && j.success !== false, data: j.data ?? j, message: j.message };
}
const slug = `dumps-${dump}`;
let org = await p.organization.findFirst({ where: { slug } });
if (!org) org = await p.organization.create({ data: { name: `Dumps ${dump}`, slug, email: `admin@${slug}.test` } });
const mail = (n) => `${n.toLowerCase().replace(/[^a-z]+/g, '.')}@${slug}.test`;
async function user(name, role = 'MEMBER') {
  const [firstName, ...rest] = name.split(' '); const email = mail(name);
  let u = await p.user.findFirst({ where: { email } });
  if (!u) u = await p.user.create({ data: { email, firstName, lastName: rest.join(' ') || 'X', role, organizationId: org.id, isEmailVerified: true, isActive: true, awaitingOrgApproval: false, passwordHash: await bcrypt.hash('test', 10) } });
  const m = await p.organizationMembership.findUnique({ where: { userId_organizationId: { userId: u.id, organizationId: org.id } } });
  if (!m) await p.organizationMembership.create({ data: { userId: u.id, organizationId: org.id, role } });
  return u;
}
async function login(email) { const r = await call(null, 'POST', '/auth/login', { email, password: 'test' }); if (!r.ok) throw new Error('login ' + email + ' ' + JSON.stringify(r).slice(0, 200)); return r.data.accessToken; }

const lead = await user(truth.lead, 'ADMIN');
const L = await login(lead.email);
const g = await call(L, 'POST', '/grounds', { label: `${truth.label} ${via} ${Date.now() % 100000}`, scenario: truth.scenario, moment: 'STARTING', timelineDays: 90, cadence: 'WEEKLY', brief: 'This check-in is for the team to say how the quarter is going, what is blocking them and what they will do next, so the lead can help early and the numbers are honest.' });
if (!g.data?.id) { console.log('CREATE FAILED', JSON.stringify(g).slice(0, 400)); process.exit(1); }
const gid = g.data.id;
const people = {};
for (const n of truth.roster) {
  const u = await user(n); people[n] = u;
  const a = await call(L, 'POST', `/grounds/${gid}/participants`, { email: u.email, roleAsDescribed: null });
  if (!a.ok) console.log('add failed', n, a.message);
  /* They have accepted: the row is theirs, as it is once somebody clicks their invite. */
  await p.groundParticipant.updateMany({ where: { groundId: gid, email: u.email }, data: { userId: u.id, nameGiven: n } });
}
const rows = await p.groundParticipant.findMany({ where: { groundId: gid }, select: { id: true, email: true, userId: true } });
console.log('ground', gid, 'participants', rows.length);

const byName = {};
async function names() {
  const ps = await p.groundParticipant.findMany({ where: { groundId: gid }, include: { user: true } });
  for (const x of ps) byName[x.id] = [x.user?.firstName, x.user?.lastName].filter(Boolean).join(' ') || x.nameGiven || x.email;
}
await names();

export async function snapshot() {
  const o = await p.groundObjective.findMany({ where: { groundId: gid }, orderBy: { sortOrder: 'asc' } });
  const po = await p.personObjective.findMany({ where: { groundId: gid } });
  const c = await p.groundCommitment.findMany({ where: { groundId: gid } });
  const ci = await p.groundContextItem.findMany({ where: { groundId: gid } });
  const b = await p.groundBaseline.findMany({ where: { groundId: gid } });
  const pp = await p.planProposal.findMany({ where: { groundId: gid } });
  return {
    objectives: o.map((x) => ({ name: x.name, target: x.target, owner: x.ownerParticipantId ? byName[x.ownerParticipantId] : 'team', direction: x.direction })),
    expectations: po.map((x) => ({ who: byName[x.participantId], text: x.text })),
    commitments: c.map((x) => ({ who: x.participantId ? byName[x.participantId] : null, text: x.text, when: x.whenSaid })),
    context: ci.map((x) => ({ kind: x.kind, about: x.aboutParticipantId ? byName[x.aboutParticipantId] : null, text: x.text, exact: x.exactQuestion, confirmed: !!x.questionConfirmedAt, audience: x.audience })),
    baseline: b.map((x) => x.successLooksLike),
    proposals: pp.map((x) => ({ kind: x.kind, status: x.status, says: x.says })),
  };
}
const count = (s) => Object.values(s).reduce((a, v) => a + v.length, 0);

const before = await snapshot();
const log = { dump, via, ground: gid, before: count(before) };
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9% ]+/g, ' ').replace(/\s+/g, ' ').trim();

if (via === 'chat' || via === 'ask') {
  let sayBack, afterAsk;
  if (via === 'chat') {
    const r = await call(L, 'POST', `/grounds/${gid}/context-chat`, { history: [{ role: 'user', content: text }] });
    log.askStatus = r.status; sayBack = r.data?.reply ?? r.data?.say ?? JSON.stringify(r.data).slice(0, 4000);
    log.proposalKind = r.data?.proposal?.kind; sayBack = r.data?.proposal?.say ?? sayBack;
    log.reply = r.data?.reply;
    afterAsk = await snapshot(); log.writtenBeforeYes = count(afterAsk) - count(before);
    const y = await call(L, 'POST', `/grounds/${gid}/context-chat/confirm`, { said: 'Yes', history: [{ role: 'user', content: text }, { role: 'assistant', content: sayBack }] });
    log.yesStatus = y.status; log.yesSay = y.data?.say ?? y.message; log.changed = y.data?.changed;
  } else {
    const flag = await p.platformSetting.findUnique({ where: { key: 'release.contextInAskGroundwork' } });
    log.flag = flag?.value;
    const r = await call(L, 'POST', '/ask', { message: text, groundId: gid, openedFrom: process.env.PLAIN_BOX ? undefined : 'check_in_setup' });
    log.askStatus = r.status; sayBack = JSON.stringify(r.data).slice(0, 6000); log.lane = r.data?.lane;
    log.reply = r.data?.reply ?? r.data?.text ?? r.data;
    afterAsk = await snapshot(); log.writtenBeforeYes = count(afterAsk) - count(before);
    const pid = r.data?.proposalId ?? r.data?.proposal?.id ?? r.data?.blocks?.find?.((b) => b.proposalId)?.proposalId;
    log.proposalId = pid;
    if (pid) { const y = await call(L, 'POST', '/ask/answer', { proposalId: pid, answer: 'yes' }); log.yesStatus = y.status; log.yesSay = y.data?.reply ?? y.data; }
  }
  log.sayBack = sayBack;
}

if (via === 'plan') {
  const r = await call(L, 'POST', `/grounds/${gid}/plan/proposals`, { text });
  log.readStatus = r.status; log.says = r.data?.says; log.proposals = (r.data?.proposals ?? []).map((x) => ({ id: x.id, kind: x.kind, says: x.says, who: x.fields?.personOnTheCheckIn ?? x.fields?.personName ?? null, notOn: !!x.note, number: x.fields?.number, date: x.fields?.date, from: x.fromThePlan }));
  const mid = await snapshot(); log.writtenBeforeYes = count(mid) - count(before) - (r.data?.proposals ?? []).length;
  log.confirm = [];
  for (const x of r.data?.proposals ?? []) {
    const c = await call(L, 'POST', `/grounds/${gid}/plan/proposals/${x.id}/confirm`, x.kind === 'goal' && x.fields?.number !== undefined ? { direction: 'AIM' } : {});
    await new Promise((r) => setTimeout(r, 1500)); log.confirm.push(`${x.kind} ${c.status} ${c.ok ? '' : (c.message ?? '')}`);
  }
}

if (via === 'doc') {
  const form = new FormData();
  form.append('file', new Blob([text], { type: 'text/plain' }), `${dump}.txt`);
  form.append('consentConfirmed', 'true');
  const up = await fetch(`${API}/grounds/${gid}/documents`, { method: 'POST', headers: { authorization: `Bearer ${L}` }, body: form });
  const uj = await up.json().catch(() => ({}));
  log.uploadStatus = up.status; const docId = uj.data?.id ?? uj.id; log.docId = docId; log.uploadBody = JSON.stringify(uj).slice(0, 600);
  await new Promise((r) => setTimeout(r, 25000));
  const d = await p.groundDocument.findUnique({ where: { id: docId } });
  log.holds = d?.holds; log.visibility = d?.visibility;
  /* What the document's numbers would write on a yes, checked against the truth. */
  const w = (d?.holds?.waiting ?? []).map((x) => ({ owner: x.ownerParticipantId ? byName[x.ownerParticipantId] : 'team', target: x.target, name: x.name }));
  const wanted2 = truth.targets.map(([who, n]) => ({ who, n }));
  log.numbersWaiting = {
    missing: [...wanted2.filter((t) => !w.some((x) => x.owner === t.who && x.target === t.n)).map((t) => `${t.who} ${t.n}`), ...truth.teamTargets.filter((n) => !w.some((x) => x.owner === 'team' && x.target === n)).map((n) => `team ${n}`)],
    wrong: w.filter((x) => x.owner === 'team' ? !truth.teamTargets.includes(x.target) : !wanted2.some((t) => t.who === x.owner && t.n === x.target)).map((x) => `${x.owner} ${x.name} ${x.target}`),
  };
  const mid = await snapshot(); log.writtenAfterUploadBeforeYes = count(mid) - count(before);
  const r = await call(L, 'POST', `/grounds/${gid}/plan/proposals`, { documentId: docId });
  log.planStatus = r.status; log.says = r.data?.says; log.proposals = (r.data?.proposals ?? []).map((x) => ({ kind: x.kind, says: x.says, who: x.fields?.personOnTheCheckIn ?? x.fields?.personName ?? null, notOn: !!x.note }));
  const chat = await call(L, 'POST', `/grounds/${gid}/context-chat`, { history: [{ role: 'user', content: 'I added the document.' }] });
  log.chatAfterUpload = chat.data?.reply ?? chat.data?.proposal?.say;
}

if (via === 'askdoc') {
  const form = new FormData();
  form.append('file', new Blob([text], { type: 'text/plain' }), `${dump}.txt`);
  form.append('consentConfirmed', 'true');
  const up = await fetch(`${API}/grounds/${gid}/documents`, { method: 'POST', headers: { authorization: `Bearer ${L}` }, body: form });
  log.uploadStatus = up.status;
  await new Promise((r) => setTimeout(r, 30000));
  const r = await call(L, 'POST', '/ask', { message: 'I have just added the document.', groundId: gid });
  log.askStatus = r.status; log.lane = r.data?.lane; log.sayBack = JSON.stringify(r.data).slice(0, 8000);
  const mid = await snapshot(); log.writtenBeforeYes = count(mid) - count(before);
  const pid = r.data?.blocks?.find?.((b) => b.proposalId)?.proposalId; log.proposalId = pid;
  if (pid) { const y = await call(L, 'POST', '/ask/answer', { proposalId: pid, answer: 'yes' }); log.yesStatus = y.status; log.yesSay = y.data?.blocks?.[0]?.body ?? y.data; }
}

if (via === 'checkin') {
  const mine = await p.checkIn.findMany({ where: { groundId: gid } , select: { id: true, participantId: true, sessionNumber: true } });
  const leadPart = await p.groundParticipant.findFirst({ where: { groundId: gid, userId: lead.id }, select: { id: true } });
  log.leadHasCheckIn = !!leadPart;
  const who = leadPart ? lead : people[truth.roster[0]];
  const ci = mine.find((c) => c.participantId === (leadPart?.id ?? rows.find((r) => r.userId === who.id)?.id));
  if (!ci) { log.note = 'no check-in session to paste in'; }
  else {
    const T = await login(who.email);
    await call(T, 'POST', `/check-ins/${ci.id}/open`, {});
    const m = await call(T, 'POST', `/check-ins/${ci.id}/messages`, { message: text });
    log.status = m.status; log.reply = m.data?.reply ?? m.message;
  }
}

const after = await snapshot();
log.after = after;

/* ---------------- the checks ---------------- */
const rep = { missing: [], wrongPerson: [], notATarget: [], unexpected: [], mustNot: [], ownerlessFiled: [] , noName: [] };
const wanted = truth.targets.map(([w, n]) => ({ w, n }));
for (const t of wanted) if (!after.objectives.some((o) => o.owner === t.w && o.target === t.n)) rep.missing.push(`${t.w} ${t.n}`);
for (const n of truth.teamTargets) if (!after.objectives.some((o) => o.owner === 'team' && o.target === n)) rep.missing.push(`team ${n}`);
for (const o of after.objectives) {
  if (o.target == null) continue;
  const rightPlace = o.owner === 'team' ? truth.teamTargets.includes(o.target) : wanted.some((t) => t.w === o.owner && t.n === o.target);
  if (rightPlace) continue;
  if (truth.notTargets.includes(o.target) && !wanted.some((t) => t.n === o.target) && !truth.teamTargets.includes(o.target)) rep.notATarget.push(`${o.owner}: ${o.name} ${o.target}`);
  else if (wanted.some((t) => t.n === o.target) || truth.teamTargets.includes(o.target)) rep.wrongPerson.push(`${o.owner}: ${o.name} ${o.target}`);
  else rep.unexpected.push(`${o.owner}: ${o.name} ${o.target}`);
}
for (const [w, k] of truth.commitments) if (!after.commitments.some((c) => c.who === w && norm(c.text + ' ' + (c.when ?? '')).includes(k))) rep.missing.push(`commitment ${w} ${k}`);
for (const k of truth.ownerless) { const bad = after.commitments.filter((c) => c.who && norm(c.text).includes(k)); for (const b of bad) rep.ownerlessFiled.push(`${b.who}: ${b.text}`); }
for (const [w, ks] of Object.entries(truth.mustNotBeFiledOn)) {
  for (const k of ks) {
    for (const c of after.commitments) if (c.who === w && norm(c.text).includes(k)) rep.mustNot.push(`commitment ${w}: ${c.text}`);
    for (const e of after.expectations) if (e.who === w && norm(e.text).includes(k)) rep.mustNot.push(`expectation ${w}: ${e.text}`);
    for (const c of after.context) if (c.about === w && norm(c.text).includes(k)) rep.mustNot.push(`context about ${w}: ${c.text}`);
  }
}
for (const [w, k] of truth.questions) if (!after.context.some((c) => c.kind === 'QUESTION_FOR_PERSON' && c.about === w && norm(c.text + ' ' + (c.exact ?? '')).includes(k))) rep.missing.push(`question for ${w} ${k}`);
/* anything stored whose words are not in the dump */
const dumpWords = new Set(norm(text).split(' '));
const thin = (s) => { const w = norm(s).split(' ').filter((x) => x.length > 3); if (!w.length) return false; return w.filter((x) => !dumpWords.has(x) && !dumpWords.has(x.replace(/s$/, ''))).length / w.length > 0.5; };
rep.looksInvented = [
  ...after.commitments.map((c) => c.text), ...after.expectations.map((e) => e.text),
  ...after.context.filter((c) => c.kind !== 'QUESTION_FOR_PERSON').map((c) => c.text), ...after.baseline, ...after.objectives.map((o) => o.name),
].filter(thin);
log.report = rep;
const outFile = path.join(process.env.OUT ?? '/private/tmp/claude-501/-Users-hafsahjumare-Documents-GitHub-groundwork/4187f35c-1237-44bc-b122-2d0f2abc2b23/scratchpad/out', `out-${dump}-${via}.json`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(log, null, 2));
console.log(JSON.stringify({ via, dump, writtenBeforeYes: log.writtenBeforeYes, report: rep }, null, 1));
await p.$disconnect();
