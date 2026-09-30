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
 *             POST :id/context, POST :id/lead-context, GET/POST :id/questions-for-people/:id/confirm
 *   GROUND B: Ask Groundwork - POST /ask, POST /ask/answer, on the person running ground B
 *
 * - and then compares, item by item, what actually landed in the database: the targets a paste set
 * (owner and number), the context lines it kept (text, kind, audience), the lead's private note, the
 * exact question confirmed for somebody, the document's visibility, and the check-in's
 * who-sees-targets setting. It prints one plain sentence per item, MATCH or MISMATCH, never a diff of
 * JSON.
 *
 * WHY IT READS THE DATABASE DIRECTLY FOR THE COMPARISON, rather than the API's own GET routes: a
 * response the API happens to render the same way on both grounds could still be backed by two
 * different rows underneath (a wrong `audience`, an extra target). Reading the raw table is a
 * stricter check than reading it served, so this reads Prisma directly for the comparison half - the
 * SETUP half still goes entirely through the real HTTP routes, the same way a lead or Ask Groundwork
 * actually reaches them.
 *
 * SAFE TO RUN, AND ONLY LOCALLY. Refuses any DATABASE_URL that is not on this machine, and any API
 * base that is not localhost/127.0.0.1. Creates a brand new organisation, lead and two colleagues
 * each run - nothing pre-existing is read or touched.
 *
 * NOT RUN AS PART OF THIS PIECE: the local API this checkout would hit is busy running a scenario
 * suite. Run it once that finishes:
 *
 *   DATABASE_URL=postgresql://localhost/<the local test db> API=http://localhost:3000/api/v1 \
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
  if (!res.ok) throw new Error(`${res.status} ${o.method ?? 'GET'} ${path} :: ${JSON.stringify(json)?.slice(0, 500)}`);
  return json && typeof json === 'object' && 'success' in json && 'data' in json ? json.data : json;
}

/** A yes to whatever proposal block a reply carries, if it carries one. Returns the reply unchanged if not. */
function proposalIn(reply: any): string | null {
  const block = (reply?.blocks ?? []).find((b: any) => b?.type === 'proposal');
  return block?.proposalId ?? null;
}

const stamp = Date.now();
const PASTE = [
  'Quick update on where things stand. Ben owns the Lagos account and the pitch is our biggest open',
  'item this quarter - Q4 sales target for Ben is 45,000,000. Ask Ben: how is the Lagos pitch going?',
  'We have not yet settled who owns the marketing budget for next quarter, and that needs deciding',
  'before we can plan the launch properly. Separately, the team has agreed we will focus on retention',
  'over new logos for the rest of the year.',
].join(' ');

interface OneGroundResult {
  groundId: string;
  targets: { participantId: string | null; name: string; target: number | null }[];
  contextLines: { kind: string; text: string; audience: string }[];
  leadNotes: { participantId: string | null; text: string; audience: string }[];
  confirmedQuestion: { who: string; exactQuestion: string } | null;
  documentVisibility: string | null;
  whoSeesTargets: string;
}

async function readGround(groundId: string): Promise<OneGroundResult> {
  const [ground, objectives, lines, notes, docs, participants] = await Promise.all([
    prisma.ground.findUnique({ where: { id: groundId }, select: { whoSeesTargets: true } }),
    prisma.groundObjective.findMany({ where: { groundId }, select: { ownerParticipantId: true, name: true, target: true } }),
    (prisma as any).groundContextItem.findMany({ where: { groundId }, select: { kind: true, text: true, audience: true, aboutParticipantId: true, exactQuestion: true, questionConfirmedAt: true } }),
    (prisma as any).leadContextNote.findMany({ where: { groundId }, select: { participantId: true, text: true, audience: true } }),
    (prisma as any).groundDocument.findMany({ where: { groundId }, select: { visibility: true }, orderBy: { createdAt: 'asc' } }).catch(() => []),
    prisma.groundParticipant.findMany({ where: { groundId }, select: { id: true, nameGiven: true, user: { select: { firstName: true, lastName: true } } } }),
  ]);
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const p = participants.find((x) => x.id === id) as any;
    return p ? (p.user?.firstName ?? p.nameGiven ?? 'somebody') : null;
  };
  const confirmed = (lines as any[]).find((l) => l.kind === 'QUESTION_FOR_PERSON' && l.questionConfirmedAt);
  return {
    groundId,
    targets: objectives.map((o) => ({ participantId: o.ownerParticipantId, name: o.name, target: o.target })),
    contextLines: (lines as any[])
      .filter((l) => l.kind !== 'QUESTION_FOR_PERSON')
      .map((l) => ({ kind: l.kind, text: l.text, audience: l.audience })),
    leadNotes: (notes as any[]).map((n) => ({ participantId: n.participantId, text: n.text, audience: n.audience })),
    confirmedQuestion: confirmed ? { who: nameOf(confirmed.aboutParticipantId) ?? 'somebody', exactQuestion: confirmed.exactQuestion } : null,
    documentVisibility: (docs as any[])[0]?.visibility ?? null,
    whoSeesTargets: (ground as any)?.whoSeesTargets ?? 'THEIR_OWN',
  };
}

