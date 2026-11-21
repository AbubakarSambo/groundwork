/**
 * THE LIFE OF THE YEAR-END DRAFT: draft, revised, approved, final (Fatima, increment 4; spec 14, 14.3, 30.4).
 *
 * ONE DRAFT, MANY VERSIONS. "Add March", "Shorten this" and "This is wrong: ..." revise the same draft, by chat, by a reply to the mail or
 * from a voice transcript (the words are the same once they are text). Each change is a new row, version 2, 3 and so on, whose parent is the
 * one before. A row is never rewritten once it is approved. A change made after an approval is a new version and needs its own approval.
 *
 * THE RULE ABOUT APPROVAL (it is about what is sent as final, so code holds it, not a model):
 *   - Only the principal's own word approves. Somebody she lets act for her may prepare and revise, never approve.
 *   - Only a version she has been sent can be approved, so "this is ready" can never approve something she has not been given.
 *   - Only the newest version can be approved, and only an approved version is sent as final.
 *   - The final files are written from the approved row as it was kept, never rebuilt, so what she approved is what goes.
 *
 * WHAT A CHANGE REACHES. The content is written once and every file reads it, so one change is in the report, the presentation, the
 * register and the evidence index together. "Shorten this" cuts only the report and the presentation; the register and the index are the
 * full lists and are never shortened.
 */
import { theQuestionsAsked } from '../executive-onboarding/information-gaps';
import { randomUUID } from 'crypto';
import { dayWords, MONTHS, monthWords, theMonthsWithANote, type AnEdit, type TheRecordForTheYear, type YearEndContent } from './the-year-end-content';
import { coverageOf } from '../outstanding/the-persistent-jobs';
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { writeItOnce } from './the-year-end-log';
import { buildTheContentWithTheNarrative, type TheNarrator } from './the-year-end-narrative';
import { theFilesSheKept, theMessagesSheKept, whatHerMaterialCovers } from '../executive-onboarding/the-months-a-document-covers';

export type TheStatus = 'draft' | 'revised' | 'approved' | 'final';
export interface TheDraftRow { id: string; organizationId: string; principalUserId: string; year: number; version: number; status: TheStatus; content: YearEndContent; parentId: string | null; approvedAt: Date | null; createdAt: Date }

/* ------------------------------------------------------------------ the record */

/** The record for one principal and one year. A delegate's reading, always: her own private to-do list never goes into a file that can be sent on. */
export async function loadTheRecord(prisma: any, a: { organizationId: string; principalUserId: string; now: Date }): Promise<TheRecordForTheYear> {
  const year = a.now.getUTCFullYear();
  const user: any = await prisma.user.findUnique({ where: { id: a.principalUserId }, select: { firstName: true, lastName: true } }).catch(() => null);
  const principalName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'the principal';
  const register = await buildTheRegister(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, forADelegate: true });
  const grounds: any[] = (await prisma.ground.findMany({ where: { organizationId: a.organizationId, initiatorId: a.principalUserId }, select: { id: true, label: true } })) ?? [];
  const ids = grounds.map((g) => g.id);
  const labelOf = new Map<string, string>(grounds.map((g) => [g.id, g.label]));
  const since = new Date(Date.UTC(year, 0, 1));
  const reports: any[] = ids.length ? (await prisma.report.findMany({ where: { groundId: { in: ids }, createdAt: { gte: since } }, select: { id: true, groundId: true, theOpening: true, createdAt: true } })) ?? [] : [];
  /* Only what the lead may read: a document a person added for themselves is theirs, and is never listed here. */
  const documents: any[] = ids.length ? (await prisma.groundDocument.findMany({ where: { groundId: { in: ids }, visibility: { in: ['OPEN', 'CLOSED'] }, createdAt: { gte: since } }, select: { id: true, groundId: true, fileName: true, origin: true, createdAt: true } })) ?? [] : [];
  const repItems = reports.filter((r) => r.theOpening).map((r) => ({ id: r.id, label: labelOf.get(r.groundId) ?? 'a check-in', opening: r.theOpening as string, at: r.createdAt as Date }));
  /* What she forwarded counts, each file for the month it says it is about (executive-onboarding/the-months-a-document-covers.ts): the same reading the two jobs use, so the draft and the job agree on what the record covers. */
  const forwarded = await whatHerMaterialCovers(prisma, { principalUserId: a.principalUserId, year });
  const files = await theFilesSheKept(prisma, { principalUserId: a.principalUserId });
  const messages = await theMessagesSheKept(prisma, { principalUserId: a.principalUserId });
  const docItems = [
    ...documents.map((d) => ({ id: d.id, fileName: d.fileName as string, origin: d.origin ?? null, at: d.createdAt as Date, label: labelOf.get(d.groundId) ?? null, covers: [] as string[] })),
    ...files.filter((f) => f.receivedAt.getUTCFullYear() === year).map((f) => ({ id: f.id, fileName: f.fileName, origin: 'forwarded', at: f.receivedAt, label: null, text: f.text, subject: f.subject, covers: [...new Set(forwarded.filter((x) => x.id === f.id).flatMap((x) => x.covers))] })),
    /* The plain emails and WhatsApp messages are evidence too, each under the month it is about (D9). They are never a month's note. */
    ...messages.map((m) => ({ id: m.id, fileName: m.channel === 'whatsapp' ? 'a WhatsApp message' : 'an email', origin: 'message', at: m.receivedAt, label: null, text: m.text, subject: m.subject, covers: [...new Set(forwarded.filter((x) => x.id === m.id).flatMap((x) => x.covers))] })).filter((m) => m.covers.length),
  ];
  const sources = [
    ...register.rows.flatMap((r) => r.sources.map((s) => ({ at: s.at, kind: s.kind, workstream: r.workstream, owner: r.owner }))),
    ...repItems.map((r) => ({ at: r.at, kind: 'report', workstream: r.label, owner: 'unconfirmed' })),
    ...docItems.filter((d) => d.origin !== 'forwarded' && d.origin !== 'message').map((d) => ({ at: d.at, kind: 'document', workstream: d.label, owner: 'unconfirmed' })),
    ...forwarded.map((f) => ({ at: f.at, kind: f.kind, workstream: f.workstream, owner: f.owner })),
  ];
  /* The months that have a monthly note, and the months in the run with none, are read in one place (the-year-end-content.ts). */
  const noteGaps = theMonthsWithANote(docItems, a.now).missing;
  return { year, principalName, now: a.now, register, reports: repItems, documents: docItems, gaps: coverageOf(sources, a.now).gaps, noteGaps, askedOf: await whoIsBeingAsked(prisma, a) };
}

