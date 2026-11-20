/**
 * THE ONE SOURCE THE YEAR-END FILES ARE WRITTEN FROM (Fatima, increment 4; spec 14.3, 30, 30.1).
 *
 * The report, the presentation, the outstanding register, its readable copy and the evidence index are all
 * written from one `YearEndContent`, which is built from the outstanding register (increment 3: the
 * commitments, dependencies, obligations, to-dos and requests it reads) and the record (reports, shared
 * documents), then changed only by what the principal asked for (`edits`). Nothing is written from a
 * second summary, so the files cannot disagree.
 *
 * THE RULES THAT MUST BE PREDICTABLE (they are about what is claimed, so code holds them):
 *   - Every claim and every register line carries references to the record it came from, or the word
 *     "unverified". No line is written without one or the other (`everyLineHasASourceOrIsUnverified`).
 *   - An achievement needs proof. A line is under "achieved" only when the register says it is completed,
 *     which only proof does (the-outstanding-register.ts). "Said done" is under "reported, not shown".
 *   - What the principal remembers is labelled as her recollection and is unverified until a record shows it.
 *   - Nothing unknown is invented: an owner nobody confirmed is "unconfirmed", a month with nothing is
 *     said to have nothing.
 *   - A correction never deletes the line it is about. It sits beside it.
 */
import { asATask } from '../outstanding/a-promise-as-a-task';
import { theWordsThatMatter } from '../outstanding/the-outstanding-register';
import type { TheRegister, TheRegisterRow } from '../outstanding/the-outstanding-register';
import type { TheNarrative } from './the-year-end-narrative';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type SectionId = 'achieved' | 'unverified' | 'open' | 'decision' | 'record' | 'gaps' | 'corrections' | `month:${string}`;
export type ClaimStatus = 'achieved' | 'unverified' | 'open' | 'decision' | 'kept' | 'noted' | 'recollection' | 'gap' | 'disputed';

export interface EvidenceItem {
  /** Stable: the kind's letter and the first six characters of the row's own id, so it does not move when other evidence arrives. */
  ref: string;
  kind: string;
  /** In plain words: "a check-in", "a pasted document", "a report". */
  label: string;
  said: string;
  at: string;
  /** The months, "2026-05", a forwarded document says it is about. Beside `at`, which is when it arrived. */
  covers?: string[];
  /** A forwarded note's own heading, as a person would name it ("Abuja office activity note, March 2026"). */
  title?: string;
  /** Only the evidence index shows a file name. Nothing else does. */
  fileName?: string;
}

export interface Claim {
  id: string;
  text: string;
  status: ClaimStatus;
  /** Empty only for "unverified". */
  refs: string[];
  rowKey?: string;
  /** What the principal said about this line, beside it. */
  note?: string;
  /** On a correction: the line it was matched to, whether that line came from the register or from a month's note. Absent when no line was found. */
  aboutLine?: string;
}

export interface Section { id: SectionId; title: string; claims: Claim[] }

export interface RegisterLine {
  key: string;
  item: string;
  workstream: string | null;
  owner: string;
  actionNeeded: string;
  status: string;
  priority: string;
  dueOn: string | null;
  dueInferred: boolean;
  dependency: string | null;
  decision: string | null;
  refs: string[];
  lastVerifiedAt: string;
  nextFollowUp: string;
  carryForward: boolean;
  resolution: string | null;
  note?: string;
  /** Somebody marked the claim this line is as not backed up. Every section that states the same claim says so (the-year-end-narrative.ts). */
  disputed?: boolean;
}

export type AnEdit =
  | { id: string; kind: 'add_month'; month: string; text: string | null; by: string; at: string; channel: string }
  | { id: string; kind: 'shorten'; section: string; by: string; at: string; channel: string }
  | { id: string; kind: 'wrong'; text: string; by: string; at: string; channel: string };

