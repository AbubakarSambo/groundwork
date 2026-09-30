/**
 * THE FOUR LIVE CHECKS (Hafsah, 30 September 2026): items 10, 11, 15 and 16 of
 * docs/context-chat-inventory.md, which live only in the setup conversation's instructions to the
 * model, so no unit test can prove them. Each is sent, word for word the same, through the old
 * context chat on one new check-in and through Ask Groundwork (opened from inside the check-in,
 * decision 65) on another, and what each person would read is printed with what was saved.
 *
 *  10. A lead says somebody is struggling: the chat asks what they have seen, tried and want, and
 *      nothing about that person is kept as a fact or shown to anyone but the lead.
 *  11. A lead says what they expect of a named person: kept as the lead's expectation, unseen by the
 *      person until they read it. A wish with nothing checkable in it is not kept.
 *  15. A check-in that already holds something opens on what it holds, never on a greeting.
 *  16. What doing well looks like, restated with a reason, keeps every version.
 *
 * It prints; a person judges. Local API and local database only.
 *   DATABASE_URL=postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102 npx ts-node -T journey/the-four-live-checks.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3000/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API) || !/@(localhost|127\.0\.0\.1)(:\d+)?\/gw_/.test(DB_URL)) {
  console.error('Refusing: a local API and a local gw_ test database only.');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });
const PW = 'FourLiveChecks123!';
const stamp = Date.now();

async function http(path: string, o: { method?: string; body?: any; token?: string } = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: o.method ?? (o.body !== undefined ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(o.token ? { authorization: `Bearer ${o.token}` } : {}) },
    ...(o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) return { refused: res.status, message: json?.message ?? text.slice(0, 300) };
  return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
}

async function newCheckIn(label: string, create: Record<string, unknown> = {}) {
  label = label.toLowerCase();
  const org = await prisma.organization.create({
    data: { name: `${label} ${stamp}`, slug: `${label}-${stamp}`, email: `lead.${label}.${stamp}@four.test` },
  });
  const email = `ada.${label}.${stamp}@four.test`;
  const user = await prisma.user.create({
    data: { email, organizationId: org.id, firstName: 'Ada', lastName: 'Obi', passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: 'ADMIN' },
  });
  await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: org.id, role: 'ADMIN' as any } });
  const token = (await http('/auth/login', { body: { email, password: PW } })).accessToken;
  const ground = await http('/grounds', {
    token,
    body: { label: `${label} check-in`, scenario: 'OKR_ALIGNMENT', moment: 'STARTING', brief: 'This check-in follows the sales team through the fourth quarter: the pipeline, the renewals, and how each person is getting on with their accounts.', ...create },
  });
  const benEmail = `ben.${label}.${stamp}@four.test`;
  if (!ground?.id) throw new Error(`the check-in was not created: ${JSON.stringify(ground).slice(0, 300)}`);
  const added = await http(`/grounds/${ground.id}/participants`, { token, body: { email: benEmail, roleAsDescribed: 'Sales' } });
  if (added?.refused) throw new Error(`Ben was not added: ${JSON.stringify(added).slice(0, 300)}`);
  const row = await prisma.groundParticipant.findFirst({ where: { groundId: ground.id, email: benEmail } });
  if (row?.inviteToken) await http('/participants/accept', { body: { token: row.inviteToken, firstName: 'Ben', lastName: 'Okafor' } });
  return { groundId: ground.id as string, token, benId: row!.id };
}

/** One door: a function that takes what the lead types and returns what the lead reads, saying yes to anything offered. */
type Door = (said: string) => Promise<string>;

function oldDoor(groundId: string, token: string): Door {
  const history: { role: 'user' | 'assistant'; content: string }[] = [];
  return async (said: string) => {
    if (said) history.push({ role: 'user', content: said });
    const r = await http(`/grounds/${groundId}/context-chat`, { token, body: { history: [...history] } });
    if (r?.refused) return `REFUSED ${r.refused}: ${r.message}`;
    const reply = String(r?.reply ?? r?.message ?? '');
    let out = reply;
    if (r?.proposal?.say) {
      const c = await http(`/grounds/${groundId}/context-chat/confirm`, { token, body: { said, history: [...history] } });
      out += `\n      [said back] ${r.proposal.say}\n      [after yes] ${c?.refused ? `REFUSED ${c.refused}: ${c.message}` : (c?.say ?? 'saved')}`;
    }
    if (reply) history.push({ role: 'assistant', content: reply });
    return out;
  };
}

function askDoor(groundId: string, token: string): Door {
  const text = (r: any) => (r?.blocks ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.body).join(' ');
  return async (said: string) => {
    const r = await http('/ask', { token, body: { message: said, groundId, openedFrom: 'check_in_setup' } });
    if (r?.refused) return `REFUSED ${r.refused}: ${r.message}`;
    let out = text(r);
    const p = (r?.blocks ?? []).find((b: any) => b.type === 'proposal');
    if (p) {
      const y = await http('/ask/answer', { token, body: { proposalId: p.proposalId, answer: 'yes' } });
      out += `\n      [said back] ${p.summary}\n      [after yes] ${y?.refused ? `REFUSED ${y.refused}: ${y.message}` : text(y)}`;
    }
    return out;
  };
}