/**
 * Who the gaps were put to, read from what was really asked: a question whose message went and is not answered yet (information_gaps, state "asked"). A
 * question still waiting to go is not "being asked" (Dangote stress test, D4: the final report said 23 times "Maryam Sule is being asked which is right" of
 * mails that never went). A person who acts for her is named; anybody else is "a member of the team", because the team's names are not read here. Two lines
 * put to her herself as a decision are hers. Null when nobody has been asked, which the report says plainly.
 */
async function whoIsBeingAsked(prisma: any, a: { organizationId: string; principalUserId: string }): Promise<{ months: string | null; matches: Record<string, string> }> {
  const asks = await theQuestionsAsked(prisma, a.principalUserId);
  const delegates: any[] = (await prisma.delegate?.findMany?.({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId, revokedAt: null } }).catch(() => [])) ?? [];
  const nameOf = (email: string | null | undefined) => (email ? delegates.find((d) => String(d.delegateEmail).toLowerCase() === String(email).toLowerCase())?.delegateName ?? 'A member of the team' : null);
  const matches: Record<string, string> = {};
  for (const g of asks) if (String(g.gapKey).startsWith('match:')) matches[String(g.gapKey).slice(6)] = nameOf(g.askedOfEmail) ?? 'A member of the team';
  const toldHer: any[] = (await prisma.yearEndLog?.findMany?.({ where: { principalUserId: a.principalUserId, kind: 'told', subject: { startsWith: 'decision:' } } }).catch(() => [])) ?? [];
  const her: any = await prisma.user?.findUnique?.({ where: { id: a.principalUserId }, select: { firstName: true } }).catch(() => null);
  for (const t of toldHer) { const k = String(t.subject).slice(9); if (k.includes('|') && !matches[k]) matches[k] = her?.firstName ?? 'She'; }
  return { months: nameOf(asks.find((r) => String(r.gapKey).startsWith('gap:'))?.askedOfEmail), matches };
}

/* ------------------------------------------------------------------ reading what she asked for */

const MONTH_RE = new RegExp(`\\b(${MONTHS.join('|')})\\b`, 'i');
const monthKeyOf = (name: string, year: number) => `${year}-${String(MONTHS.findIndex((m) => m.toLowerCase() === name.toLowerCase()) + 1).padStart(2, '0')}`;

export type TheChange = { kind: 'add_month'; month: string; text: string | null } | { kind: 'shorten'; section: string } | { kind: 'wrong'; text: string };