/** One fresh organisation, one lead, one colleague (Ben), both signed in. Returns tokens by first name. */
async function newOrgWithLeadAndBen(label: string) {
  const org = await prisma.organization.create({ data: { name: `${label} ${stamp}`, slug: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp}`, email: `lead.${label}.${stamp}@equiv.test` } });
  await prisma.user.create({
    data: {
      email: `lead.${label}.${stamp}@equiv.test`, organizationId: org.id,
      firstName: 'Ada', lastName: 'Lead', passwordHash: await bcrypt.hash(PW, 10), isEmailVerified: true, role: 'ADMIN',
    },
  });
  const leadToken = (await http('/auth/login', { body: { email: `lead.${label}.${stamp}@equiv.test`, password: PW } })).accessToken;

  const ground = await http('/grounds', {
    token: leadToken,
    body: { label: `${label} check-in`, scenario: 'OKR_ALIGNMENT', timelineDays: 30, cadence: 'WEEKLY', workingDays: [1, 2, 3, 4, 5], brief: 'A short setup for the equivalence check.' },
  });
  const benEmail = `ben.${label}.${stamp}@equiv.test`;
  await http(`/grounds/${ground.id}/participants`, { token: leadToken, body: { email: benEmail, roleAsDescribed: 'Sales' } });
  const benRow = await prisma.groundParticipant.findFirst({ where: { groundId: ground.id, email: benEmail } });
  if (benRow?.inviteToken) {
    await http('/participants/accept', { body: { token: benRow.inviteToken, firstName: 'Ben', lastName: 'Okafor' } }).catch(() => undefined);
  }
  return { orgId: org.id, groundId: ground.id, leadToken, leadUserId: (await prisma.user.findUnique({ where: { email: `lead.${label}.${stamp}@equiv.test` } }))!.id };
}

/** Ground A: every write through the old, separate routes. */
async function throughTheOldRoutes(): Promise<string> {
  const { groundId, leadToken } = await newOrgWithLeadAndBen('OldRoutes');

  /* Item 1: the setup conversation itself, one message answering both gaps at once. */
  const said1 = 'This runs for twelve weeks, checking in weekly.';
  await http(`/grounds/${groundId}/context-chat`, { token: leadToken, body: { history: [{ role: 'user', content: said1 }] } });
  await http(`/grounds/${groundId}/context-chat/confirm`, { token: leadToken, body: { said: said1, history: [{ role: 'user', content: said1 }] } });

  /* Items 4 and 6: a paste, read once, confirmed once. */
  await http(`/grounds/${groundId}/context-chat`, { token: leadToken, body: { history: [{ role: 'user', content: PASTE }] } });
  await http(`/grounds/${groundId}/context-chat/confirm`, { token: leadToken, body: { said: PASTE, history: [{ role: 'user', content: PASTE }] } });

  /* Item 17: a context line, typed straight in. */
  await http(`/grounds/${groundId}/context`, { token: leadToken, body: { kind: 'DECISION', text: 'we will drop the small clients pilot' } });

  /* Item 9: a private note. */
  await http(`/grounds/${groundId}/lead-context`, { token: leadToken, body: { text: "keep an eye on Ben's workload this month", audience: 'LEAD_ONLY' } });

  /* Item 8: confirm Ben's question, as shown. */
  const questions = await http(`/grounds/${groundId}/questions-for-people`, { token: leadToken });
  const waiting = (questions as any[]).find((q) => q.status === 'waiting');
  if (waiting) await http(`/grounds/${groundId}/questions-for-people/${waiting.id}/confirm`, { token: leadToken, body: {} });

  /* A document, the same file both grounds get. */
  const form = new FormData();
  form.append('file', new Blob(['Q4 sales targets. Ben: 45,000,000.'], { type: 'text/plain' }), 'targets.txt');
  form.append('consentConfirmed', 'true');
  await http(`/grounds/${groundId}/documents`, { token: leadToken, form });

  return groundId;
}

/** Ground B: every write through Ask Groundwork, one chat, one lead. */
async function throughAskGroundwork(): Promise<string> {
  const { groundId, leadToken } = await newOrgWithLeadAndBen('AskGW');

  const ask = async (message: string) => http('/ask', { token: leadToken, body: { message, groundId } });
  const yes = async (proposalId: string) => http('/ask/answer', { token: leadToken, body: { proposalId, answer: 'yes' } });

  /* Item 1, through add_context. */
  const r1 = await ask('the context for our check-in: this runs for twelve weeks, checking in weekly');
  const p1 = proposalIn(r1);
  if (p1) await yes(p1);

  /* Items 4 and 6, the same paste, through add_context. */
  const r2 = await ask(`add this as context: ${PASTE}`);
  const p2 = proposalIn(r2);
  if (p2) await yes(p2);

  /* Item 17, through the context_line lane. */
  const r3 = await ask('decision: we will drop the small clients pilot');
  const p3 = proposalIn(r3);
  if (p3) await yes(p3);

  /* Item 9, through the lead_note lane. */
  const r4 = await ask("private note: keep an eye on Ben's workload this month");
  const p4 = proposalIn(r4);
  if (p4) await yes(p4);

  /* Item 8, through the questions_for_people lane, confirming as shown. */
  const r5 = await ask('confirm the question for Ben');
  const p5 = proposalIn(r5);
  if (p5) await yes(p5);

  /* The same document, through the ordinary upload route - Ask Groundwork does not upload files. */
  const form = new FormData();
  form.append('file', new Blob(['Q4 sales targets. Ben: 45,000,000.'], { type: 'text/plain' }), 'targets.txt');
  form.append('consentConfirmed', 'true');
  await http(`/grounds/${groundId}/documents`, { token: leadToken, form });

  return groundId;
}

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

(async () => {
  console.log('Creating ground A (the old routes) ...');
  const groundA = await throughTheOldRoutes();
  console.log('Creating ground B (Ask Groundwork) ...');
  const groundB = await throughAskGroundwork();

  const a = await readGround(groundA);
  const b = await readGround(groundB);

  console.log(`\nGround A (old routes):      ${groundA}`);
  console.log(`Ground B (Ask Groundwork):  ${groundB}\n`);

  const checks: { label: string; result: { match: boolean; say: string } }[] = [
    {
      label: 'Targets set for a named person (owner, number)',
      result: sameRows(a.targets, b.targets, (t) => `${t.participantId ? 'for a named person' : 'for the whole check-in'} "${t.name}" = ${t.target ?? '(no number)'}`),
    },
    {
      label: 'Context lines (kind, text, audience)',
      result: sameRows(a.contextLines, b.contextLines, (l) => `${l.kind}: "${l.text}" (${l.audience})`),
    },
    {
      label: "The lead's private notes (about whom, and audience)",
      result: sameRows(a.leadNotes, b.leadNotes, (n) => `"${n.text}" (${n.audience}${n.participantId ? ', about somebody named' : ', about the whole check-in'})`),
    },
    {
      label: "Ben's confirmed exact question",
      result: {
        match: JSON.stringify(a.confirmedQuestion) === JSON.stringify(b.confirmedQuestion),
        say: JSON.stringify(a.confirmedQuestion) === JSON.stringify(b.confirmedQuestion)
          ? `MATCH: ${a.confirmedQuestion ? `"${a.confirmedQuestion.exactQuestion}"` : '(nothing confirmed)'}`
          : `MISMATCH.\n    old route:      ${a.confirmedQuestion ? JSON.stringify(a.confirmedQuestion) : '(nothing confirmed)'}\n    ask groundwork: ${b.confirmedQuestion ? JSON.stringify(b.confirmedQuestion) : '(nothing confirmed)'}`,
      },
    },
    {
      label: "The document's visibility",
      result: {
        match: a.documentVisibility === b.documentVisibility,
        say: a.documentVisibility === b.documentVisibility
          ? `MATCH: both ${a.documentVisibility ?? '(no document found)'}`
          : `MISMATCH. old route: ${a.documentVisibility}; ask groundwork: ${b.documentVisibility}`,
      },
    },
    {
      label: 'Who sees targets on the check-in',
      result: {
        match: a.whoSeesTargets === b.whoSeesTargets,
        say: a.whoSeesTargets === b.whoSeesTargets ? `MATCH: both ${a.whoSeesTargets}` : `MISMATCH. old route: ${a.whoSeesTargets}; ask groundwork: ${b.whoSeesTargets}`,
      },
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