export interface YearEndContent {
  year: number;
  principalName: string;
  principalFirstName: string;
  builtAt: string;
  sections: Section[];
  register: RegisterLine[];
  evidence: EvidenceItem[];
  /** Months with nothing in the record, as "2026-03". */
  gaps: string[];
  /** Months with no forwarded note while notes were forwarded for several others. */
  noteGaps?: string[];
  /** The months that have a monthly note, "2026-03". The one list "what matters most" counts from. Absent in a version stored before it was kept. */
  noteMonths?: string[];
  /** Questions the record cannot answer, each put to the person who can: never to the principal twice. */
  questions: string[];
  edits: AnEdit[];
  /** Sections to cut short in the report and the presentation. The register and the evidence index are never cut. */
  shortened: string[];
  /** The report's prose, when the narrator wrote it and every sentence held up (the-year-end-narrative.ts). Absent otherwise, and then the plain lines above are the report. */
  narrative?: TheNarrative;
}

export interface TheRecordForTheYear {
  year: number;
  principalName: string;
  now: Date;
  register: TheRegister;
  reports: { id: string; label: string; opening: string; at: Date }[];
  documents: { id: string; fileName: string; origin: string | null; at: Date; label: string | null; /** The months, "2026-05", it says it is about (forwarded files only). */ covers?: string[]; /** What a forwarded note says, as it was kept. The plain content is written from it by plain code. The one module that may show it to a model is the-year-end-narrative.ts, under its own checks. */ text?: string | null; subject?: string | null }[];
  /** Months with nothing, "2026-03". */
  gaps: string[];
  /** Months with no forwarded note, "2026-03", when notes were forwarded for several other months (read from the same material that gives each month its section). */
  noteGaps?: string[];
  /** Who is being asked about the gaps, read from what was really asked (year_end_log). Null when nobody has been asked yet. */
  askedOf?: { months: string | null; matches: string | null };
}

const LETTER: Record<string, string> = { commitment: 'C', dependency: 'D', obligation: 'O', todo: 'T', request: 'Q', report: 'R', document: 'F' };
/** Internal only: it ties a line to its record inside the stored content. It is never written in a file; people read `theSourceName`. */
export const refFor = (kind: string, id: string) => `${LETTER[kind] ?? 'X'}-${String(id).replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}`;
const oneEach = (refs: string[]) => [...new Set(refs)];

const ENTITIES: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '"', rdquo: '"', ndash: '\u2013', mdash: '\u2014' };
/** Words as a person wrote them. Text that came in from mail can still carry HTML entities ("&quot;"), and no file shows one: this is the one place they are decoded. */
const decodeOnce = (t: string) => t.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (m, dec, hex, name) => (dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : ENTITIES[String(name).toLowerCase()] ?? m));
/* Twice, because text that was escaped on the way in and again on the way through reads "&amp;quot;". */
export const plain = (s: unknown): string => decodeOnce(decodeOnce(String(s ?? ''))).replace(/\s+/g, ' ').trim();

export const dayWords = (iso: string | Date): string => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
export const monthWords = (key: string): string => `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`;
const monthOf = (d: Date | string) => { const x = new Date(d); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
const quoted = (s: string) => plain(s).replace(/[.!?\s]+$/, '');
const sentence = (s: string) => { const t = asATask(plain(s)).replace(/[.!?]+$/, ''); return t ? `${t[0].toUpperCase()}${t.slice(1)}.` : ''; };
const listOf = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * WHAT A FORWARDED NOTE SAYS, as sentences. Plain reading of the words, never a model's: what a senior person forwards is untrusted, and is read by
 * nothing but code (executive-onboarding/nothing-forwarded-reaches-a-model-or-a-provider.spec.ts). The note's own heading and its "Date:" style
 * header lines are not content. A note with no sentence in it says nothing here.
 */
export function whatANoteSays(text: string | null | undefined): { title: string | null; sentences: string[]; kind: 'note' | 'email' } {
  const HEADER = /^(?:from|to|cc|bcc|date|sent|subject|re|fw|fwd)\s*:/i;
  const lines = String(text ?? '').replace(/\r/g, '').split('\n').map((l) => plain(l)).filter(Boolean);
  const subject = lines.map((l) => /^subject\s*:\s*(.+)$/i.exec(l)?.[1]).find(Boolean) ?? null;
  const email = lines.some((l) => /^(?:from|to)\s*:/i.test(l) || /forwarded message/i.test(l));
  const first = lines[0] ?? '';
  const heading = lines.length > 1 && first.length <= 100 && !HEADER.test(first) && !/[.!?:]$/.test(first) && !/^[-_=]{3,}/.test(first) ? first : null;
  const title = heading ?? (email ? subject?.replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, '') ?? null : null);
  const body = lines.slice(heading ? 1 : 0).filter((l) => !HEADER.test(l) && !/^[-_=]{3,}.*$/.test(l) && !/^on .{5,80} wrote:$/i.test(l));
  const sentences = body.join(' ').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 2);
  return { title, sentences: sentences.slice(0, 8), kind: email ? 'email' : 'note' };
}