/**
 * The plain reading of the three changes the principal is told she can ask for. A model's reading of the same words can replace it through
 * `interpret` (the change's meaning is understood, not matched); this is the safe default, and what a voice transcript goes through too.
 */
export function readTheChange(message: string, year: number): TheChange | null {
  const m = String(message ?? '').trim();
  const wrong = /^\s*(?:this|that|it)\s+(?:is|looks|seems)\s+(?:wrong|not right|incorrect)\s*[:,\-–]?\s*(.*)$/is.exec(m) ?? /^\s*(?:that'?s|that is)\s+(?:wrong|not right)\s*[:,\-–]?\s*(.*)$/is.exec(m);
  if (wrong && wrong[1].trim().length >= 3) return { kind: 'wrong', text: wrong[1].trim() };
  if (/^\s*(?:shorten|make)\s+(?:this|it|the\s+(?:report|presentation|draft))(?:\s+shorter)?\s*[.!]*\s*$/i.test(m)) return { kind: 'shorten', section: 'all' };
  const add = /^\s*add\s+(?:in\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\b\s*[:,\-–]?\s*(.*)$/is.exec(m);
  if (add) return { kind: 'add_month', month: monthKeyOf(add[1], year), text: add[2].trim() ? add[2].trim() : null };
  return null;
}

export const ASKS_FOR_THE_REFRESH = /^\s*(?:update|refresh)\s+(?:the\s+)?(?:draft|report|version)\s*[.!]*\s*$/i;

/* ------------------------------------------------------------------ rows */

const asRow = (r: any): TheDraftRow => r;

export async function latestDraft(prisma: any, a: { organizationId: string; principalUserId: string; year: number }): Promise<TheDraftRow | null> {
  const r = await prisma.yearEndDraft.findFirst({ where: a, orderBy: { version: 'desc' } });
  return r ? asRow(r) : null;
}

export async function theVersions(prisma: any, a: { organizationId: string; principalUserId: string; year: number }): Promise<TheDraftRow[]> {
  return ((await prisma.yearEndDraft.findMany({ where: a, orderBy: { version: 'asc' } })) ?? []).map(asRow);
}

async function writeAVersion(prisma: any, a: { organizationId: string; principalUserId: string; content: YearEndContent; status: TheStatus; note: string; by: string | null; channel: string; parent: TheDraftRow | null; now: Date }): Promise<TheDraftRow> {
  const version = (a.parent?.version ?? 0) + 1;
  const row = await prisma.yearEndDraft.create({
    data: { organizationId: a.organizationId, principalUserId: a.principalUserId, year: a.content.year, version, status: a.status, content: a.content as any, changeNote: a.note, changedByUserId: a.by, channel: a.channel, parentId: a.parent?.id ?? null, createdAt: a.now },
  });
  await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'generated', subject: `${a.content.year}:v${version}`, version, detail: a.note, at: a.now });
  return asRow(row);
}

/** The first draft, once the record is ready. Safe to call every night: a second call finds the draft and writes nothing. */
export async function makeTheFirstDraft(prisma: any, a: { organizationId: string; principalUserId: string; now: Date; narrator?: TheNarrator | null }): Promise<{ row: TheDraftRow; made: boolean }> {
  const year = a.now.getUTCFullYear();
  const there = await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, year });
  if (there) return { row: there, made: false };
  const content = await buildTheContentWithTheNarrative(await loadTheRecord(prisma, a), [], { narrator: a.narrator });
  try {
    return { row: await writeAVersion(prisma, { ...a, content, status: 'draft', note: 'The first draft, built from the record.', by: null, channel: 'system', parent: null }), made: true };
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err;
    /* Another copy wrote it first, which is the answer wanted. */
    return { row: (await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, year }))!, made: false };
  }
}

export interface TheReviser { userId: string; isPrincipal: boolean }

export const NO_DRAFT_YET = 'There is no draft yet to change. I am still collecting, and I will tell you when the first one is ready.';

/**
 * A change to the same draft, as a new version. Returns the sentence to say back, or null when the words are not a change to the draft (so the
 * caller carries on with what it was doing). The earlier versions are untouched.
 */