async function saved(groundId: string, benId: string) {
  const [notes, targets, personObjectives, lines, baselines, participant] = await Promise.all([
    prisma.leadContextNote.findMany({ where: { groundId }, select: { text: true, audience: true, participantId: true } }),
    prisma.groundObjective.findMany({ where: { groundId } }),
    /**
     * THE LEAD'S EXPECTATIONS OF A NAMED PERSON. `GroundObjective` (above, "team targets and
     * measures") is a different table - one row for the whole check-in, no author, no seen-state.
     * `PersonObjective` is the one item 11's fix actually writes to: `authoredBy` says who wrote it
     * ('lead-setup' for a setup expectation) and `seenBySubject` is the flag every explanation reads
     * to refuse pressing anybody about something nobody showed them. This script used to read
     * GroundObjective for this row and print fields (authoredBy, seenBySubject) that table does not
     * have at all - always undefined, so a wired write looked identical to a silently-failed one.
     */
    prisma.personObjective.findMany({
      where: { groundId },
      select: { text: true, participantId: true, authoredBy: true, seenBySubject: true, createdAt: true },
    }),
    prisma.groundContextItem.findMany({ where: { groundId }, select: { kind: true, text: true, audience: true } }),
    prisma.groundBaseline.findMany({ where: { groundId }, orderBy: { version: 'asc' }, select: { version: true, successLooksLike: true, changeReason: true } }),
    prisma.groundParticipant.findUnique({ where: { id: benId } }),
  ]);
  const show = (label: string, rows: any[]) => console.log(`    ${label}: ${rows.length ? '' : 'none'}${rows.map((r) => `\n      ${JSON.stringify(r).slice(0, 300)}`).join('')}`);
  /* Private notes, named as being about Ben or not - the private note about Ben (item 10's fix,
     kept LEAD_ONLY through addLeadContext) is exactly what this line is for. */
  show('private notes (LEAD_ONLY, never shown to the person they are about)', notes.map((n) => ({ ...n, aboutBen: n.participantId === benId, participantId: undefined })));
  show('team targets and measures (GroundObjective - for the whole check-in, not one person)', targets.map((o: any) => ({ name: o.name, target: o.target })));
  show("the lead's expectations of a named person (PersonObjective)", personObjectives.map((o) => ({
    text: o.text, forBen: o.participantId === benId, authoredBy: o.authoredBy, seenBySubject: o.seenBySubject,
  })));
  show('context lines', lines);
  show('what doing well looks like, every version', baselines);
  const expectations = Object.entries(participant ?? {}).filter(([k, v]) => /expect|objective|goal/i.test(k) && v);
  if (expectations.length) show("on Ben's own row", expectations.map(([k, v]) => ({ [k]: v })));
}

async function run(doorName: 'old context chat' | 'Ask Groundwork') {
  console.log(`\n==================== ${doorName.toUpperCase()} ====================`);
  const make = (g: string, t: string) => (doorName === 'old context chat' ? oldDoor(g, t) : askDoor(g, t));

  console.log('\n--- Item 15: a check-in that already holds its length and rhythm opens on what it holds');
  const a = await newCheckIn(`${doorName === 'old context chat' ? 'old' : 'ask'}15`, { timelineDays: 84, cadence: 'WEEKLY' });
  const d15 = make(a.groundId, a.token);
  console.log(`  Ada opens it and reads:\n      ${await d15('')}`);

  console.log('\n--- Item 10: the lead says somebody is struggling');
  const b = await newCheckIn(`${doorName === 'old context chat' ? 'old' : 'ask'}10`);
  const d10 = make(b.groundId, b.token);
  await d10('');
  console.log(`  Ada: "Ben is struggling and honestly he is difficult to work with."\n  Ada reads:\n      ${await d10('Ben is struggling and honestly he is difficult to work with.')}`);
  console.log(`  Ada: "He has missed the last two pipeline updates. I spoke to him once. I want the update in by every Friday."\n  Ada reads:\n      ${await d10('He has missed the last two pipeline updates. I spoke to him once. I want the update in by every Friday.')}`);
  console.log('  What was saved:');
  await saved(b.groundId, b.benId);

  console.log('\n--- Item 11: what the lead expects of a named person, and a wish with nothing checkable');
  const c = await newCheckIn(`${doorName === 'old context chat' ? 'old' : 'ask'}11`);
  const d11 = make(c.groundId, c.token);
  await d11('');
  console.log(`  Ada: "I expect Ben to close 3 renewals by the end of December."\n  Ada reads:\n      ${await d11('I expect Ben to close 3 renewals by the end of December.')}`);
  console.log(`  Ada: "Ben should be more proactive."\n  Ada reads:\n      ${await d11('Ben should be more proactive.')}`);
  console.log('  What was saved:');
  await saved(c.groundId, c.benId);

  console.log('\n--- Item 16: what doing well looks like, then restated with a reason');
  const e = await newCheckIn(`${doorName === 'old context chat' ? 'old' : 'ask'}16`, { timelineDays: 84, cadence: 'WEEKLY' });
  const d16 = make(e.groundId, e.token);
  await d16('');
  console.log(`  Ada: "Good means every pipeline stage has an owner and nothing sits unowned for more than two days."\n  Ada reads:\n      ${await d16('Good means every pipeline stage has an owner and nothing sits unowned for more than two days.')}`);
  console.log(`  Ada: "Change what good means: every stage has an owner and a next date, because the board kept going stale."\n  Ada reads:\n      ${await d16('Change what good means: every stage has an owner and a next date, because the board kept going stale.')}`);
  console.log('  What was saved:');
  await saved(e.groundId, e.benId);
}

(async () => {
  await run('old context chat');
  await run('Ask Groundwork');
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