/**
 * WHICH MONTH A FORWARDED NOTE IS THE NOTE FOR. One owner, read by the report's month sections, by "what matters most", by the missing months, and by what
 * the first picture says the notes cover (Fatima round 4, untrue lines 2, 3 and 6). Only a forwarded document that says it is about exactly one month and
 * has sentences in it is a monthly note. A payments tracker that is dated across the year, a document with no month, and a month that somebody asked
 * to be added but has no note are not notes, so they never make a month "covered".
 */
export function theMonthOfANote(d: { origin?: string | null; covers?: string[] | null; text?: string | null }): string | null {
  const covers = d.covers ?? [];
  return d.origin === 'forwarded' && covers.length === 1 && whatANoteSays(d.text).sentences.length > 0 ? covers[0] : null;
}

/**
 * The months that have a monthly note, and the months with none in the span the notes make. Notes for three or more months are a run of monthly notes:
 * January to the month before the month the clock is in (which is not over) is its span, and a month in it with no note is named as missing.
 */
export function theMonthsWithANote(docs: { origin?: string | null; covers?: string[] | null; text?: string | null }[], now: Date): { months: string[]; missing: string[] } {
  /* An email chain about a month has its place under that month, and it is not that month's note: only a note makes the month covered by a note. */
  const months = [...new Set(docs.filter((d) => whatANoteSays(d.text).kind === 'note').map(theMonthOfANote).filter((m): m is string => !!m))].sort();
  const missing: string[] = [];
  if (months.length >= 3) for (let m = 0; m < now.getUTCMonth(); m += 1) { const k = `${now.getUTCFullYear()}-${String(m + 1).padStart(2, '0')}`; if (!months.includes(k)) missing.push(k); }
  return { months, missing };
}

/** How a person reads where a line comes from: the note, the check-in or the report, and the day. Never a code and never a file name. */
export const theSourceName = (e: EvidenceItem): string => {
  const day = dayWords(e.at);
  if (e.kind === 'document') return `${e.label}, forwarded on ${day}`;
  if (e.kind === 'report') return `${e.label}, written on ${day}`;
  return `${e.label} on ${day}`;
};

export const STATUS_WORDS: Record<string, string> = {
  open: 'It is open',
  'in progress': 'It is in progress',
  blocked: 'It is blocked',
  'awaiting decision': 'It is waiting for a decision',
  'awaiting external party': 'It is waiting on somebody outside',
  completed: 'It is completed',
  cancelled: 'It was cancelled',
  unverified: 'It was said to be done, and nothing shows it yet',
};
/** The register's states in the words a column of a spreadsheet uses. */
export const STATUS_PLAIN: Record<string, string> = {
  open: 'Open',
  'in progress': 'In progress',
  blocked: 'Blocked',
  'awaiting decision': 'Waiting for a decision',
  'awaiting external party': 'Waiting on somebody outside',
  completed: 'Done, with proof',
  cancelled: 'Cancelled',
  unverified: 'Said to be done, not shown',
};

const evidenceOf = (c: YearEndContent, ref: string) => c.evidence.find((e) => e.ref === ref);
/** Where a line comes from, said as a person would say it. A line with no record says so. */
export const sourceWords = (c: YearEndContent, refs: string[]): string => {
  const names = refs.map((r) => evidenceOf(c, r)).filter((e): e is EvidenceItem => !!e).map(theSourceName);
  if (!refs.length || !names.length) return 'It is unverified, because no record backs it yet.';
  if (names.length > 3) return `The sources are ${names.length} records, each listed in the evidence index with the day it arrived.`;
  return `The source is ${listOf(names)}.`;
};

