/**
 * THE FACTS ON RECORD, AS EACH READER MAY READ THEM: THE ONE READER OF THE ASSESSMENTS (Hafsah, 1 November 2026: "the board, the session
 * report, the weekly report and Ask read from the assessments and the record they build, not from their own stores or summaries").
 *
 * WHY. On the assessment test, every conversation's assessment held what was said (the lead's targets, her rules, her private note,
 * Brian's KES 380,000 fee note and his missed promise) while each page read a store of its own that one failed write had left empty,
 * or a summary of counts and names. The assessment said of itself that it "reaches nobody". This is how it reaches the pages: every
 * page that needs what people said reads it here, from the assessments, in one shape.
 *
 * WHO MAY READ WHAT, decided here and nowhere else, by the item's own `whoMaySee` (the-assessment.ts, set by its kind in code):
 *   - 'the lead': the person who runs the check-in reads every person's items in it, as a manager would in a normal staff
 *     assessment, and the items only a lead may see. What judges a person (observations, role signals, areas, where accounts
 *     disagree) is read only while the organisation's person-judgements switch is on.
 *   - 'the person': somebody in the check-in reads their own items, never the lead-only ones (a participant never reads the lead's
 *     judgement), and nobody else's.
 *   - 'everybody in the check-in': what is shared with all of them (the session and weekly reports, which are served on through their
 *     own wrappers): items marked for the people in the check-in, never a lead-only one.
 *   - 'who hears a complaint': the admin or HR person a team member's complaint about the lead goes to (a-complaint-about-the-lead.ts)
 *     reads that complaint and what came with it, and nothing else. The lead never reads it, nor does anybody reading what is shared
 *     with the people in the check-in; the person who said it reads it as their own (Hafsah, 3 November 2026).
 * A correction kept on an item (its history) is read as the item now says: once fixed, it stays fixed.
 */
import { theAssessmentIn, THE_ITEM_SECTIONS, THE_SETUP_SECTIONS, THE_COMPARED_SECTIONS, KEPT_FROM_THE_LEAD, type AnItem, type TheAssessment } from './the-assessment';

export type TheReader =
  | { kind: 'the lead'; judgements: boolean }
  | { kind: 'the person'; participantId: string }
  | { kind: 'everybody in the check-in' }
  | { kind: 'who hears a complaint' };

export interface AFact {
  groundId: string;
  checkInId: string;
  /** The item's id in its assessment, so a correction can be kept on the very item (its history). */
  itemId: string;
  participantId: string;
  /** The person's name as the assessment wrote it. Pages that store text put their label in its place. */
  who: string;
  isTheLead: boolean;
  sessionNumber: number;
  /** When the conversation ended. */
  on: string | null;
  /** Where in the assessment it sits: 'numbers', 'promises', 'targets', 'compared.promisesDue' and so on. */
  section: string;
  /** Their own words, as the item now says (a backed correction replaces them). */
  words: string;
  /** What the item adds beside their words, in plain words: the figure and what it measures, the day, the next step. */
  detail: string | null;
  /** Whether it has proof behind it, where the item says. */
  proved: boolean;
  /** True where their words were found word for word in what they typed, so a report may quote them. */
  saidWordForWord: boolean;
  /** True where it was said while setting the check-in up, not in a check-in. */
  inSetup: boolean;
}

/* What judges a person: read only by the lead, and only while the switch is on. */
const WHAT_JUDGES_A_PERSON = new Set(['observations', 'roleSignals', 'areas', 'compared.disagreements']);
/* Not facts anybody said: names alone, and the questions Groundwork means to ask next. */
const NOT_A_FACT = new Set(['people', 'stillOpen']);