export async function reviseTheDraft(
  prisma: any,
  a: { organizationId: string; principalUserId: string; by: TheReviser; channel: string; message: string; now: Date; interpret?: (message: string, year: number) => TheChange | null; narrator?: TheNarrator | null },
): Promise<{ said: string; version: number } | null> {
  const year = a.now.getUTCFullYear();
  const change = (a.interpret ?? readTheChange)(a.message, year);
  if (!change) return null;
  const latest = await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, year });
  if (!latest) return { said: NO_DRAFT_YET, version: 0 };
  const edit = { id: randomUUID(), by: a.by.userId, at: a.now.toISOString(), channel: a.channel, ...change } as AnEdit;
  const edits = [...(latest.content.edits ?? []), edit];
  const content = await buildTheContentWithTheNarrative(await loadTheRecord(prisma, a), edits, { narrator: a.narrator, previous: latest.content.narrative, reusePrevious: change.kind === 'shorten', previousOutcomes: latest.content.outcomes });
  const first = content.principalFirstName;
  const row = await writeAVersion(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, content, status: 'revised', note: noteFor(change, first), by: a.by.userId, channel: a.channel, parent: latest, now: a.now });
  return { said: saidBack(change, row.version, latest, content), version: row.version };
}

/** Newer evidence, as a new version, when she asks for an updated one. The edits she made stay. */
export async function refreshTheDraft(prisma: any, a: { organizationId: string; principalUserId: string; by: TheReviser; channel: string; now: Date; narrator?: TheNarrator | null }): Promise<{ said: string; version: number }> {
  const year = a.now.getUTCFullYear();
  const latest = await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, year });
  if (!latest) return { said: NO_DRAFT_YET, version: 0 };
  const content = await buildTheContentWithTheNarrative(await loadTheRecord(prisma, a), latest.content.edits ?? [], { narrator: a.narrator, previous: latest.content.narrative, previousOutcomes: latest.content.outcomes });
  if (JSON.stringify({ ...content, builtAt: 0 }) === JSON.stringify({ ...latest.content, builtAt: 0 })) return { said: `Version ${latest.version} already has everything in the record, so I have not made a new one.`, version: latest.version };
  const row = await writeAVersion(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, content, status: 'revised', note: 'Built again from the record, with later evidence.', by: a.by.userId, channel: a.channel, parent: latest, now: a.now });
  return { said: `I have made version ${row.version} from the record as it is now. ${keptLine(latest)}`, version: row.version };
}

/**
 * What she is told the moment she asks for a change, before the new version is ready (it can take a minute). A correction says what is being done with her line, so she is not
 * left to wonder until the version arrives: it goes beside the line it is about, and the line stays as the record has it (Fatima round 4, N35).
 */
export const theAckBeforeTheRevision = (kind: TheChange['kind'], version: number): string =>
  kind === 'wrong'
    ? `I am making version ${version} now, with your correction put beside the line it is about. The line stays as the record has it until a record shows otherwise, and your words are marked as yours. It can take about a minute, and I will tell you when it is ready.`
    : `I am making version ${version} now. It can take about a minute, and I will tell you when it is ready.`;

const noteFor = (c: TheChange, first: string) => (c.kind === 'add_month' ? `${first} asked to add ${monthWords(c.month)}.` : c.kind === 'shorten' ? `${first} asked for it to be shorter.` : `${first} said a line is wrong.`);
const keptLine = (before: TheDraftRow) =>
  before.status === 'approved' || before.status === 'final'
    ? `Version ${before.version} stays exactly as it was approved, and this one needs approving again.`
    : `Version ${before.version} is kept.`;

function saidBack(c: TheChange, version: number, before: TheDraftRow, content: YearEndContent): string {
  const first = content.principalFirstName;
  const kept = keptLine(before);
  if (c.kind === 'add_month') {
    const sec = content.sections.find((s) => s.id === `month:${c.month}`);
    const none = sec?.claims.some((x) => x.status === 'gap');
    return `I have added ${monthWords(c.month)} to the draft as version ${version}, in the report, the presentation and the register. ${none ? `The record has nothing for ${MONTHS[Number(c.month.slice(5)) - 1]} yet, so it is marked unverified until a record arrives.` : c.text ? `What you said is marked as your own recollection until a record shows it.` : `It lists what the record holds for that month.`} ${kept}`;
  }
  if (c.kind === 'shorten') return `I have made the report and the presentation shorter in version ${version}. Nothing was taken out of the register or the evidence index, which stay in full. ${kept}`;
  const about = content.sections.find((s) => s.id === 'corrections')?.claims.slice(-1)[0];
  const matched = !!about?.aboutLine;
  return matched
    ? `I have put your correction beside that line in version ${version}, in the report, the presentation and the register. The line stays as the record has it until something shows otherwise, and your words are marked as yours. ${kept}`
    : `I could not tell which line you meant, so I have kept your words as they are, marked unverified, in version ${version}. Which line is it about, ${first}? ${kept}`;
}

/* ------------------------------------------------------------------ approval */