const whoHad = (owner: string, name: string) => (owner === 'unconfirmed' ? 'Nobody has confirmed who owns it' : owner === 'you' ? `${name} has it` : `${owner} has it`);
const underWorkstream = (ws: string | null, text: string) => (ws ? `${text} It is part of ${plain(ws)}.` : text);

function claimsFromTheRegister(rows: TheRegisterRow[], name: string): Pick<Record<SectionId, Claim[]>, 'achieved' | 'unverified' | 'open' | 'decision'> {
  const out = { achieved: [] as Claim[], unverified: [] as Claim[], open: [] as Claim[], decision: [] as Claim[] };
  const byWorkstream = [...rows].sort((a, b) => String(a.workstream ?? '~').localeCompare(String(b.workstream ?? '~')));
  for (const r of byWorkstream) {
    const refs = oneEach(r.sources.map((s) => refFor(s.kind, s.id)));
    const owner = whoHad(r.owner, name);
    const base = { rowKey: r.key, refs };
    if (r.status === 'completed') {
      out.achieved.push({ id: `a:${r.key}`, status: 'achieved', ...base, text: underWorkstream(r.workstream, `${sentence(r.item)} ${owner === 'Nobody has confirmed who owns it' ? owner : owner.replace(' has it', ' had it')}, and it was settled on the record on ${dayWords(r.lastVerifiedAt)}.`) });
    } else if (r.status === 'unverified') {
      out.unverified.push({ id: `u:${r.key}`, status: 'unverified', ...base, text: underWorkstream(r.workstream, r.disputed ? `${sentence(r.item)} Somebody has marked that claim as not backed up, and nothing on the record shows it yet, so it is not counted as achieved.` : `${sentence(r.item)} ${r.owner === 'unconfirmed' ? 'Nobody has confirmed who owns it' : `${r.owner} said it was done`}, and nothing on the record shows it yet, so it is not counted as achieved.`) });
    } else if (r.status === 'awaiting decision') {
      out.decision.push({ id: `d:${r.key}`, status: 'decision', ...base, text: underWorkstream(r.workstream, `${sentence(r.item)} ${r.decision ? plain(r.decision.question) : 'It is waiting for a decision.'}`) });
    } else if (r.status !== 'cancelled') {
      const due = r.dueOn ? ` It is due ${dayWords(r.dueOn)}${r.dueInferred ? ', a day worked out from the words rather than given' : ''}.` : '';
      const state = r.dependency && (r.status === 'awaiting external party' || r.status === 'blocked') ? `${r.status === 'blocked' ? 'It is blocked, and it is' : 'It is'} ${plain(r.dependency).toLowerCase()}` : STATUS_WORDS[r.status] ?? 'It is open';
      out.open.push({ id: `o:${r.key}`, status: 'open', ...base, text: underWorkstream(r.workstream, `${sentence(r.item)} ${owner}.${due} ${state}.${r.carryForward ? ' It is carried into the next year.' : ''}`) });
    }
  }
  return out;
}

const registerLine = (r: TheRegisterRow, first: string): RegisterLine => ({
  key: r.key,
  item: plain(r.item),
  workstream: r.workstream ? plain(r.workstream) : null,
  owner: r.owner,
  actionNeeded: plain(r.actionNeeded),
  status: r.status,
  /* The record gives no priority, so none is invented. A date worked out from words is labelled so. */
  priority: 'not stated',
  dueOn: r.dueOn ? r.dueOn.toISOString() : null,
  dueInferred: r.dueInferred,
  dependency: r.dependency ? plain(r.dependency) : null,
  decision: r.decision ? plain(r.decision.question) : null,
  refs: oneEach(r.sources.map((s) => refFor(s.kind, s.id))),
  lastVerifiedAt: r.lastVerifiedAt.toISOString(),
  nextFollowUp: r.status === 'completed' || r.status === 'cancelled' ? 'none needed' : r.owner === 'unconfirmed' ? 'find out who owns it' : `ask ${r.owner === 'you' ? first : r.owner} at the next check-in`,
  carryForward: r.carryForward,
  resolution: r.status === 'completed' ? `Settled on the record on ${dayWords(r.lastVerifiedAt)} (${r.settledBy ?? 'proof kept'}).` : null,
  ...(r.disputed ? { disputed: true } : {}),
});