function mayRead(reader: TheReader, item: AnItem, section: string, participantId: string): boolean {
  if (item.whoMaySee === KEPT_FROM_THE_LEAD) return reader.kind === 'who hears a complaint' || (reader.kind === 'the person' && reader.participantId === participantId);
  if (reader.kind === 'who hears a complaint') return false;
  if (reader.kind === 'the lead') return !WHAT_JUDGES_A_PERSON.has(section) || reader.judgements;
  if (item.whoMaySee === 'the lead only') return false;
  if (reader.kind === 'the person') return reader.participantId === participantId;
  return item.whoMaySee === 'the people in this check-in';
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** What an item adds beside the words, from its own fields. */
function theDetailOf(section: string, i: AnItem): string | null {
  const parts: (string | null)[] = (() => {
    switch (section) {
      case 'numbers': return [text(i.figure), text(i.measures) && `for ${text(i.measures)}`];
      case 'promises': return [text(i.who) && `promised by ${text(i.who)}`, text(i.when) && `by ${text(i.when)}`];
      case 'workUpdates': return [text(i.work), text(i.stage) && `at ${text(i.stage)}`, text(i.value), text(i.nextStep) && `next ${text(i.nextStep)}`, text(i.nextStepDay) && `on ${text(i.nextStepDay)}`, text(i.nextStepOwner) && `by ${text(i.nextStepOwner)}`];
      case 'blockers': return [text(i.what) && `waiting for ${text(i.what)}`, text(i.onName) ?? text(i.onLabel), text(i.dueSaid) && `due ${text(i.dueSaid)}`];
      case 'dates': return [text(i.when), text(i.what)];
      case 'decisions': return [text(i.decision), text(i.state), text(i.whoDecides) && `decided by ${text(i.whoDecides)}`];
      case 'claims': return [text(i.claim), text(i.proofIs) && `proof ${text(i.proofIs)}`];
      case 'targets': return [text(i.aim)?.replace(/[.\s]+$/, '') ?? null, typeof i.target === 'number' ? String(i.target) : text(i.target), text(i.unit), text(i.by) && `by ${text(i.by)}`];
      case 'setup.team': return [text(i.name), text(i.role)];
      case 'setup.privateNotes': return [text(i.about) && `about ${text(i.about)}`];
      case 'compared.promisesDue': return [text(i.promise), text(i.outcome)];
      case 'compared.figuresChanged': return [text(i.what), text(i.before) && `was ${text(i.before)}`, text(i.now) && `now ${text(i.now)}`];
      default: return [];
    }
  })();
  const out = parts.filter(Boolean).join(', ');
  return out || null;
}

/** Every item of one assessment with the section it sits in. */
function everyItemWithItsSection(a: TheAssessment): { section: string; item: AnItem }[] {
  return [
    ...THE_ITEM_SECTIONS.flatMap((s) => ((a as any)[s] ?? []).map((item: AnItem) => ({ section: s as string, item }))),
    ...(a.setup ? THE_SETUP_SECTIONS.flatMap((s) => ((a.setup as any)[s] ?? []).map((item: AnItem) => ({ section: `setup.${s}`, item }))) : []),
    ...THE_COMPARED_SECTIONS.flatMap((s) => ((a.comparedWithLastTime as any)?.[s] ?? []).map((item: AnItem) => ({ section: `compared.${s}`, item }))),
    ...(a.keptFromTheLead?.items ?? []).map((item) => ({ section: String(item.readAs ?? 'aboutTheLead'), item })),
  ];
}

/** The facts in one assessment that this reader may read. Pure, so every page reads them the same way. */
export function theFactsIn(a: TheAssessment, reader: TheReader): AFact[] {
  const seen = new Set<string>();
  const inSetup = new Set((a.messages ?? []).filter((m) => m.where === 'setup').map((m) => m.n));
  const out: AFact[] = [];
  for (const { section, item } of everyItemWithItsSection(a)) {
    if (NOT_A_FACT.has(section)) continue;
    if (!mayRead(reader, item, section, a.about.participantId)) continue;
    const corrected = (item.history ?? []).filter((h) => h.backed).pop();
    const words = (corrected?.nowSays ?? item.words ?? '').trim();
    const detail = theDetailOf(section, item);
    if (!words && !detail) continue;
    /* The same words read into two parts (a promise and its date) are one fact, kept where first read. */
    const key = `${words.toLowerCase()}|${section.startsWith('setup.') ? section : ''}`;
    if (words && seen.has(key)) continue;
    seen.add(key);
    out.push({
      groundId: a.about.groundId, checkInId: a.about.checkInId, itemId: item.id, participantId: a.about.participantId, who: a.about.who,
      isTheLead: a.about.isTheLead, sessionNumber: a.about.sessionNumber, on: a.about.endedAt, section, words, detail,
      proved: item.proof === 'proved',
      saidWordForWord: !corrected && item.saidWordForWord === true,
      inSetup: (item.from ?? []).length > 0 && (item.from ?? []).every((n) => inSetup.has(n)),
    });
  }
  return out;
}

/**
 * THE ONE READER. The facts of every assessment in one check-in that this reader may read, oldest first. `participantIds` and the
 * dates narrow it; the reader's own rule is applied to every item whatever is asked for.
 */
export async function theFactsOnRecord(
  prisma: any,
  input: { groundId: string; reader: TheReader; participantIds?: string[]; since?: Date; until?: Date },
): Promise<AFact[]> {
  const only = input.reader.kind === 'the person' ? [input.reader.participantId] : input.participantIds;
  const rows = ((await Promise.resolve(prisma.checkIn?.findMany?.({
    where: {
      groundId: input.groundId,
      ...(only ? { participantId: { in: only } } : {}),
      ...(input.since || input.until ? { completedAt: { ...(input.since ? { gte: input.since } : {}), ...(input.until ? { lte: input.until } : {}) } } : {}),
    },
    orderBy: [{ completedAt: 'asc' }, { sessionNumber: 'asc' }],
    select: { sessionReport: true },
  })).catch(() => [])) ?? []) as { sessionReport: unknown }[];
  return rows.flatMap((r) => {
    const a = theAssessmentIn(r.sessionReport);
    return a ? theFactsIn(a, input.reader) : [];
  });
}

/**
 * A fact as one line of material for a model to read: the day, who said it and where, the kind of thing, how it is known, their words
 * and the detail. Who said it is on every line (assessment test, 2 November: Ruth was told "you said you had spent most of last week
 * building a dashboard", which Sarah said, because the line carried no name and only the heading above it did). `who` is the name, or
 * "you" for the person reading.
 */
export function aFactAsALine(f: AFact, day: (d: Date) => string, who: string = f.who): string {
  const kind = f.section.replace(/^setup\./, 'setup, ').replace(/^compared\./, 'since last time, ').replace(/([A-Z])/g, ' $1').toLowerCase();
  return `- ${f.on ? day(new Date(f.on)) : 'undated'}, ${who} said${f.inSetup ? ' in setup' : ''}, ${kind}, ${f.proved ? 'proven' : 'their word'}: ${f.words}${f.detail ? ` (${f.detail})` : ''}`;
}
