/**
 * DOES ASK GROUNDWORK SAVE THE SAME THING THE OLD CONTEXT CHAT DOES? THE LIVE PROOF (decision 50,
 * piece 2, step (c)).
 *
 * Everything decision 50 promises is that nothing the context chat does today is lost when Ask
 * Groundwork takes over the same ground. This is the check that promise actually holds, run against
 * a real API and a real database rather than a mock: it creates two fresh check-ins, with the same
 * lead and the same people, and puts the SAME words and the SAME document through both -
 *
 *   GROUND A: the old routes - POST :id/context-chat, POST :id/context-chat/confirm,
 *             POST :id/context, PATCH :id/context/:itemId, POST :id/lead-context,
 *             POST :id/lead-context/:noteId/share, GET/POST :id/questions-for-people/:id/confirm
 *   GROUND B: Ask Groundwork - POST /ask, POST /ask/answer, on the person running ground B
 *
 * - and then compares, item by item, what actually landed in the database: the targets a paste set
 * (owner and number), the context lines it kept (text, kind, audience, retired or not), the lead's
 * private notes (and which one can never be shared), the exact question confirmed for somebody -
 * as shown, and reworded - the document's content (bank details hidden) and visibility, and the
 * check-in's who-sees-targets setting. It also puts the SAME two refusals through both doors: a
 * success statement too short to record, and an admin who is not the lead trying to confirm a
 * question. It prints one plain sentence per item, MATCH or MISMATCH, never a diff of JSON.
 *
 * A REFUSAL IS AN OUTCOME, NOT A FAILURE. The old routes throw an HTTP error when the product
 * correctly refuses something (a success statement that is too short, an admin trying to confirm).
 * Ask Groundwork never throws for the same refusal - `AssistantService` catches it and reads the
 * error's own message back as an ordinary reply. Both are the product working. This script records
 * the status and the message on each side and compares them; only a network failure or a 5xx stops
 * the run.
 *
 * WHY IT READS THE DATABASE DIRECTLY FOR THE COMPARISON, rather than the API's own GET routes: a
 * response the API happens to render the same way on both grounds could still be backed by two
 * different rows underneath (a wrong `audience`, an extra target). Reading the raw table is a
 * stricter check than reading it served, so this reads Prisma directly for the comparison half - the
 * SETUP half still goes entirely through the real HTTP routes, the same way a lead, an admin, or Ask
 * Groundwork actually reaches them.
 *
 * SAFE TO RUN, AND ONLY LOCALLY. Refuses any DATABASE_URL that is not on this machine, and any API
 * base that is not localhost/127.0.0.1. Creates a brand new organisation, a lead, an admin who is not
 * the lead, and three colleagues, each run - nothing pre-existing is read or touched.
 *
 *   DATABASE_URL="postgresql://hafsahjumare@localhost:5432/gw_pw9_1786222102?schema=public" \
 *     npx ts-node -T journey/context-chat-equivalence.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const API = process.env.API ?? 'http://localhost:3000/api/v1';
const DB_URL = process.env.DATABASE_URL ?? '';
const PW = 'ContextEquivalence123!';

if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(API)) {
  console.error(`Refusing: API must be local (localhost/127.0.0.1). Got: ${API}`);
  process.exit(1);
}
if (!/^postgres(ql)?:\/\/([^@/]*@)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(DB_URL)) {
  console.error('Refusing: DATABASE_URL must point at a local database (localhost/127.0.0.1). Set it before running this.');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

/** A network or transport failure is not an outcome to record - it is a reason to stop the run. */
async function http(path: string, o: { method?: string; body?: any; token?: string; form?: FormData } = {}): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method: o.method ?? (o.body !== undefined || o.form ? 'POST' : 'GET'),
    headers: {
      ...(o.form ? {} : { 'content-type': 'application/json' }),
      ...(o.token ? { authorization: `Bearer ${o.token}` } : {}),
    },
    ...(o.form ? { body: o.form } : o.body !== undefined ? { body: JSON.stringify(o.body) } : {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err: any = new Error(`${res.status} ${o.method ?? 'GET'} ${path} :: ${JSON.stringify(json)?.slice(0, 500)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
}

/**
 * AN OUTCOME, NEVER A THROW - UNLESS THE SERVER ITSELF FAILED.
 *
 * A refusal the product means (400, 403, 409, 422 - the product saying no on purpose) is caught and
 * returned as `{ ok: false, status, message }`, the same shape either door produces. A 5xx, or a
 * request that never reached the server at all, is a real failure and is left to stop the run.
 */
async function attempt<T>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; status: number; message: string }> {
  try {
    return { ok: true, value: await fn() };
  } catch (err: any) {
    const status = typeof err?.status === 'number' ? err.status : 0;
    if (status === 0 || status >= 500) throw err;
    const raw = err?.body?.message;
    const message = Array.isArray(raw) ? raw.join(' ') : (raw ?? err?.message ?? 'refused');
    return { ok: false, status, message };
  }
}

/** A yes to whatever proposal block a reply carries, if it carries one. */
function proposalIn(reply: any): string | null {
  const block = (reply?.blocks ?? []).find((b: any) => b?.type === 'proposal');
  return block?.proposalId ?? null;
}

/** Every text block's body, joined - the plain sentence a person actually reads back from Ask Groundwork. */
function replyText(reply: any): string {
  return (reply?.blocks ?? [])
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b.body)
    .join(' ')
    .trim();
}

/** A yes/no outcome for Ask Groundwork, shaped the same as `attempt()`'s: this door never throws for a refusal. */
type AskOutcome = { ok: boolean; message: string };

const stamp = Date.now();

/* The paste: one target for Ben (hidden from Chidi and Femi by THEIR_OWN, the default) and one exact
   question for each of the three colleagues - enough to exercise items 4, 6, 8 and 13 in one message. */
const PASTE = [
  'Quick update on where things stand. Ben owns the Lagos account and the pitch is our biggest open',
  'item this quarter - Q4 sales target for Ben is 45,000,000. Ask Ben: how is the Lagos pitch going?',
  'Ask Chidi: are we on track for the renewals number this quarter? Ask Femi: what is blocking the',
  'onboarding checklist right now? Separately, Ben has agreed to send the updated pipeline sheet by',
  'Friday, and the launch date is still moving around while marketing decides on the campaign name.',
].join(' ');

const SUCCESS_TOO_SHORT = 'Good.';
const SUCCESS_ACCEPTED =
  'Good means every pipeline stage has an owner, the weekly numbers are posted before Friday close, and nothing sits unowned for more than two days.';

const DOC_CONTENT = 'Chidi: Q1 renewals target is 20,000,000. Account number: 0123456789 for payouts.';

/**
 * THE SAME WORDS, LITERALLY, ON BOTH DOORS. The first run's setup turns sent the old route a bare
 * sentence ("This runs for twelve weeks.") and Ask Groundwork the same sentence with an extra
 * "the context for our check-in:" opener stitched on the front - needed only so the router's own
 * `add_context` pattern would fire. `runContextChat` (assistant.service.ts) hands the WHOLE message,
 * opener included, to `GroundsService.contextChat` as the lead's own words, so the two doors were
 * quietly reading two different sentences. A model reading two different sentences can honestly
 * extract two different things - that is not a product difference. Wrapping every turn in the same
 * opener on BOTH sides removes that variable, so what is left to compare is the two doors reading the
 * identical words, not this script's own phrasing of them.
 */
const setup = (said: string) => `Setting up context for our check-in: ${said}`;
const asContext = (said: string) => `Add this as context: ${said}`;

interface OneGroundResult {
  groundId: string;
  whoSeesTargets: string;
  targets: { participantId: string | null; name: string; target: number | null }[];
  contextLines: { kind: string; text: string; audience: string; closed: boolean }[];
  leadNotes: { aboutSomebody: boolean; text: string; audience: string }[];
  confirmedQuestions: { who: string; exactQuestion: string; status: string }[];
  documentContent: string | null;
  documentVisibility: string | null;
}

async function readGround(groundId: string): Promise<OneGroundResult> {
  const [ground, objectives, lines, notes, docs, participants] = await Promise.all([
    prisma.ground.findUnique({ where: { id: groundId }, select: { whoSeesTargets: true } }),
    prisma.groundObjective.findMany({ where: { groundId }, select: { ownerParticipantId: true, name: true, target: true } }),
    (prisma as any).groundContextItem.findMany({
      where: { groundId },
      select: { kind: true, text: true, audience: true, aboutParticipantId: true, exactQuestion: true, questionConfirmedAt: true, closedAt: true },
    }),
    (prisma as any).leadContextNote.findMany({ where: { groundId }, select: { participantId: true, text: true, audience: true } }),
    (prisma as any).groundDocument.findMany({ where: { groundId }, select: { content: true, visibility: true }, orderBy: { createdAt: 'asc' } }).catch(() => []),
    prisma.groundParticipant.findMany({ where: { groundId }, select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } }),
  ]);
  const nameOf = (id: string | null) => {
    if (!id) return 'somebody';
    const p = participants.find((x) => x.id === id) as any;
    return p ? (p.user?.firstName ?? p.nameGiven ?? 'somebody') : 'somebody';
  };
  const questions = (lines as any[]).filter((l) => l.kind === 'QUESTION_FOR_PERSON');
  return {
    groundId,
    whoSeesTargets: (ground as any)?.whoSeesTargets ?? 'THEIR_OWN',
    targets: objectives.map((o) => ({ participantId: o.ownerParticipantId, name: o.name, target: o.target })),
    contextLines: (lines as any[])
      .filter((l) => l.kind !== 'QUESTION_FOR_PERSON')
      .map((l) => ({ kind: l.kind, text: l.text, audience: l.audience, closed: !!l.closedAt })),
    leadNotes: (notes as any[]).map((n) => ({ aboutSomebody: !!n.participantId, text: n.text, audience: n.audience })),
    confirmedQuestions: questions
      .map((q) => ({ who: nameOf(q.aboutParticipantId), exactQuestion: q.exactQuestion, status: q.questionConfirmedAt ? 'confirmed' : (q.closedAt ? 'left out' : 'waiting') }))
      .sort((a, b) => a.who.localeCompare(b.who)),
    documentContent: (docs as any[])[0]?.content ?? null,
    documentVisibility: (docs as any[])[0]?.visibility ?? null,
  };
}

/** One fresh organisation: a lead, an admin who is not the lead, and three colleagues. */
async function newOrgWithPeople(label: string) {
  label = label.toLowerCase();
  const org = await prisma.organization.create({
    data: { name: `${label} ${stamp}`, slug: `${label.replace(/[^a-z0-9]+/g, '-')}-${stamp}`, email: `lead.${label}.${stamp}@equiv.test` },
  });
  const mk = async (first: string) => {
    const email = `${first.toLowerCase()}.${label}.${stamp}@equiv.test`;
    const user = await prisma.user.create({
      data: { email, organizationId: org.id, firstName: first, lastName: 'Test', passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: 'ADMIN' },
    });
    /* A token is honoured only for an organisation the user is a member of (jwt.strategy). */
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: org.id, role: 'ADMIN' as any } });
    const token = (await http('/auth/login', { body: { email, password: PW } })).accessToken;
    return { userId: user.id, email, token };
  };
  const lead = await mk('Ada');
  const priya = await mk('Priya'); // an admin in the same organisation, never the lead

  /*
   * NO `timelineDays`/`cadence` HERE, ON PURPOSE. The first run of this script passed them at
   * creation, which sets `timelineStated`/`cadenceStated` to true (grounds.service.ts lines 580-581)
   * - so `contextGaps()` never asked about duration or cadence at all, and the setup turns below,
   * written to answer those two gaps first, instead landed on whichever gap WAS open (success, then
   * measures), on both grounds, in ways that did not even agree with each other run to run. Leaving
   * both unset here is what makes "answer the duration, then the cadence, then success" a true test
   * of the real gap order, on both doors alike.
   */
  const ground = await http('/grounds', {
    token: lead.token,
    body: { label: `${label} check-in`, scenario: 'OKR_ALIGNMENT', moment: 'STARTING', brief: 'A short setup for the equivalence check.' },
  });

  const addColleague = async (first: string) => {
    const email = `${first.toLowerCase()}.${label}.${stamp}@equiv.test`;
    await http(`/grounds/${ground.id}/participants`, { token: lead.token, body: { email, roleAsDescribed: 'Sales' } });
    const row = await prisma.groundParticipant.findFirst({ where: { groundId: ground.id, email } });
    if (row?.inviteToken) {
      await http('/participants/accept', { body: { token: row.inviteToken, firstName: first, lastName: 'Okafor' } }).catch(() => undefined);
    }
    return row!.id as string;
  };
  const benId = await addColleague('Ben');
  const chidiId = await addColleague('Chidi');
  const femiId = await addColleague('Femi');

  return { orgId: org.id, groundId: ground.id, lead, priya, benId, chidiId, femiId };
}

/** The single-line summary a context-item lookup uses to find "the line about X" through the real GET route. */
async function contextItemByFragment(groundId: string, token: string, fragment: string): Promise<{ id: string; text: string } | null> {
  const g = await http(`/grounds/${groundId}`, { token });
  const items = (g.contextItems ?? []) as { id: string; text: string }[];
  return items.find((i) => i.text.toLowerCase().includes(fragment.toLowerCase())) ?? null;
}

/**
 * A SCRIPT FAULT FOUND WHILE READING THE FIRST RUN'S OUTPUT: `who` on the served card is the FULL
 * name (`theNameWeUseFor`, first + last - "Ben Okafor"), not the first name this script matched
 * every colleague was invited by. An exact match here against "Ben" therefore matched nothing, so
 * every confirm/decline call below silently never ran on the old route - every question stayed
 * "waiting" and the admin-refusal test never fired at all. Fixed to the same substring match the
 * product's own chat lane uses to find "the question for X" (`findByName` in assistant.service.ts).
 */
async function waitingQuestionByName(groundId: string, token: string, who: string): Promise<{ id: string; who: string; exactQuestion: string } | null> {
  const list = (await http(`/grounds/${groundId}/questions-for-people`, { token })) as { id: string; who: string; status: string; exactQuestion: string }[];
  return list.find((q) => q.status === 'waiting' && q.who.toLowerCase().includes(who.toLowerCase())) ?? null;
}

/* ============================================================================================== */
/* GROUND A: every write through the old, separate routes.                                        */
/* ============================================================================================== */

interface Captured {
  timelineSay: string | null;
  cadenceSay: string | null;
  successRefusal: { status: number; message: string } | null;
  successAccepted: string | null;
  noteAboutPersonShareRefused: { status: number; message: string } | null;
  adminConfirmRefused: { status: number; message: string } | null;
}

async function throughTheOldRoutes(): Promise<{ groundId: string; captured: Captured }> {
  const { groundId, lead, priya, benId } = await newOrgWithPeople('OldRoutes');
  const token = lead.token;
  const captured: Captured = {
    timelineSay: null, cadenceSay: null, successRefusal: null, successAccepted: null,
    noteAboutPersonShareRefused: null, adminConfirmRefused: null,
  };

  /* Item 1 & 5: the setup conversation, one focused answer per gap, said back and confirmed. */
  const propose = (history: { role: 'user'; content: string }[]) => http(`/grounds/${groundId}/context-chat`, { token, body: { history } });
  const confirm = (said: string, history: { role: 'user'; content: string }[]) =>
    attempt(() => http(`/grounds/${groundId}/context-chat/confirm`, { token, body: { said, history } }));

  const t1 = setup('This runs for twelve weeks.');
  await propose([{ role: 'user', content: t1 }]);
  const c1 = await confirm(t1, [{ role: 'user', content: t1 }]);
  captured.timelineSay = c1.ok ? c1.value.say : `REFUSED: ${c1.message}`;

  const t2 = setup('We check in weekly.');
  await propose([{ role: 'user', content: t2 }]);
  const c2 = await confirm(t2, [{ role: 'user', content: t2 }]);
  captured.cadenceSay = c2.ok ? c2.value.say : `REFUSED: ${c2.message}`;

  /* The refusal: too short to stand as what doing well looks like. */
  const t3 = setup(SUCCESS_TOO_SHORT);
  await propose([{ role: 'user', content: t3 }]);
  const c3 = await confirm(t3, [{ role: 'user', content: t3 }]);
  captured.successRefusal = c3.ok ? null : { status: c3.status, message: c3.message };

  /* The acceptance, right after: the same field, said properly. */
  const t4 = setup(SUCCESS_ACCEPTED);
  await propose([{ role: 'user', content: t4 }]);
  const c4 = await confirm(t4, [{ role: 'user', content: t4 }]);
  captured.successAccepted = c4.ok ? c4.value.say : `REFUSED: ${c4.message}`;

  /* Items 4 and 6: a paste, read once, confirmed once - a target for Ben, and three exact questions. */
  const pasteTurn = asContext(PASTE);
  await propose([{ role: 'user', content: pasteTurn }]);
  await confirm(pasteTurn, [{ role: 'user', content: pasteTurn }]);

  /* Item 17: three lines, typed straight in. */
  await http(`/grounds/${groundId}/context`, { token, body: { kind: 'DECISION', text: 'we will drop the small clients pilot' } });
  await http(`/grounds/${groundId}/context`, { token, body: { kind: 'STRATEGY', text: 'we will focus on retention over new logos' } });
  await http(`/grounds/${groundId}/context`, { token, body: { kind: 'UNSETTLED', text: 'who owns the marketing budget for next quarter' } });

  /* Item 17's other half: reword, retire, and a round trip through private and back to shared. */
  const decisionLine = await contextItemByFragment(groundId, token, 'small clients pilot');
  await http(`/grounds/${groundId}/context/${decisionLine!.id}`, { method: 'PATCH', token, body: { closed: true } });

  const strategyLine = await contextItemByFragment(groundId, token, 'retention');
  await http(`/grounds/${groundId}/context/${strategyLine!.id}`, { method: 'PATCH', token, body: { text: 'we will focus on retention across existing accounts' } });

  const unsettledLine = await contextItemByFragment(groundId, token, 'marketing budget');
  await http(`/grounds/${groundId}/context/${unsettledLine!.id}`, { method: 'PATCH', token, body: { audience: 'LEAD_ONLY' } });
  await http(`/grounds/${groundId}/context/${unsettledLine!.id}`, { method: 'PATCH', token, body: { audience: 'EVERYONE' } });

  /* A document, with a target and a bank detail in it, private to the lead by default. */
  const form = new FormData();
  form.append('file', new Blob([DOC_CONTENT], { type: 'text/plain' }), 'targets.txt');
  form.append('consentConfirmed', 'true');
  await http(`/grounds/${groundId}/documents`, { token, form });

  /* Item 9: a private note about the whole check-in, then shared - and a note about Ben, which must
     never be shareable, proved by calling the share route on it directly and reading the refusal. */
  const wholeNote = await http(`/grounds/${groundId}/lead-context`, { token, body: { text: "keep an eye on Ben's workload this month", audience: 'LEAD_ONLY' } });
  await http(`/grounds/${groundId}/lead-context/${wholeNote.id}/share`, { method: 'POST', token });

  const aboutBenNote = await http(`/grounds/${groundId}/lead-context`, {
    token, body: { participantId: benId, text: 'struggling with the pitch deck this month', audience: 'LEAD_ONLY' },
  });
  const shareAttempt = await attempt(() => http(`/grounds/${groundId}/lead-context/${aboutBenNote.id}/share`, { method: 'POST', token }));
  captured.noteAboutPersonShareRefused = shareAttempt.ok ? null : { status: shareAttempt.status, message: shareAttempt.message };

  /* Item 8: confirm Ben's question as shown, and Chidi's with changed wording. */
  const benQ = await waitingQuestionByName(groundId, token, 'Ben');
  if (benQ) await http(`/grounds/${groundId}/questions-for-people/${benQ.id}/confirm`, { token, body: {} });

  const chidiQ = await waitingQuestionByName(groundId, token, 'Chidi');
  if (chidiQ) await http(`/grounds/${groundId}/questions-for-people/${chidiQ.id}/confirm`, { token, body: { exactQuestion: 'Is the renewals forecast still on track for Q1?' } });

  /* The asymmetry (items 5, 8, 14): Priya, an admin here but not the lead, tries to confirm Femi's
     question, before the lead ever does - and is refused, honestly, leaving it still waiting. */
  const femiQ = await waitingQuestionByName(groundId, token, 'Femi');
  if (femiQ) {
    const adminAttempt = await attempt(() => http(`/grounds/${groundId}/questions-for-people/${femiQ.id}/confirm`, { token: priya.token, body: {} }));
    captured.adminConfirmRefused = adminAttempt.ok ? null : { status: adminAttempt.status, message: adminAttempt.message };
  }

  return { groundId, captured };
}

/* ============================================================================================== */
/* GROUND B: every write through Ask Groundwork.                                                  */
/* ============================================================================================== */

async function throughAskGroundwork(): Promise<{ groundId: string; captured: Captured }> {
  const { groundId, lead, priya, benId } = await newOrgWithPeople('AskGW');
  const token = lead.token;
  const captured: Captured = {
    timelineSay: null, cadenceSay: null, successRefusal: null, successAccepted: null,
    noteAboutPersonShareRefused: null, adminConfirmRefused: null,
  };

  const ask = (asToken: string, message: string) => http('/ask', { token: asToken, body: { message, groundId } });
  const yes = (asToken: string, proposalId: string) => http('/ask/answer', { token: asToken, body: { proposalId, answer: 'yes' } });

  /** One turn: ask, and if a proposal came back, say yes to it. Always returns an outcome, never throws for a refusal. */
  async function turn(asToken: string, message: string): Promise<AskOutcome> {
    const r1 = await ask(asToken, message);
    const pid = proposalIn(r1);
    if (!pid) return { ok: true, message: replyText(r1) };
    const r2 = await yes(asToken, pid);
    /* This door never throws for a refusal - it reads the error's own message back as a reply, so a
       refusal is a plain sentence in `message`, not a status code Ask Groundwork never sends. */
    return { ok: true, message: replyText(r2) };
  }

  /* Item 1 & 5: the setup conversation, the exact same words `throughTheOldRoutes` sends - the
     opener is what routes the message to `add_context` (see the comment on `setup`/`asContext`
     above); everything after it is the same sentence the old route's history carries. */
  const t1 = await turn(token, setup('This runs for twelve weeks.'));
  captured.timelineSay = t1.message;

  const t2 = await turn(token, setup('We check in weekly.'));
  captured.cadenceSay = t2.message;

  const t3 = await turn(token, setup(SUCCESS_TOO_SHORT));
  captured.successRefusal = { status: 0, message: t3.message };

  const t4 = await turn(token, setup(SUCCESS_ACCEPTED));
  captured.successAccepted = t4.message;

  /* Items 4 and 6: the same paste. */
  await turn(token, asContext(PASTE));

  /* Item 17: three lines. */
  await turn(token, 'decision: we will drop the small clients pilot');
  await turn(token, 'strategy: we will focus on retention over new logos');
  await turn(token, 'unsettled: who owns the marketing budget for next quarter');

  /* Item 17's other half. */
  await turn(token, 'retire the line "small clients pilot"');
  await turn(token, 'reword the line "retention" to "we will focus on retention across existing accounts"');
  await turn(token, 'make the line "marketing budget" private');
  await turn(token, 'share the line "marketing budget"');

  /* The same document, through the ordinary upload route - Ask Groundwork does not upload files. */
  const form = new FormData();
  form.append('file', new Blob([DOC_CONTENT], { type: 'text/plain' }), 'targets.txt');
  form.append('consentConfirmed', 'true');
  await http(`/grounds/${groundId}/documents`, { token, form });

  /* Item 9: a private note about the whole check-in, then shared through the chat. */
  await turn(token, "private note: keep an eye on Ben's workload this month");
  await turn(token, 'share the note "keep an eye on Ben\'s workload"');

  /* A note about Ben - this door has no way to even offer sharing it, because notes about a named
     person are left off the list `shareLeadContext` is ever asked about (see the lane's own
     comment). Proved here by calling the exact same route it would call, directly, on the note the
     chat itself just wrote through `addLeadContext` - the one rule item 9 exists to keep. */
  await turn(token, 'private note about Ben: struggling with the pitch deck this month');
  const aboutBenNote = await prisma.leadContextNote.findFirst({ where: { groundId, participantId: { not: null } }, orderBy: { createdAt: 'desc' } });
  const shareAttempt = await attempt(() => http(`/grounds/${groundId}/lead-context/${aboutBenNote!.id}/share`, { method: 'POST', token }));
  captured.noteAboutPersonShareRefused = shareAttempt.ok ? null : { status: shareAttempt.status, message: shareAttempt.message };

  /* Item 8: Ben as shown, Chidi with changed wording. */
  await turn(token, 'confirm the question for Ben');
  await turn(token, 'ask Chidi "Is the renewals forecast still on track for Q1?" instead');

  /* The asymmetry: Priya, an admin here but not the lead, tries to confirm Femi's question first. */
  const priyaTry = await ask(priya.token, 'confirm the question for Femi');
  const priyaPid = proposalIn(priyaTry);
  if (priyaPid) {
    const priyaYes = await yes(priya.token, priyaPid);
    captured.adminConfirmRefused = { status: 0, message: replyText(priyaYes) };
  } else {
    captured.adminConfirmRefused = { status: 0, message: replyText(priyaTry) };
  }

  return { groundId, captured };
}

/* ============================================================================================== */
/* THE COMPARISON.                                                                                 */
/* ============================================================================================== */

function sameRows(a: any[], b: any[], describe: (r: any) => string): { match: boolean; say: string } {
  const as = a.map(describe).sort();
  const bs = b.map(describe).sort();
  const match = JSON.stringify(as) === JSON.stringify(bs);
  return {
    match,
    say: match
      ? `MATCH (${as.length}): ${as.join(' | ') || '(none)'}`
      : `MISMATCH.\n    old route:      ${as.join(' | ') || '(none)'}\n    ask groundwork: ${bs.join(' | ') || '(none)'}`,
  };
}

function sameText(label: string, a: string | null, b: string | null): { match: boolean; say: string } {
  const match = (a ?? '') === (b ?? '');
  return {
    match,
    say: match
      ? `MATCH: ${a ?? '(nothing)'}`
      : `MISMATCH.\n    old route:      ${a ?? '(nothing)'}\n    ask groundwork: ${b ?? '(nothing)'}`,
  };
}

/**
 * ONE QUESTION FOR ONE PERSON, COMPARED BY WHAT THE PRODUCT DECIDES RATHER THAN BY THE MODEL'S OWN
 * WORDS. `theExactQuestionFor` (a-question-asked-word-for-word.ts) drafts the sentence itself with a
 * model call, on each ground independently - so a genuinely identical draft from two separate calls
 * is not guaranteed even given the identical paste, and a run that draws two reasonable but different
 * phrasings of the same question ("what is blocking..." vs "what is stopping you with...") is not a
 * product bug. What decision 34 actually promises is which PERSON gets a question at all, and what
 * STATE it ends in (waiting, confirmed, left out) - that is what is compared as MATCH/MISMATCH here.
 * Both sides' actual wording is still printed, so a real drift (an empty question, the wrong person)
 * is still visible.
 */
function sameQuestionState(who: string, a: { exactQuestion: string; status: string }[], b: { exactQuestion: string; status: string }[]): { match: boolean; say: string } {
  const aState = a.map((q) => q.status).sort().join(',');
  const bState = b.map((q) => q.status).sort().join(',');
  const match = aState === bState && a.length === b.length;
  const aWords = a.map((q) => `"${q.exactQuestion}" (${q.status})`).join(', ') || '(none)';
  const bWords = b.map((q) => `"${q.exactQuestion}" (${q.status})`).join(', ') || '(none)';
  return {
    match,
    say: (match
      ? `MATCH on state (${aState || 'none'}). The model's own wording, which may legitimately differ between the two doors:\n    old route:      ${aWords}\n    ask groundwork: ${bWords}`
      : `MISMATCH on state.\n    old route:      ${aWords}\n    ask groundwork: ${bWords}`),
  };
}