const FROM_WORDS: Record<string, string> = { 'what they told Groundwork': 'what the team told Groundwork', 'your own list': 'a to-do list' };

/** Lines that may be one matter in different words are asked about together once, not as a chain of pairs. */
function theMatchesTogether(pairs: { a: { key: string; item: string }; b: { key: string; item: string } }[]): string[][] {
  const groups: { keys: Set<string>; items: Map<string, string> }[] = [];
  for (const p of pairs) {
    const hit = groups.filter((g) => g.keys.has(p.a.key) || g.keys.has(p.b.key));
    const g = hit[0] ?? (groups[groups.push({ keys: new Set(), items: new Map() }) - 1]);
    for (const other of hit.slice(1)) { other.keys.forEach((k) => g.keys.add(k)); other.items.forEach((v, k) => g.items.set(k, v)); groups.splice(groups.indexOf(other), 1); }
    for (const x of [p.a, p.b]) { g.keys.add(x.key); g.items.set(x.key, plain(x.item).replace(/[.!?]+$/, '')); }
  }
  return groups.map((g) => [...g.items.values()]);
}

/** The record, laid out as the files will say it. Pure: the same record and edits always give the same content. */
export function buildTheContent(record: TheRecordForTheYear, edits: AnEdit[] = []): YearEndContent {
  const first = record.principalName.split(/\s+/)[0] || record.principalName;
  const evidence = new Map<string, EvidenceItem>();
  for (const r of record.register.rows) {
    for (const s of r.sources) evidence.set(refFor(s.kind, s.id), { ref: refFor(s.kind, s.id), kind: s.kind, label: FROM_WORDS[s.from] ?? s.from, said: plain(s.said), at: s.at.toISOString() });
  }
  for (const rp of record.reports) evidence.set(refFor('report', rp.id), { ref: refFor('report', rp.id), kind: 'report', label: `the report for "${plain(rp.label)}"`, said: `The report opens: ${plain(rp.opening)}`, at: rp.at.toISOString() });

  /* A forwarded note is content: what it says, for the one month it is about. A document with no month, or about several months, is kept and listed, and says nothing more than that. */
  const months = new Map<string, Claim[]>();
  const otherDocs: { ref: string; at: Date }[] = [];
  for (const d of record.documents) {
    const ref = refFor('document', d.id);
    const note = whatANoteSays(d.text);
    const covers = d.covers ?? [];
    const asNote = theMonthOfANote(d) !== null;
    const noun = note.kind;
    evidence.set(ref, { ref, kind: 'document', label: note.title ? `the ${noun} "${note.title}"` : asNote ? (noun === 'email' ? 'an email' : 'a note') : 'a document', said: note.sentences.length ? note.sentences.join(' ') : `A document was added${d.label ? ` to "${plain(d.label)}"` : ''}.${covers.length ? ` It says it is about ${listOf(covers.map(monthWords))}.` : ''}`, at: d.at.toISOString(), ...(covers.length ? { covers } : {}), ...(note.title ? { title: note.title } : {}), fileName: d.fileName });
    if (asNote) months.set(covers[0], [...(months.get(covers[0]) ?? []), { id: `n:${d.id}`, status: 'noted', refs: [ref], text: `The ${noun} for ${MONTHS[Number(covers[0].slice(5)) - 1]} says: ${note.sentences.join(' ')} This is what the ${noun} says, and no separate proof has been shown for it.` }]);
    else otherDocs.push({ ref, at: d.at });
  }

  const fromRows = claimsFromTheRegister(record.register.rows, first);
  const kept: Claim[] = [
    ...record.reports.map((rp): Claim => ({ id: `r:${rp.id}`, status: 'kept', refs: [refFor('report', rp.id)], text: `The report for "${plain(rp.label)}" opens: ${sentence(rp.opening)}` })),
    ...(otherDocs.length ? [{ id: 'f:other', status: 'kept' as const, refs: otherDocs.map((x) => x.ref), text: `${otherDocs.length} other ${otherDocs.length === 1 ? 'document was' : 'documents were'} kept that ${otherDocs.length === 1 ? 'does' : 'do'} not name one month, or cover several, or have no readable sentences. ${otherDocs.length === 1 ? 'It is' : 'They are'} listed in the evidence index, and nothing more is claimed from ${otherDocs.length === 1 ? 'it' : 'them'}.` }] : []),
  ];

  const asked = record.askedOf ?? { months: null, matches: null };
  const gapClaims: Claim[] = [
    ...(record.gaps.length ? [{ id: 'g:months', status: 'gap' as const, refs: [], text: `Nothing in the record covers ${listOf(record.gaps.map((g) => MONTHS[Number(g.slice(5)) - 1]))} ${record.gaps[0].slice(0, 4)}. That does not mean nothing happened. ${asked.months ? `${asked.months} is being asked for it.` : 'Nobody has been asked for it yet.'}` }] : []),
    /* Monthly notes were forwarded and one month has none: the report says so by name, even when other records (a payment, a promise) carry that month's date. */
    ...((record.noteGaps ?? []).filter((g) => !record.gaps.includes(g)).length ? [{ id: 'g:notes', status: 'gap' as const, refs: [], text: `No note was forwarded for ${listOf((record.noteGaps ?? []).filter((g) => !record.gaps.includes(g)).map((g) => MONTHS[Number(g.slice(5)) - 1]))} ${record.year}. Whatever that note would have said is not in this report. ${asked.months ? `${asked.months} is being asked for it.` : 'Nobody has been asked for it yet.'}` }] : []),
    ...theMatchesTogether(record.register.toAsk).map((items, i): Claim => ({ id: `m:${i}`, status: 'gap', refs: [], text: `The record may hold one matter in different words: ${listOf(items.map((x) => `"${x}"`))}. ${asked.matches ?? first} is being asked which is right, and the lines are kept apart until then.` })),
    ...record.register.rows.filter((r) => r.owner === 'unconfirmed' && r.status !== 'completed' && r.status !== 'cancelled').map((r): Claim => ({ id: `n:${r.key}`, status: 'gap', refs: oneEach(r.sources.map((s) => refFor(s.kind, s.id))), text: `Nobody has confirmed who owns "${quoted(r.item)}", so it cannot move until somebody does.` })),
  ];
  const monthSections: Section[] = [...months.keys()].sort().map((m) => ({ id: `month:${m}` as SectionId, title: monthWords(m), claims: months.get(m)! }));
  const sections: Section[] = [
    ...monthSections,
    { id: 'achieved', title: 'What was achieved, with proof', claims: fromRows.achieved },
    { id: 'unverified', title: 'Said to be done, but not yet shown', claims: fromRows.unverified },
    { id: 'open', title: 'Still open, and what carries into the next year', claims: fromRows.open },
    { id: 'decision', title: 'Waiting for a decision', claims: fromRows.decision },
    { id: 'record', title: 'Reports and other documents kept', claims: kept },
    { id: 'gaps', title: 'What the record does not cover', claims: gapClaims },
  ];
  const content: YearEndContent = {
    year: record.year,
    principalName: record.principalName,
    principalFirstName: first,
    builtAt: record.now.toISOString(),
    sections,
    register: record.register.rows.map((r) => registerLine(r, first)),
    evidence: [...evidence.values()].sort((a, b) => a.at.localeCompare(b.at) || a.ref.localeCompare(b.ref)),
    gaps: [...record.gaps],
    noteGaps: [...(record.noteGaps ?? [])],
    noteMonths: theMonthsWithANote(record.documents, record.now).months,
    questions: [
      ...record.register.toAsk.map((m) => plain(m.question)),
      ...record.register.rows.filter((r) => r.questionForTheOwner).map((r) => plain(r.questionForTheOwner as string)),
    ],
    edits: [],
    shortened: [],
  };
  return edits.reduce((c, e) => applyOneEdit(c, e, record.now), content);
}

