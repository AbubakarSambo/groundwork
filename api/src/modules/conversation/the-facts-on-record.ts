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
 *   - an item the lead said about a named person's work ('the lead and whom it is about') is read by the lead and that person only,
 *     never by everybody in the check-in (Hafsah, batch 2, item 1). The person reads it beside their own, with who said it.
 *   - an item about the speaker's wellbeing ('the person only') is read by the speaker alone, not even by the lead.
 *   - 'who hears a complaint': the admin or HR person a team member's complaint about the lead goes to (a-complaint-about-the-lead.ts)
 *     reads that complaint and what came with it, and nothing else. The lead never reads it, nor does anybody reading what is shared
 *     with the people in the check-in; the person who said it reads it as their own (Hafsah, 3 November 2026).
 * A correction kept on an item (its history) is read as the item now says: once fixed, it stays fixed.
 *
 * HOW IT STANDS (theStandingOf, the-assessment.ts, the one place): every fact carries it. Something the read says cannot be true as said
 * (10,000 freezers sold in a day, a delivery promised for a day already past) is read by the lead alone, as what was said, and by nobody
 * else: it is never offered back to the person, or shared, as fact or as something still open (Hafsah, 4 November 2026).
 */
import { theAssessmentIn, theStandingOf, theWordsThatCannotBeTrue, THE_ITEM_SECTIONS, THE_SETUP_SECTIONS, THE_COMPARED_SECTIONS, KEPT_FROM_THE_LEAD, THE_LEAD_AND_WHOM_IT_IS_ABOUT, type AnItem, type TheAssessment, type TheStanding } from './the-assessment';

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
  /** Whom it is about, when the lead said it about somebody else's work: that person's id, or null. */
  aboutParticipantId: string | null;
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
  /** How it stands: proved, said (their word only), or cannot be true as said. Only the lead reads one that cannot be true. */
  standing: TheStanding;
  /** True where their words were found word for word in what they typed, so a report may quote them. */
  saidWordForWord: boolean;
  /** True where it was said while setting the check-in up, not in a check-in. */
  inSetup: boolean;
  /** The item as one whole plain sentence to the person, written by the assessment for the read-back; null when it has none or was corrected. */
  saidBack?: string | null;
}

/* What judges a person: read only by the lead, and only while the switch is on. */
const WHAT_JUDGES_A_PERSON = new Set(['observations', 'roleSignals', 'areas', 'compared.disagreements']);
/* Not facts anybody said: names alone, and the questions Groundwork means to ask next. */
const NOT_A_FACT = new Set(['people', 'stillOpen']);

/**
 * Who may read one item. `inSetup` is true for an item read only from setup's words, which stay with whoever runs the check-in and
 * the lead who said them (Hafsah, 4 November 2026); her own update on where things stand is her first check-in, so it is not.
 * `aboutTheirTarget` is true for a person's own words about their target: where each person sees only their own target, those
 * words are read only by them and the lead, even in a shared check-in (Hafsah, 4 November 2026).
 */
function mayRead(reader: TheReader, item: AnItem, section: string, participantId: string, inSetup: boolean, aboutTheirTarget: boolean): boolean {
  if (item.whoMaySee === KEPT_FROM_THE_LEAD) return reader.kind === 'who hears a complaint' || (reader.kind === 'the person' && reader.participantId === participantId);
  if (reader.kind === 'who hears a complaint') return false;
  if (item.whoMaySee === 'the person only') return reader.kind === 'the person' && reader.participantId === participantId;
  if (reader.kind === 'the lead') return !WHAT_JUDGES_A_PERSON.has(section) || reader.judgements;
  if (item.whoMaySee === 'the lead only') return false;
  if (item.whoMaySee === THE_LEAD_AND_WHOM_IT_IS_ABOUT) {
    return reader.kind === 'the person' && (reader.participantId === participantId || (!!item.aboutParticipantId && reader.participantId === item.aboutParticipantId));
  }
  if (reader.kind === 'the person') return reader.participantId === participantId;
  return item.whoMaySee === 'the people in this check-in' && !inSetup && !aboutTheirTarget;
}

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