const allowed: Record<string, string[]> = { draft: ['approved'], revised: ['approved'], approved: ['final'], final: [] };

export async function wasItSentToHer(prisma: any, principalUserId: string, year: number, version: number): Promise<boolean> {
  const rows: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId, version, kind: 'sent', subject: { contains: `:${year}:v${version}:draft:` } } })) ?? [];
  return rows.length > 0;
}

export async function approveTheDraft(
  prisma: any,
  /** `named`: the version she named, if she named one. Only that version, or, when she names none, the one that waits, is approved. */
  a: { organizationId: string; principalUserId: string; by: TheReviser; firstName: string; now: Date; named?: number | null },
): Promise<{ said: string; approved: TheDraftRow | null }> {
  const year = a.now.getUTCFullYear();
  if (!a.by.isPrincipal) return { said: `Only ${a.firstName} can approve this. I have not marked anything as approved, and I have told nobody it is.`, approved: null };
  const latest = await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, year });
  if (!latest) return { said: NO_DRAFT_YET, approved: null };
  /* She named a version that is not the one that waits: nothing is approved, and she is told which one waits (it is a decision, so it is never guessed). */
  if (a.named && a.named !== latest.version) return { said: `You named version ${a.named}, and the newest version is ${latest.version}. I have not approved anything. Say "I approve version ${latest.version}" if that is the one you mean.`, approved: null };
  if (latest.status === 'approved' || latest.status === 'final') return { said: `Version ${latest.version} is already approved.`, approved: latest };
  if (!(await wasItSentToHer(prisma, a.principalUserId, latest.year, latest.version))) {
    return { said: `I have not sent you version ${latest.version} yet, so I cannot take an approval for it. I will send it to you first, and you can approve it when you have read it.`, approved: null };
  }
  const moved = await prisma.yearEndDraft.updateMany({ where: { id: latest.id, status: { in: ['draft', 'revised'] } }, data: { status: 'approved', approvedAt: a.now, approvedByUserId: a.by.userId } });
  if (!moved?.count) return { said: `Version ${latest.version} was already changed, so I have not approved anything. Say "this is ready" again if you want it approved.`, approved: null };
  await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'approved', subject: `${latest.year}:v${latest.version}`, version: latest.version, detail: `Approved by ${a.firstName}.`, at: a.now });
  return { said: `Thank you. I have marked version ${latest.version} as approved. I will send you the final files now, and I will tell you when they have gone.`, approved: { ...latest, status: 'approved', approvedAt: a.now } };
}

/** approved to final, only after the final files really went to the principal. Any other move is refused. */
export async function markItFinal(prisma: any, row: TheDraftRow): Promise<boolean> {
  if (!allowed[row.status]?.includes('final')) return false;
  const moved = await prisma.yearEndDraft.updateMany({ where: { id: row.id, status: 'approved' }, data: { status: 'final' } });
  return !!moved?.count;
}

/* ------------------------------------------------------------------ what happened, in words */

/** What became of a version, said only as far as the record goes: "sent" is never said for a version that was only made or queued. */
export async function whatHappenedToIt(prisma: any, a: { principalUserId: string; year: number; version: number; firstName: string }): Promise<string> {
  const all: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId: a.principalUserId, version: a.version }, orderBy: { at: 'asc' } })) ?? [];
  const rows = all.filter((r) => String(r.subject).includes(`${a.year}:v${a.version}`));
  const of = (k: string) => rows.filter((r) => r.kind === k);
  const lastOf = (k: string) => of(k).slice(-1)[0];
  const parts: string[] = [];
  if (!of('generated').length) return `Version ${a.version} has not been made.`;
  parts.push(`Version ${a.version} was made on ${dayWords(of('generated')[0].at)}.`);
  const queued = of('queued').filter((q) => !of('sent').some((s) => s.subject === q.subject));
  for (const d of of('delivered')) parts.push(`The mail to ${d.recipient} was delivered on ${dayWords(d.at)}.`);
  for (const s of of('sent').filter((s) => !of('delivered').some((d) => d.subject === s.subject))) parts.push(`The mail to ${s.recipient} was sent on ${dayWords(s.at)}. I have not yet had word that it reached the inbox.`);
  for (const q of queued) parts.push(`The mail to ${q.recipient} is waiting to go, and has not been sent yet.`);
  if (!of('queued').length) parts.push('It has not been emailed yet.');
  if (lastOf('approved')) parts.push(`${a.firstName} approved it on ${dayWords(lastOf('approved').at)}.`);
  else parts.push(`${a.firstName} has not approved it yet.`);
  return parts.join(' ');
}