/** The line a correction is most likely about, by the words they share. Nothing under two shared words is matched. */
export function theLineItIsAbout(content: YearEndContent, text: string): Claim | null {
  /* When she quotes the line ("the line that says the Kano visit was in October is not right"), what she quotes is what is matched: the rest of her words, the true version, would match other lines. */
  const quoted = /\b(?:line|sentence|part|bit)\s+(?:that\s+)?(?:says?|reads?|states?)\s+(?:that\s+)?(.{8,200}?)(?:\s+(?:is|are|was)\s+(?:not\s+right|not\s+true|wrong|incorrect|untrue|false)\b|[.;!?]|$)/i.exec(text)?.[1] ?? null;
  const words = theWordsThatMatter(quoted ?? text);
  /* "visited" and "visit" are one word here. */
  const stem = (w: string) => w.replace(/(?:ing|ed|es|s)$/i, '');
  const stems = (set: Set<string>) => new Set([...set].map(stem));
  const mine = stems(words);
  let best: { claim: Claim; score: number } | null = null;
  for (const s of content.sections) {
    if (s.id === 'corrections') continue;
    for (const c of s.claims) {
      const cw = stems(theWordsThatMatter(c.text));
      let shared = 0;
      for (const w of mine) if (cw.has(w)) shared += 1;
      /* A quoted line is matched by how much of the quotation it holds; otherwise by the smaller of the two. */
      const score = shared / Math.max(1, quoted ? mine.size : Math.min(mine.size, cw.size));
      if (shared >= 2 && score >= 0.4 && (!best || score > best.score)) best = { claim: c, score };
    }
  }
  return best?.claim ?? null;
}