/** What an item adds beside the words, from its own fields. */
function theDetailOf(section: string, i: AnItem): string | null {
  const parts: (string | null)[] = (() => {
    switch (section) {
      case 'numbers': return [text(i.figure), text(i.measures) && `for ${text(i.measures)}`];
      /* The promise as one clear action, with what "it" stands for by name (batch 2, group 3; S12 "their buyer" said nobody's). */
      case 'promises': return [text(i.clear) ?? text(i.whatItMeans), text(i.who) && `promised by ${text(i.who)}`, text(i.when) && `by ${text(i.when)}`];
      case 'workUpdates': return [text(i.work), text(i.stage) && `at ${text(i.stage)}`, text(i.value), text(i.nextStep) && `next ${text(i.nextStep)}`, text(i.nextStepDay) && `on ${text(i.nextStepDay)}`, text(i.nextStepOwner) && `by ${text(i.nextStepOwner)}`];
      case 'blockers': return [text(i.what) && `waiting for ${text(i.what)}`, (text(i.onName) ?? text(i.onLabel)) && `with ${[text(i.onName), text(i.onLabel)].filter(Boolean).join(' in ')}`, text(i.dueSaid) && `due ${text(i.dueSaid)}`];
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

/** Who sees the targets on this check-in (Ground.whoSeesTargets). THEIR_OWN is the default, as it is on the ground. */
export type WhoSeesTheTargets = 'THEIR_OWN' | 'EVERYBODY';

const squashed = (s: unknown) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/** The facts in one assessment that this reader may read. Pure, so every page reads them the same way. */
export function theFactsIn(a: TheAssessment, reader: TheReader, whoSeesTargets: WhoSeesTheTargets = 'THEIR_OWN'): AFact[] {
  const seen = new Set<string>();
  const setupMessages = new Set((a.messages ?? []).filter((m) => m.where === 'setup').map((m) => m.n));
  /* Their words about a target, wherever else the same words were read (a target's words are often a number too). */
  const targetWords = new Set((a.targets ?? []).map((t) => squashed(t.words)).filter(Boolean));
  const cannot = theWordsThatCannotBeTrue(a);
  const out: AFact[] = [];
  /* A read the model could not give keeps every message whole so nothing is lost, but none of them is a line of the record: a "Nothing wrong. Thanks."
     * was listed as something the person said, and the read-back and the end card read from here (fix plan 16 November, groups 1 and 2). */
  const unread = a.measure?.modelFailed === true;
  for (const { section, item } of everyItemWithItsSection(a)) {
    if (NOT_A_FACT.has(section)) continue;
    if (unread && /^kept\./.test(String(item.id ?? ''))) continue;
    const standing = theStandingOf(item, cannot);
    if (standing === 'cannot be true' && reader.kind !== 'the lead') continue;
    const inSetup = (item.from ?? []).length > 0 && (item.from ?? []).every((n) => setupMessages.has(n));
    if (!mayRead(reader, item, section, a.about.participantId, inSetup, whoSeesTargets === 'THEIR_OWN' && (section === 'targets' || targetWords.has(squashed(item.words))))) continue;
    const corrected = (item.history ?? []).filter((h) => h.backed).pop();
    const words = (corrected?.nowSays ?? item.words ?? '').trim();
    const detail = theDetailOf(section, item);
    if (!words && !detail) continue;
    /*
     * The same words read into two parts (a promise and its date) are one fact, kept where first read. What the second part holds is kept
     * with it (WhatsApp test, 20 November 2026, C26): Chidi's "still chasing naivas PO" was a work update and a blocker, and the blocker's
     * "with Mercy in procurement at Naivas, due friday" was dropped with the second part, so Friday and Mercy were in no line.
     */
    const key = `${words.toLowerCase()}|${section.startsWith('setup.') ? section : ''}`;
    if (words && seen.has(key)) {
      const kept = out.find((f) => `${f.words.toLowerCase()}|${f.section.startsWith('setup.') ? f.section : ''}` === key);
      if (kept && detail && !(kept.detail ?? '').toLowerCase().includes(detail.toLowerCase())) {
        kept.detail = kept.detail ? `${kept.detail}, and ${detail.charAt(0).toLowerCase()}${detail.slice(1)}` : detail;
      }
      continue;
    }
    seen.add(key);
    out.push({
      groundId: a.about.groundId, checkInId: a.about.checkInId, itemId: item.id, participantId: a.about.participantId,
      aboutParticipantId: item.whoMaySee === THE_LEAD_AND_WHOM_IT_IS_ABOUT && typeof item.aboutParticipantId === 'string' ? item.aboutParticipantId : null,
      who: a.about.who,
      isTheLead: a.about.isTheLead, sessionNumber: a.about.sessionNumber, on: a.about.endedAt, section, words, detail,
      proved: standing === 'proved',
      standing,
      saidWordForWord: !corrected && item.saidWordForWord === true,
      inSetup,
      saidBack: !corrected && typeof item.saidBack === 'string' && item.saidBack.trim() ? item.saidBack.trim() : null,
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
  /* The ground owns who sees the targets; every page reads it from there, through here. */
  const ground = await Promise.resolve(prisma.ground?.findUnique?.({ where: { id: input.groundId }, select: { whoSeesTargets: true } })).catch(() => null);
  const whoSeesTargets: WhoSeesTheTargets = ground?.whoSeesTargets === 'EVERYBODY' ? 'EVERYBODY' : 'THEIR_OWN';
  const when = input.since || input.until ? { completedAt: { ...(input.since ? { gte: input.since } : {}), ...(input.until ? { lte: input.until } : {}) } } : {};
  const read = (where: Record<string, unknown>) => Promise.resolve(prisma.checkIn?.findMany?.({
    where: { groundId: input.groundId, ...where, ...when },
    orderBy: [{ completedAt: 'asc' }, { sessionNumber: 'asc' }],
    select: { sessionReport: true },
  })).then((r: any) => (Array.isArray(r) ? r : [])).catch(() => []) as Promise<{ sessionReport: unknown }[]>;
  /* A person also reads what the lead said about their work (Hafsah, batch 2, item 1): the lead's check-ins are read beside their own, and
     mayRead keeps only the items about them. */
  const [rows, theLeads] = await Promise.all([
    read(only ? { participantId: { in: only } } : {}),
    input.reader.kind === 'the person' ? read({ participant: { partyType: 'INITIATOR' }, participantId: { notIn: only ?? [] } }) : Promise.resolve([]),
  ]);
  const all = [...rows, ...theLeads];
  const seen = new Set<string>();
  const assessments = all.map((r) => theAssessmentIn(r.sessionReport)).filter((a): a is TheAssessment => {
    if (!a || seen.has(a.about.checkInId)) return false;
    seen.add(a.about.checkInId);
    return true;
  });
  /* Oldest first across both reads; within one read, as it came. */
  if (theLeads.length) assessments.sort((a, b) => String(a.about.endedAt ?? '').localeCompare(String(b.about.endedAt ?? '')));
  return assessments.flatMap((a) => theFactsIn(a, input.reader, whoSeesTargets));
}

/**
 * A fact as one line of material for a model to read: the day, who said it and where, the kind of thing, how it is known, their words
 * and the detail. Who said it is on every line (assessment test, 2 November: Ruth was told "you said you had spent most of last week
 * building a dashboard", which Sarah said, because the line carried no name and only the heading above it did). `who` is the name, or
 * "you" for the person reading.
 */
export function aFactAsALine(f: AFact, day: (d: Date) => string, who: string = f.who): string {
  const kind = f.section.replace(/^setup\./, 'setup, ').replace(/^compared\./, 'since last time, ').replace(/([A-Z])/g, ' $1').toLowerCase();
  return `- ${f.on ? day(new Date(f.on)) : 'undated'}, ${who} said${f.inSetup ? ' in setup' : ''}, ${kind}, ${f.standing === 'proved' ? 'proven' : f.standing === 'said' ? 'their word' : 'their word, and it cannot be true as said'}: ${f.words}${f.detail ? ` (${f.detail})` : ''}`;
}