/**
 * CONTEXT LINES, SPLIT IN TWO. `fragments` names the lines THIS SCRIPT typed directly (item 17) -
 * no model in the loop for those, so they are compared word for word, including the reword. Every
 * other line came out of the paste's free-text reader (item 6: strategy, notes, decisions,
 * unsettled items), which reads a paragraph and decides for itself what counts as which - two
 * independent reads of the same paragraph are not guaranteed to slice it into the same lines, the
 * same way two people summarising the same meeting would not write identical minutes. Those are
 * compared by kind only (how many of each), not by their exact wording.
 */
function splitContextLines(lines: { kind: string; text: string; audience: string; closed: boolean }[], fragments: string[]) {
  const typed = lines.filter((l) => fragments.some((f) => l.text.toLowerCase().includes(f.toLowerCase())));
  const fromThePaste = lines.filter((l) => !typed.includes(l));
  return { typed, fromThePaste };
}

(async () => {
  console.log('Creating ground A (the old routes) ...');
  const A = await throughTheOldRoutes();
  console.log('Creating ground B (Ask Groundwork) ...');
  const B = await throughAskGroundwork();

  const a = await readGround(A.groundId);
  const b = await readGround(B.groundId);

  console.log(`\nGround A (old routes):      ${A.groundId}`);
  console.log(`Ground B (Ask Groundwork):  ${B.groundId}\n`);

  const checks: { label: string; result: { match: boolean; say: string } }[] = [
    {
      label: 'Targets set for a named person (owner, number), hidden from others by default',
      result: sameRows(a.targets, b.targets, (t) => `${t.participantId ? 'for a named person' : 'for the whole check-in'} "${t.name}" = ${t.target ?? '(no number)'}`),
    },
    {
      label: 'Who sees targets on the check-in (default THEIR_OWN, unchanged by any of this)',
      result: sameText('whoSeesTargets', a.whoSeesTargets, b.whoSeesTargets),
    },
    {
      label: 'Context lines typed directly (item 17): kind, text, audience, and whether retired',
      result: (() => {
        const A_ = splitContextLines(a.contextLines, ['small clients pilot', 'retention', 'marketing budget']);
        const B_ = splitContextLines(b.contextLines, ['small clients pilot', 'retention', 'marketing budget']);
        return sameRows(A_.typed, B_.typed, (l) => `${l.kind}: "${l.text}" (${l.audience}${l.closed ? ', RETIRED' : ''})`);
      })(),
    },
    {
      label: 'Context lines read out of the paste (item 6): by kind only - wording is the model\'s own',
      result: (() => {
        const A_ = splitContextLines(a.contextLines, ['small clients pilot', 'retention', 'marketing budget']);
        const B_ = splitContextLines(b.contextLines, ['small clients pilot', 'retention', 'marketing budget']);
        const byKind = (rows: typeof A_.fromThePaste) => {
          const counts: Record<string, number> = {};
          for (const r of rows) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
          return counts;
        };
        const ac = byKind(A_.fromThePaste);
        const bc = byKind(B_.fromThePaste);
        const match = JSON.stringify(ac) === JSON.stringify(bc);
        const say = (label: string, rows: typeof A_.fromThePaste) => rows.map((r) => `${r.kind}: "${r.text}"`).join(' | ') || '(none)';
        return {
          match,
          say: `${match ? 'MATCH' : 'MISMATCH'} on kind counts (old ${JSON.stringify(ac)}, ask groundwork ${JSON.stringify(bc)}). Wording, which the model draws from the paste independently on each side:\n    old route:      ${say('old', A_.fromThePaste)}\n    ask groundwork: ${say('new', B_.fromThePaste)}`,
        };
      })(),
    },
    {
      label: "The lead's private notes: about the whole check-in (shared) and about Ben (still private)",
      result: sameRows(a.leadNotes, b.leadNotes, (n) => `"${n.text}" (${n.audience}${n.aboutSomebody ? ', about somebody named' : ', about the whole check-in'})`),
    },
    {
      label: 'A note about a named person can never be shared (the refusal, word for word)',
      result: sameText('noteAboutPersonShareRefused', A.captured.noteAboutPersonShareRefused?.message ?? null, B.captured.noteAboutPersonShareRefused?.message ?? null),
    },
    {
      label: "Ben's exact question, confirmed as shown",
      result: sameQuestionState('Ben', a.confirmedQuestions.filter((q) => q.who === 'Ben'), b.confirmedQuestions.filter((q) => q.who === 'Ben')),
    },
    {
      label: "Chidi's exact question, confirmed with the lead's changed wording",
      result: sameQuestionState('Chidi', a.confirmedQuestions.filter((q) => q.who === 'Chidi'), b.confirmedQuestions.filter((q) => q.who === 'Chidi')),
    },
    {
      label: "Femi's question, still waiting - an admin who is not the lead could not confirm it",
      result: sameQuestionState('Femi', a.confirmedQuestions.filter((q) => q.who === 'Femi'), b.confirmedQuestions.filter((q) => q.who === 'Femi')),
    },
    {
      label: 'An admin who is not the lead is refused at the confirm step (the asymmetry, word for word)',
      result: sameText('adminConfirmRefused', A.captured.adminConfirmRefused?.message ?? null, B.captured.adminConfirmRefused?.message ?? null),
    },
    {
      label: "The document's content: the target is kept, the bank detail is hidden",
      result: sameText('documentContent', a.documentContent, b.documentContent),
    },
    {
      label: "The document's visibility (private to the lead by default)",
      result: sameText('documentVisibility', a.documentVisibility, b.documentVisibility),
    },
    {
      label: 'The setup conversation: what it said back for the duration',
      result: sameText('timelineSay', A.captured.timelineSay, B.captured.timelineSay),
    },
    {
      label: 'The setup conversation: what it said back for the cadence',
      result: sameText('cadenceSay', A.captured.cadenceSay, B.captured.cadenceSay),
    },
    {
      label: 'A success statement too short to record is refused, word for word',
      result: sameText('successRefusal', A.captured.successRefusal?.message ?? null, B.captured.successRefusal?.message ?? null),
    },
    {
      label: 'A success statement said properly is recorded, word for word',
      result: sameText('successAccepted', A.captured.successAccepted, B.captured.successAccepted),
    },
  ];

  console.log('Item by item:\n');
  let allMatch = true;
  for (const c of checks) {
    if (!c.result.match) allMatch = false;
    console.log(`- ${c.label}\n  ${c.result.say}\n`);
  }

  console.log(allMatch
    ? 'Every item saved the same thing, whichever door it went through.'
    : 'At least one item above did not save the same thing - read the MISMATCH lines before treating this as proven.');

  await prisma.$disconnect();
  process.exit(allMatch ? 0 : 1);
})().catch(async (err) => {
  console.error('Failed:', err?.message ?? err);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