const sectionOrder = (s: Section) => (s.id.startsWith('month:') ? `0${s.id}` : s.id === 'corrections' ? '2' : '1');
function ensure(c: YearEndContent, id: SectionId, title: string): Section {
  let s = c.sections.find((x) => x.id === id);
  if (!s) { s = { id, title, claims: [] }; c.sections.push(s); c.sections.sort((a, b) => sectionOrder(a).localeCompare(sectionOrder(b)) || 0); }
  return s;
}

/** One change the principal asked for, laid over the content. The record underneath is never touched. */
export function applyOneEdit(content: YearEndContent, e: AnEdit, _now: Date): YearEndContent {
  const c: YearEndContent = JSON.parse(JSON.stringify(content));
  c.edits = [...c.edits.filter((x) => x.id !== e.id), e];
  const first = c.principalFirstName;
  if (e.kind === 'shorten') {
    c.shortened = e.section === 'all' ? ['all'] : [...new Set([...c.shortened, e.section])];
    return c;
  }
  if (e.kind === 'add_month') {
    const sec = ensure(c, `month:${e.month}`, monthWords(e.month));
    sec.claims = sec.claims.filter((x) => !x.id.startsWith('mm:'));
    /* A month whose notes are already in the report has nothing more to add from them. Otherwise it lists what arrived that month. */
    const alreadyThere = sec.claims.some((x) => x.id.startsWith('n:') || x.id.startsWith('nn:'));
    const there = alreadyThere ? [] : c.evidence.filter((x) => (x.covers?.length ? x.covers.includes(e.month) : monthOf(x.at) === e.month));
    sec.claims.push(...there.map((x): Claim => ({ id: `mm:${x.ref}`, status: 'kept', refs: [x.ref], text: `${theSourceName(x)[0].toUpperCase()}${theSourceName(x).slice(1)} says: ${sentence(x.said)}` })));
    if (!alreadyThere && !there.length && !c.edits.some((x) => x.kind === 'add_month' && x.month === e.month && x.text)) {
      sec.claims.push({ id: `mm:none:${e.month}`, status: 'gap', refs: [], text: `Nothing in the record covers ${monthWords(e.month)} yet. The team is being asked for it.` });
      const q = `Is there anything from ${monthWords(e.month)} that belongs in the year-end report?`;
      if (!c.questions.includes(q)) c.questions.push(q);
    }
    for (const t of c.edits.filter((x): x is Extract<AnEdit, { kind: 'add_month' }> => x.kind === 'add_month' && x.month === e.month && !!x.text)) {
      sec.claims.push({ id: `p:${t.id}`, status: 'recollection', refs: [`P-${t.id.slice(0, 6)}`], text: `${first} told me on ${dayWords(t.at)}: "${quoted(t.text as string)}". This is ${first}'s recollection, and nothing on the record backs it yet.` });
      if (!c.evidence.some((x) => x.ref === `P-${t.id.slice(0, 6)}`)) c.evidence.push({ ref: `P-${t.id.slice(0, 6)}`, kind: 'principal', label: `${first}'s own words by ${t.channel}`, said: plain(t.text as string), at: t.at });
    }
    return c;
  }
  /* wrong */
  const about = theLineItIsAbout(c, e.text);
  const ref = `P-${e.id.slice(0, 6)}`;
  c.evidence.push({ ref, kind: 'principal', label: `${first}'s own words by ${e.channel}`, said: plain(e.text), at: e.at });
  const sec = ensure(c, 'corrections', 'What you corrected');
  const said = `${first} said on ${dayWords(e.at)}: "${quoted(e.text)}".`;
  if (about) {
    about.note = `${said} This is ${first}'s correction, not yet backed by a record.`;
    about.status = about.status === 'achieved' ? 'disputed' : about.status;
    const row = c.register.find((r) => r.key === about.rowKey);
    if (row) row.note = about.note;
    sec.claims.push({ id: `w:${e.id}`, status: 'recollection', refs: [ref], rowKey: about.rowKey, aboutLine: about.id, text: `${said} It is about this line, which stays as the record has it: ${about.text}` });
  } else {
    sec.claims.push({ id: `w:${e.id}`, status: 'recollection', refs: [ref], text: `${said} I could not tell which line it is about, so it stands on its own and is unverified.` });
    const q = `Which line was meant when ${first} said "${quoted(e.text)}"?`;
    if (!c.questions.includes(q)) c.questions.push(q);
  }
  return c;
}

/** The words under a line about where it comes from. What the principal herself said is kept as hers, with no record behind it. */
export const theSourceLine = (c: YearEndContent, cl: Claim): string => (cl.status === 'recollection' ? `These are ${c.principalFirstName}'s own words, kept as they were said, and nothing on the record backs them yet.` : sourceWords(c, cl.refs));

/** The rule every writer and every test holds: no line without references, unless it says "unverified". */
export function everyLineHasASourceOrIsUnverified(c: YearEndContent): string[] {
  const bad: string[] = [];
  const known = new Set(c.evidence.map((e) => e.ref));
  for (const s of c.sections) for (const cl of s.claims) {
    /* A line with no record is allowed only as a gap, which every writer says is unverified. Anything else with no record is not written. */
    if (cl.refs.length ? cl.refs.some((r) => !known.has(r)) : cl.status !== 'gap') bad.push(`claim ${cl.id}`);
    if (cl.status === 'achieved' && !cl.refs.length) bad.push(`achievement without a source ${cl.id}`);
  }
  for (const r of c.register) if (r.refs.length ? r.refs.some((x) => !known.has(x)) : false) bad.push(`register ${r.key}`);
  return bad;
}

/** What the report and the presentation show of a section: all of it, or the first three when it was shortened. */
export function whatIsShown(c: YearEndContent, s: Section): { claims: Claim[]; leftOut: number } {
  const cut = c.shortened.includes('all') || c.shortened.includes(s.id);
  return cut && s.claims.length > 3 ? { claims: s.claims.slice(0, 3), leftOut: s.claims.length - 3 } : { claims: s.claims, leftOut: 0 };
}

export const sectionsWithWords = (c: YearEndContent): Section[] => c.sections.filter((s) => s.claims.length || s.id === 'achieved' || s.id === 'open');
export const EMPTY_SECTION = (id: SectionId): string =>
  id === 'achieved' ? 'Nothing in the record is settled with proof yet, so nothing is claimed as achieved.' : id === 'open' ? 'Nothing is open on the record.' : 'Nothing to report here.';
