/**
 * The board's reads about people, as pure functions over plain data.
 *
 * WHY THIS FILE EXISTS
 *
 * These reads used to live inside BoardService, each one issuing its own Prisma
 * queries. That made them impossible to check: the only way to find out what the
 * board would say about someone was to run a twelve-session conversation against
 * a live model and look. Two separate fixes to the same read regressed between
 * runs without anyone noticing, because nothing could tell us they had.
 *
 * So the deciding is separated from the fetching. The service fetches; this file
 * decides. Everything here is a pure function of its input, which means the
 * captured output of a real run can be replayed through it in milliseconds and
 * asserted against what is actually true about each person
 * (see __fixtures__/ground-truth.ts).
 *
 * The rule that follows from that: no read logic goes back into the service. If
 * it decides something about a person, it belongs here where it can be checked.
 */
import { CheckInStatus, DependencyStatus } from '@prisma/client';
import { wasAQuietClose } from '../grounds/an-answer-includes-a-refusal';
import {
  CoverageKind,
  CoverageRead,
  classifyCoverageReason,
} from './coverage';
import { roleMapFor, priorFunctionFromRole } from './role-maps';
import { aFunctionThatMayBeUsed } from './function-detection';
import { anArticleSaidMidSentence } from './a-holder-in-their-own-words';

// ---------------------------------------------------------------------------
// Input shapes - plain data, no Prisma client, no ground object.
// ---------------------------------------------------------------------------

export type ReadParticipant = {
  id: string;
  roleAsDescribed: string | null;
  managingOnly: boolean;
  detectedFunction: string | null;
  detectedFunctionConfidence: number | null;
  /** When the person or their lead confirmed the read (decision 57, item 5). A confirmed role is used like a confident one. */
  detectedFunctionConfirmedAt?: Date | string | null;
};

export type ReadCheckIn = {
  participantId: string;
  sessionNumber: number;
  status: CheckInStatus;
  isSetup?: boolean | null;
  closedReason?: string | null;
  turns?: unknown[] | null;
};

/* A check-in they gave an account in: finished, not the set-up, and not one the clock closed with nothing from them (the one rule the
   session count reads, an-answer-includes-a-refusal.ts). The row and the count beside it read this, so a row never says "has not checked
   in yet" beside a count that has them in, or the other way round (release test, 21 November 2026). */
const gaveAnAccount = (c: ReadCheckIn): boolean => c.status === CheckInStatus.COMPLETED && !c.isSetup && !wasAQuietClose(c);

export type ReadEntry = {
  participantId: string;
  /** Session the entry was recorded in; null when it is not tied to a check-in. */
  sessionNumber: number | null;
  text: string;
  /**
   * How checkable the line is, from its own column. Null on rows written before that column existed
   * - those still carry the marker inside `text` and `rawTier` parses it. Optional so a caller that
   * does not select it reads as "not known" rather than as LOW.
   */
  verifiability?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
};

export type ReadMention = {
  sourceParticipantId: string;
  aboutParticipantId: string;
  kind: string; // CREDIT | COVERAGE | BLOCKED_BY
  sessionNumber: number;
};

export type ReadDependency = {
  fromParticipantId: string;
  onParticipantId: string | null;
  onLabel: string | null;
  what: string;
  status: DependencyStatus;
  /**
   * Whether they named the thing, as the model read it. Null on every row written before the
   * column existed, and on those the word-list rule stands in - see theyNamedWhatTheyAreWaitingOn.
   */
  namedTheThing?: boolean | null;
  /** When somebody escalated it, where they did. The record that it was chased. */
  escalatedAt?: Date | null;
  /** Sort key only. A number is enough and keeps fixtures readable. */
  createdAt?: Date | number;
};

export type ReadInput = {
  participants: ReadParticipant[];
  checkIns: ReadCheckIn[];
  entries: ReadEntry[];
  mentions: ReadMention[];
  dependencies: ReadDependency[];
  /**
   * Do the people on this ground actually work together?
   *
   * On a cohort - many people in the same role, each in a different place,
   * deliberately not influencing each other - they do not. That is not a
   * property of what they happened to say; it is what the ground IS, so it comes
   * from the scenario family rather than being guessed at from the record.
   *
   * It matters because every fairness read is built on colleagues describing
   * each other. Where there are no colleagues, some of those reads cannot be
   * made honestly at all. Defaults to true, so a caller that does not know
   * assumes collaboration and keeps the existing behaviour.
   */
  peopleWorkTogether?: boolean;
  /**
   * WHETHER THIS KIND OF CHECK-IN RUNS AGAINST A ROLE AT ALL.
   *
   * Same shape as `peopleWorkTogether` and for the same reason: it is what the ground IS, not
   * something to guess from the record. A team update asks everybody one question; nobody has a
   * remit in it, and "the role was never clearly defined" read as an instruction to go and fix
   * something that was never part of the situation. Defaults to true, so a caller that does not
   * know keeps the existing behaviour.
   */
  situationHasRoles?: boolean;
};

export type NameOf = (participantId: string) => string | null;

// ---------------------------------------------------------------------------
// How sure are we? (F2)
// ---------------------------------------------------------------------------

/**
 * Below this, a read is computed but NOT shown.
 *
 * Every read here is built on top of an extraction step that a language model
 * performed, which means none of it is certain. Showing a confident-sounding
 * sentence about someone's contribution on the back of two data points is the
 * failure mode this product cannot afford: it is the sentence a manager
 * remembers. So each read carries how much evidence sits under it, and a read
 * that thin is withheld rather than hedged - a hedge still gets read as a
 * verdict.
 */
export const MIN_READ_CONFIDENCE = 0.45;

export type Confidence = {
  /** 0-1. How much this read should be trusted. */
  confidence: number;
  /** How many separate pieces of evidence it rests on. */
  evidenceCount: number;
  /** Whether it clears the floor and may be shown at all. */
  shown: boolean;
  /** Plain-language statement of what it rests on, always displayed with it. */
  basis: string;
};

/**
 * Confidence rises with the AMOUNT of evidence and with CORROBORATION.
 *
 * Corroboration matters more than volume: one colleague independently naming
 * what someone did is worth more than five self-reported lines, because the
 * self-reported lines all come from the same person with the same incentive.
 */
export function confidenceOf(args: {
  sessions: number;
  checkableEntries: number;
  corroborations: number;
}): Confidence {
  const { sessions, checkableEntries, corroborations } = args;
  const evidenceCount = checkableEntries + corroborations;

  // Sessions set the ceiling: nothing read off one or two check-ins deserves
  // to be stated confidently no matter how much was said in them.
  const ceiling = sessions <= 1 ? 0.3 : sessions === 2 ? 0.5 : sessions < 5 ? 0.8 : 1;
  const fromVolume = Math.min(0.5, checkableEntries * 0.08);
  const fromCorroboration = Math.min(0.4, corroborations * 0.15);
  const confidence = Math.min(ceiling, 0.15 + fromVolume + fromCorroboration);

  const parts: string[] = [`${sessions} check-in${sessions === 1 ? '' : 's'}`];
  parts.push(`${checkableEntries} checkable thing${checkableEntries === 1 ? '' : 's'} named`);
  parts.push(
    corroborations
      ? `${corroborations} independently confirmed by someone else`
      : 'none of it confirmed by anyone else',
  );

  return {
    confidence: Math.round(confidence * 100) / 100,
    evidenceCount,
    shown: confidence >= MIN_READ_CONFIDENCE,
    basis: `Based on ${parts.join(', ')}.`,
  };
}

// ---------------------------------------------------------------------------
// Handoffs
// ---------------------------------------------------------------------------

const stamp = (d?: Date | number) => (d instanceof Date ? d.getTime() : (d ?? 0));

/**
 * THE SAME WAIT, SAID IN DIFFERENT WORDS (found on the anchor's "What's still stuck": "Juma is waiting on Wanjiru for permission to call dispatch" and
 * "Juma is waiting on Wanjiru for confirmation that it's fine to call dispatch" were both listed). Two waits are one when the same person waits on the
 * same other person and the thing they wait for is the same once the words that only ask for it are taken away (permission, confirmation, approval,
 * "fine to"): what is left of the shorter one, at least two words, is all in the longer. Done in code, so no model decides it.
 */
const WORDS_THAT_ONLY_ASK = new Set([
  'the', 'a', 'an', 'my', 'our', 'his', 'her', 'their', 'this', 'that', 'these', 'those', 'some', 'any', 'more', 'for', 'to', 'of', 'on', 'in', 'from', 'with', 'and', 'or', 'about', 'if', 'whether', 'is', 'are', 'be', 'it', 'its', 'they', 'them', 'fine', 'ok', 'okay', 'alright', 'allowed', 'can', 'could', 'may', 'should', 'will', 'would', 'go', 'ahead', 'permission', 'confirmation', 'confirm', 'confirmed', 'approval', 'approve', 'approved', 'authorisation', 'authorization', 'clearance', 'agreement', 'word', 'say', 'so', 'yes', 'nod',
  /* "A decision on the KES 4,500 price", "an answer about the KES 4,500 price": asking for a decision or an answer on a thing is asking for the thing (Drop Access run 1, item 14). */
  'decision', 'decide', 'answer', 'reply', 'response',
  /* A to-do is said "Sort out ..." or "Decide on ...": those words only ask too. */
  'sort', 'out',
]);
/* "4,500" is one number, never "4" and "500". */
const coreOfAWait = (what: string | null | undefined): Set<string> =>
  new Set(
    String(what ?? '').toLowerCase().replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !WORDS_THAT_ONLY_ASK.has(w)),
  );
/** An amount in a wait's words: a number of three digits or more ("4500" from "KES 4,500"). */
const AN_AMOUNT = /^\d{3,}$/;
export function theSameWaitInOtherWords(
  a: { fromParticipantId?: string | null; onParticipantId?: string | null; onLabel?: string | null; what?: string | null },
  b: { fromParticipantId?: string | null; onParticipantId?: string | null; onLabel?: string | null; what?: string | null },
): boolean {
  if (!a.fromParticipantId || a.fromParticipantId !== b.fromParticipantId) return false;
  const label = (x: { onLabel?: string | null }) => String(x.onLabel ?? '').trim().toLowerCase();
  const sameHolder = a.onParticipantId || b.onParticipantId ? a.onParticipantId === b.onParticipantId : !!label(a) && label(a) === label(b);
  if (!sameHolder) return false;
  if (theSameThingInOtherWords(a.what, b.what)) return true;
  /*
   * ONE WAIT PER HOLDER AND THING (Drop Access short run, item 9). Mercy waited on Joseph for "the sample units he promised" (12
   * October) and for "the samples for Tuskys Westgate" (14 October), and every board listed both. On the same colleague, a thing
   * that is one word once the words that only say how many or whose are gone ("sample"), named again in the other wait, is that
   * thing: one wait. Only for a colleague in the check-in, where the holder is surely the same person.
   */
  if (!a.onParticipantId || a.onParticipantId !== b.onParticipantId) return false;
  const x = theThingItself(a.what);
  const y = theThingItself(b.what);
  return x.size >= 1 && x.size === y.size && [...x].every((w) => y.has(w));
}

/* The words that say how many, whose or for whom, not what: "the sample units he promised" and "the samples for Tuskys Westgate" are both "sample"; "the budget review for the north region" is "budget review", never "budget". */
const ONLY_HOW_MANY_OR_WHOSE = new Set(['unit', 'piece', 'item', 'thing', 'stuff', 'promised', 'promise', 'said', 'agreed', 'owed', 'one', 'lot', 'set', 'batch', 'him', 'she', 'he', 'they']);
const theThingItself = (what: string | null | undefined): Set<string> =>
  new Set([...coreOfAWait(String(what ?? '').replace(/\s+(?:for|at|from|to|so|by)\s+.*$/i, ''))].map((w) => (w.length > 4 ? w.replace(/(?:ies)$/, 'y').replace(/(?<=[^s])s$/, '') : w)).filter((w) => !ONLY_HOW_MANY_OR_WHOSE.has(w) && !/^\d/.test(w)));

/** The thing two waits are for, the same once the words that only ask for it are taken away, or the same amount and another word of it in common. */
export function theSameThingInOtherWords(aWhat: string | null | undefined, bWhat: string | null | undefined): boolean {
  const x = coreOfAWait(aWhat);
  const y = coreOfAWait(bWhat);
  const [small, big] = x.size <= y.size ? [x, y] : [y, x];
  if (small.size >= 2 && [...small].every((w) => big.has(w))) return true;
  /*
   * THE SAME AMOUNT FOR THE SAME THING (Drop Access run 1, item 14). Joseph waited on Grace for "a decision on the KES 4,500 price for Juja
   * Hardware" and for "approval on the KES 4,500 price for 5 units", and Grace's morning summary listed both: the same price, the same
   * customer's five units, told twice. Same person, same holder, the same amount and another word of the thing in common is one wait.
   */
  const shared = [...small].filter((w) => big.has(w));
  return shared.some((w) => AN_AMOUNT.test(w)) && shared.some((w) => !AN_AMOUNT.test(w) && !/^\d/.test(w) && w !== 'kes' && w !== 'ksh' && w !== 'ngn' && w !== 'usd');
}

/**
 * Collapse handoffs that are really the same one.
 *
 * Extraction dedupes on write, but every ground created before that fix has the
 * duplicates already - 27 rows for about 4 real handoffs in the live run, which
 * made the summary read "13 blocked" when 2 people were. Deduping on READ too
 * means existing grounds are fixed as well as new ones.
 *
 * The newest row wins, because a handoff someone has stopped describing as
 * blocking is no longer blocking.
 */
export function dedupeDependencies<T extends ReadDependency>(deps: T[], alsoKeep?: (kept: T, said: T) => void): T[] {
  const norm = (t: string) =>
    (t ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\b(the|a|an|my|our|his|her|their|this|that|some|more|any|for|to)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const out: T[] = [];
  for (const d of [...deps].sort((a, b) => stamp(a.createdAt) - stamp(b.createdAt))) {
    const key = norm(d.what);
    const hit = out.find(
      (e) =>
        e.fromParticipantId === d.fromParticipantId &&
        (norm(e.what) === key || norm(e.what).includes(key) || key.includes(norm(e.what)) || theSameWaitInOtherWords(e, d)),
    );
    if (hit) {
      (hit as any).status = d.status;
      /*
       * THE NEWEST STATUS, THE FULLEST WORDS - and they are not the same choice.
       *
       * This took the newest text too, and the newest is often the shortest: somebody says "the
       * finance sign-off" in one round and "finance sign-off" in the next. Two words instead of
       * three, and `blockerHasSubstance` needs three - so merging a real blocker with a briefer
       * restatement of itself pushed it under the bar and the board stopped showing it at all.
       * Found by counting blockers for the check-in list and getting none where there was one.
       *
       * The note above is about STATUS, and it still holds: a handoff nobody is describing as
       * blocking any more is no longer blocking. It was never an argument for forgetting the better
       * description of the thing.
       */
      if ((d.what ?? '').trim().length > ((hit as any).what ?? '').trim().length) (hit as any).what = d.what;
      (hit as any).onParticipantId = d.onParticipantId ?? hit.onParticipantId;
      (hit as any).onLabel = d.onLabel ?? hit.onLabel;
      /* Each time it was said, kept so the board can say how often it was raised (request 107 c). */
      (hit as any).raisedAt = [...((hit as any).raisedAt ?? []), { at: d.createdAt ?? null, checkInId: (d as any).sourceCheckInId ?? null }];
      /* Every row it stands for, so a message about it is one item for all of them, by the record's ids (Drop Access run 1, item 14). */
      (hit as any).ids = [...((hit as any).ids ?? [(hit as any).id]), (d as any).id].filter(Boolean);
      /* What they said they tried, from whichever time they said it: the fullest, with when it was said (item 18). */
      const tried = String((d as any).triedSaid ?? '').trim();
      if (tried && tried.length > String((hit as any).triedSaid ?? '').trim().length) { (hit as any).triedSaid = tried; (hit as any).triedSaidAt = d.createdAt ?? null; }
      else if (!(hit as any).triedSaidAt && String((hit as any).triedSaid ?? '').trim()) (hit as any).triedSaidAt = hit.createdAt ?? null;
      /* Anything else a caller needs kept from a later mention. No caller passes it, nothing changes. */
      alsoKeep?.(hit, d);
      continue;
    }
    out.push({ ...d, raisedAt: [{ at: d.createdAt ?? null, checkInId: (d as any).sourceCheckInId ?? null }] } as T);
  }
  return out;
}

/**
 * Does this handoff have enough substance to protect the person behind it? (R3)
 *
 * "Blocked" switches off every negative read about someone, which makes it the
 * most valuable thing on the board to claim. If a passing remark in one sentence
 * were enough, the honest way to look productive would be to mention being stuck
 * once and never again - and the person genuinely stuck for six sessions would be
 * indistinguishable from them.
 *
 * A claim counts when it says who and what. Naming the person it sits with, or
 * describing the thing being waited on in more than a couple of words, is the
 * bar - it is low on purpose, because the aim is to exclude the throwaway
 * mention, not to make people prove they are stuck.
 */
export function blockerHasSubstance(d: ReadDependency): boolean {
  const open = d.status === DependencyStatus.BLOCKING || d.status === DependencyStatus.WAITING;
  if (!open) return false;

  // YOU CANNOT BE BLOCKED ON YOURSELF.
  //
  // A lead saying "I still owe the team the decision on the budget" was recorded
  // as a handoff from her to herself, and the board then read it as "part of this
  // is blocked on someone else, which is different from being behind". She was
  // the someone else. Being blocked switches off every negative read about a
  // person, so this hands the one who is actually holding a decision up the exact
  // protection meant for the people waiting on them - and it is the easiest
  // possible thing to trip accidentally, because naming your own outstanding
  // decision is a normal thing to say in a check-in.
  if (d.onParticipantId && d.onParticipantId === d.fromParticipantId) return false;
  const named = !!d.onParticipantId || !!d.onLabel?.trim();
  const described = (d.what ?? '').trim().split(/\s+/).filter(Boolean).length >= 3;
  return named && described;
}

/** Who is genuinely waiting on someone else, after deduping and the substance bar. */
export function blockedParticipantIds(deps: ReadDependency[]): Set<string> {
  return new Set(dedupeDependencies(deps).filter(blockerHasSubstance).map((d) => d.fromParticipantId));
}

// ---------------------------------------------------------------------------
// Contribution against role
// ---------------------------------------------------------------------------

/**
 * An admission that nothing happened, dressed as a record entry.
 *
 * "I have not closed anything since Loop, if I am honest" was stored as MEDIUM
 * verifiability in the live run - an admission of absence counted as evidence of
 * work. The conversation's specificity counter already understands negation;
 * the tier stamped on the stored entry never learned it, so the honest person
 * saying they have nothing scored the same as the person who shipped.
 */
/**
 * A SENTENCE THAT CONTAINS A NEGATION IS NOT A SENTENCE ABOUT AN ABSENCE.
 *
 * This was `\b(nothing|not|no|none|never|without|...)\b` anywhere in the text, and it demoted the
 * entry to LOW. Almost every real sentence contains one of those words. From a live run:
 *
 *   "Daniel should be taking escalations to Amara, not to me, from the first week of September."
 *   "The escalation log shows Amara as the approver on every escalation raised after 1 September,
 *    and my name on none of them."
 *
 * Both name a person, a date and a document. Both were demoted, on "not" and on "none". With every
 * entry demoted, `checkable` fell to zero for everybody, and the report told each person, about
 * themselves and about each other, "Nothing named so far could be checked by anyone else - no named
 * people, organisations, numbers or dates." That is the most damaging false sentence this product
 * can print, and it printed on the first live run of a session in which four dates and three names
 * were given.
 *
 * WHAT THE RULE WAS FOR, which is still worth having: an entry whose whole content is an absence -
 * "nothing to report", "we have not started" - carries no evidence no matter what tier the
 * extraction stamped on it. So the absence has to be what the sentence is ABOUT: it leads the
 * sentence or it is the whole of it.
 */
const ADMITS_ABSENCE = new RegExp(
  [
    /* The absence leads the sentence, or is the whole of it. */
    /(^|[.;:]\s*)(nothing|none|nobody|no one|not much|no update|no progress)\b/.source,
    /* Or somebody is saying plainly that they did not do a thing - "I have not closed anything
       since Loop, if I am honest", which is the sentence this rule was written for. The subject is
       the speaker or the team, so a contrast about somebody else ("to Amara, not to me") is not
       caught by it. */
    /\b(i|we|they|nobody|no one)\s+(have|has|had)\s*n[o']?t\b/.source,
    /\b(there|that)\s+(is|are|was|were)\s+(no|nothing)\b/.source,
    /\bnothing\s+(has|was|is|to report)\b/.source,
  ].join('|'),
  'i',
);

/**
 * AND A DATE, A NUMBER OR A NAMED THING OUTRANKS IT EITHER WAY.
 *
 * "Nothing has moved on the migration since 4 August" leads with an absence and is still one of the
 * most checkable things anybody can say: somebody else can go and look at 4 August. The demotion is
 * for an entry with nothing in it to check, so an entry that carries something to check is never
 * demoted.
 */
const CARRIES_SOMETHING_TO_CHECK =
  /\b(\d)|\b(january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;

/**
 * HOW CHECKABLE THIS LINE IS: the column where there is one, the old prefix where there is not.
 *
 * The marker used to live on the front of the text. It is a column now, because it reached a page
 * twice - but every row written before that still carries it inline, and reading those as LOW would
 * quietly flatten the specificity read on all of them.
 */
const rawTier = (text: string, stored?: 'HIGH' | 'MEDIUM' | 'LOW' | null): 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (stored) return stored;
  const m = /^\[VERIFIABILITY:(HIGH|MEDIUM|LOW)\]/.exec(text ?? '');
  return (m?.[1] as any) ?? 'LOW';
};

const body = (text: string) =>
  (text ?? '')
    .replace(/^\[VERIFIABILITY:(HIGH|MEDIUM|LOW)\]\s*/, '')
    .replace(/\[INFERRED:[^\]]*\]/g, '')
    .trim();

const tierOf = (text: string, stored?: 'HIGH' | 'MEDIUM' | 'LOW' | null): 'HIGH' | 'MEDIUM' | 'LOW' => {
  const t = body(text);
  if (CARRIES_SOMETHING_TO_CHECK.test(t)) return rawTier(text, stored);
  return ADMITS_ABSENCE.test(t) ? 'LOW' : rawTier(text, stored);
};

/**
 * "SPECIFIC ENOUGH TO CHECK LATER" HAS TO HOLD SOMETHING SOMEBODY COULD CHECK. Rerun, 20 Sep 2026:
 * a borrower who said only "the payments are being made", "my income is improving" and "the main
 * thing is the loan is being paid" was read as "6 of 7 items are specific enough to check later",
 * because extraction had marked those lines HIGH. The mark is the model's opinion; this asks the
 * line. A number, a date, a name that is not the first word, or a thing that can be opened counts.
 * "Always on time" does not.
 */
const A_NAMED_THING = /[^.!?]\s([A-Z][a-z]{2,})\b/;
const A_THING_TO_OPEN = /\b(invoice|receipt|contract|ledger|report|spreadsheet|sheet|document|deck|email|message|photo|screenshot|record|statement|form|order|proposal|tracker|dashboard|system)s?\b/i;
/* "All fourteen", "two candidates", "week seven": a number written as a word is still a number. */
const A_NUMBER_IN_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|fourteenth|nineteenth|twentieth)\b/i;
export const saysSomethingCheckable = (text: string): boolean => {
  const t = body(text);
  if (!t || ADMITS_ABSENCE.test(t)) return false;
  return CARRIES_SOMETHING_TO_CHECK.test(t) || A_NUMBER_IN_WORDS.test(t) || A_NAMED_THING.test(t) || A_THING_TO_OPEN.test(t);
};

/**
 * Drop the echoes of an achievement already on the record.
 *
 * In the live run "I closed Loop this week" was stored as a fresh HIGH entry in
 * sessions 1, 2 AND 4 - one customer, three pieces of evidence. People restate
 * their last win when they have nothing new, which is human and not dishonest,
 * but counting it again each time fills a quiet stretch with the same old news
 * and makes a person who has stopped delivering look steady. The one person in
 * the run who genuinely went quiet read as "steady across the period" for
 * exactly this reason.
 *
 * The FIRST time something is said is the evidence. Every restatement after it
 * is a repeat, and repeats are dropped rather than counted.
 */
export function withoutRepeats<T extends { participantId: string; text: string; sessionNumber: number | null }>(
  entries: T[],
): T[] {
  const norm = (t: string) =>
    body(t)
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const seen = new Map<string, Set<string>>();
  const ordered = [...entries].sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));
  const keep: T[] = [];
  for (const e of ordered) {
    const key = norm(e.text);
    if (!key) continue;
    const mine = seen.get(e.participantId) ?? new Set<string>();
    // Substring either way, because a restatement is rarely word-perfect.
    const repeat = [...mine].some((k) => k === key || (key.length > 15 && (k.includes(key) || key.includes(k))));
    if (repeat) continue;
    mine.add(key);
    seen.set(e.participantId, mine);
    keep.push(e);
  }
  return keep;
}

/** Plain-language shape of someone's record over the sessions that have run. */
export function shapeOf(bySession: Map<number, number>, lastSession: number): string | null {
  if (lastSession < 3) return null;
  const at = (n: number) => bySession.get(n) ?? 0;
  const third = Math.max(1, Math.floor(lastSession / 3));
  const sum = (from: number, to: number) => {
    let t = 0;
    for (let i = from; i <= to; i++) t += at(i);
    return t;
  };
  const early = sum(1, third);
  const late = sum(third * 2 + 1, lastSession);

  let longestGap = 0,
    run = 0,
    gapEnd = 0;
  for (let i = 1; i <= lastSession; i++) {
    if (at(i) === 0) {
      run++;
      if (run > longestGap) {
        longestGap = run;
        gapEnd = i;
      }
    } else run = 0;
  }

  if (longestGap >= 3) {
    const gapStart = gapEnd - longestGap + 1;
    const recovered = late > 0 && gapEnd < lastSession;
    return recovered
      ? `Nothing checkable from check-in ${gapStart} to ${gapEnd}, then picked up again. The middle of this period is the part worth asking about, not the total.`
      : `Nothing checkable since check-in ${gapStart}.`;
  }
  if (early > 0 && late === 0) return 'Contributed early, nothing checkable in the most recent check-ins.';
  if (early === 0 && late > 0) return 'Slow start, contributing now.';
  if (early > 0 && late > 0) return 'Steady across the period.';
  return null;
}

export type ContributionRead = {
  participantId: string;
  name: string | null;
  remit: string | null;
  remitDefined: boolean;
  position: null;
  positionLabel?: null;
  reason: string | null;
  note?: string;
  fn?: string | null;
  fnLabel?: string | null;
  fnConfident?: boolean;
  isBlocked?: boolean;
  ownVoice?: null;
  guard?: string;
  /** Nothing they have said so far could be checked by somebody else. The one form of the rating a
      lead may read, as "Nothing checkable" beside the name (decisions 40 and 43). */
  nothingCheckable?: boolean;
  /** They have not finished a check-in yet, so there are no answers to read at all (request 116 c). */
  notCheckedInYet?: boolean;
} & Partial<Confidence>;

/**
 * Contribution against role: each person read in THEIR function's own terms,
 * never on one shared scale, because tech and sales do not share a unit.
 *
 * Three hard rules enforced here:
 *  - An UNDEFINED remit shows NO position at all. You cannot measure someone
 *    against a bar that was never set, and an undefined role is often the real
 *    problem rather than the person.
 *  - A position is never returned without its reason attached.
 *  - A read too thin to trust is withheld, not softened.
 */
export function buildContribution(input: ReadInput, nameOf: NameOf): ContributionRead[] {
  const blocked = blockedParticipantIds(input.dependencies);
  const entries = withoutRepeats(input.entries);
  // Whether anyone here is in a position to confirm anyone else's account. On a
  // cohort of people who each work somewhere different, nobody is - and a lead
  // reading these needs telling that, because it is the difference between "no
  // second account agrees" and "no second account exists".
  const peopleWorkTogether = input.peopleWorkTogether !== false;
  const theSituationHasRoles = input.situationHasRoles !== false;
  const lastSession = input.checkIns.reduce((m, c) => Math.max(m, c.sessionNumber), 0);

  return input.participants
    .filter((p) => !p.managingOnly)
    .map((p): ContributionRead => {
      const remitDefined = !!p.roleAsDescribed?.trim();
      if (!remitDefined) {
        return {
          participantId: p.id,
          name: nameOf(p.id),
          remit: p.roleAsDescribed ?? null,
          remitDefined: false,
          position: null,
          reason: null,
          /*
           * AND NOT THE ROLE SENTENCE WHERE THERE IS NO ROLE IN THE SITUATION.
           *
           * Read on a live team update: "the role was never clearly defined, so there is no
           * boundary to measure work against". True of the field and irrelevant to the card, which
           * asks a team one question and never mentions a role. Telling a lead to go and define
           * one, on a situation built not to have one, is advice about a different product.
           */
          note: theSituationHasRoles
            ? 'No position shown, because the role was never clearly defined. Define what it is responsible for before assessing anyone against it. An undefined role is often the real problem, not the person.'
            : 'No position shown. This situation does not run against a role, so there is nothing to read anyone against.',
          confidence: 0,
          evidenceCount: 0,
          shown: false,
          basis: theSituationHasRoles
            ? 'No role was defined, so there is nothing to read against.'
            : 'This situation does not run against a role.',
        };
      }

      const map = roleMapFor(p.detectedFunction as any);
      /* Confident, or confirmed by the person or their lead: the same rule the coach uses (aFunctionThatMayBeUsed). */
      const fnConfident = aFunctionThatMayBeUsed(
        { fn: p.detectedFunction as any, confidence: p.detectedFunctionConfidence ?? 0 },
        p.detectedFunctionConfirmedAt ? new Date(p.detectedFunctionConfirmedAt) : null,
      );
      const mine = input.checkIns.filter((c) => c.participantId === p.id);
      const completed = mine.filter(gaveAnAccount).length;

      /*
       * NOBODY GETS A READ ON ANSWERS THEY NEVER GAVE (request 116 c). Faraji Odhiambo had never
       * checked in on "Sales team, Q3", and the lead read "Nothing Faraji Odhiambo has said so far is
       * checkable": a read on what he said, when he had said nothing. With no finished check-in there
       * are no answers to read, so the row says that and nothing else, and is never "nothing checkable".
       */
      if (completed === 0) {
        return {
          participantId: p.id,
          name: nameOf(p.id),
          remit: p.roleAsDescribed,
          remitDefined: true,
          position: null,
          positionLabel: null,
          reason: `${nameOf(p.id) ?? 'This person'} has not checked in yet.`,
          isBlocked: blocked.has(p.id),
          ownVoice: null,
          nothingCheckable: false,
          notCheckedInYet: true,
          confidence: 0,
          evidenceCount: 0,
          shown: true,
          basis: 'Nothing is on record yet, because there has been no check-in.',
        };
      }

      const myEntries = entries.filter((e) => e.participantId === p.id);
      const worthChecking = myEntries.filter((e) => tierOf(e.text, e.verifiability) !== 'LOW' && saysSomethingCheckable(e.text));
      const high = worthChecking.filter((e) => tierOf(e.text, e.verifiability) === 'HIGH').length;
      const medium = worthChecking.length - high;
      const checkable = high + medium;
      const bySession = new Map<number, number>();
      for (const e of myEntries) {
        if (e.sessionNumber == null) continue;
        bySession.set(e.sessionNumber, (bySession.get(e.sessionNumber) ?? 0) + (worthChecking.includes(e) ? 1 : 0));
      }

      // CORROBORATION, not counting. (R1)
      //
      // How much someone typed is a measure of how they write. Whether anyone
      // else independently named what they did is a measure of whether it
      // happened. The person who describes their work modestly and the person
      // who describes it lavishly produce very different totals for the same
      // week of work; only corroboration tells them apart.
      const corroborations = input.mentions.filter(
        (m) => m.aboutParticipantId === p.id && m.sourceParticipantId !== p.id && m.kind === 'CREDIT',
      ).length;

      const conf = confidenceOf({ sessions: completed, checkableEntries: checkable, corroborations });
      const isBlocked = blocked.has(p.id);

      // A READ THAT ONLY REPORTS AN ABSENCE IS HONEST AT ANY CONFIDENCE.
      //
      // The floor exists to stop thin evidence turning into a verdict about a
      // person. "Nothing named so far could be checked by anyone else" is not a
      // verdict - it is a statement about what the record contains, and it is the
      // single most useful thing to tell a lead who has to make a decision about
      // someone. Withholding it for low confidence produced silence about exactly
      // the person the product should have had something to say about, which is
      // the opposite of the intent.
      const onlyReportsAbsence = checkable === 0;

      // NO on-track / below-track label. Any threshold that produced one would
      // be invented, and a label reads as a score on the person no matter how
      // it is worded. What the record actually shows is the read; that is all
      // this returns.
      const reasonParts: string[] = [];
      if (myEntries.length === 0) {
        reasonParts.push(`${completed} check-in${completed === 1 ? '' : 's'} on record, nothing specific named yet.`);
      } else if (checkable === 0) {
        reasonParts.push(
          `${completed} check-in${completed === 1 ? '' : 's'} on record. Nothing named so far could be checked by anyone else, because no people, organisations, numbers or dates were named.`,
        );
      } else {
        reasonParts.push(
          /* Says what it counted. "4 of 19 things named" read as an invented number to the judge of run 10 (21 Sep
             2026); "19 lines taken from what they said, 4 with a name, a number or a date in them" is the same count
             with its source in the sentence, and the lines are on the page to check it against. */
          /*
           * AND `high` IS VERIFIABILITY, NOT A DOCUMENT.
           *
           * It said "6 backed by a document" on a check-in where `restsOn.documents` was empty and
           * the engagement header said `documentsAttached: 0`, in the same report. Two numbers about
           * the same thing, disagreeing, in the read a lead uses to decide about somebody. `high` is
           * the top of the HIGH/MEDIUM/LOW verifiability scale - a line specific enough that
           * somebody could go and check it - and nothing here knows whether a document exists. The
           * only claims about documents in this product come from `anchoredDocumentId`.
           */
          `${completed} check-in${completed === 1 ? '' : 's'} on record. ${myEntries.length} line${myEntries.length === 1 ? '' : 's'} taken from what they said, ${checkable} with a name, a number or a date in ${checkable === 1 ? 'it' : 'them'}${high ? `, ${high} of those specific enough for somebody else to go and check` : ''}.`,
        );
        const shape = shapeOf(bySession, lastSession);
        // The same protection the coverage read gives the quiet load-bearer has
        // to apply to the sentence about their record too. "Nothing checkable
        // since session 11" about the engineer whose colleagues are crediting him
        // that same week is a true statement that leaves a false impression, and
        // the false impression is what gets remembered.
        if (shape) reasonParts.push(
          corroborations > 0 && /^Nothing checkable/.test(shape)
            ? `${shape} Other people were still naming them as the reason things moved during that stretch, so this is more likely work described modestly than work that stopped.`
            : shape,
        );
      }
      if (corroborations > 0) {
        /*
         * WHO CREDITED THEM, AND WHETHER THAT PERSON IS ALSO WAITING ON THEM.
         *
         * Live run, 24 September 2026. A consultant who had secured nothing in three months read:
         * "11 of these were independently named by someone else, which is worth more than the count
         * of what was said." All eleven came from one person - the client who had hired him, found
         * the contacts, arranged the meetings and was waiting on him for nine things. Her own
         * account of work she had done became evidence for him, and the sentence told the reader to
         * weigh it above everything else.
         *
         * The count stays, because it is true and because the credit is often real - she genuinely
         * credited him with a budget-cycle warning that mattered. What is added is who it came from.
         * One person is one account however many times they say it, and a person who is waiting on
         * you is not an independent check on whether you delivered.
         */
        const whoCredited = new Set(
          input.mentions
            .filter((m) => m.aboutParticipantId === p.id && m.sourceParticipantId !== p.id && m.kind === 'CREDIT')
            .map((m) => m.sourceParticipantId),
        );
        const waitingOnThem = dedupeDependencies(input.dependencies)
          .filter((d) => d.onParticipantId === p.id && String(d.status).toUpperCase() !== 'CLEARED');
        const allFromOne = whoCredited.size === 1;
        const theOne = [...whoCredited][0] ?? null;
        const thatOneIsWaiting = allFromOne && waitingOnThem.some((d) => d.fromParticipantId === theOne);

        reasonParts.push(
          `${corroborations} of these ${corroborations === 1 ? 'was' : 'were'} named by someone else as well${
            allFromOne ? `, all of them by one person` : `, by ${whoCredited.size} different people`
          }.`,
        );
        if (thatOneIsWaiting) {
          reasonParts.push(
            `That person is also waiting on ${nameOf(p.id) ?? 'this person'} for ${waitingOnThem.length} ${waitingOnThem.length === 1 ? 'thing' : 'things'}, so read it as what one person said rather than as confirmation that the work arrived.`,
          );
        } else if (!allFromOne) {
          reasonParts.push('Separate people naming the same work is worth more than the count of what anybody said.');
        }
      }
      if (isBlocked) {
        /*
         * BLOCKED MUST NEVER READ AS BEHIND - and "blocked" has to mean somebody else holds it.
         *
         * A consultant whose only blocker was that nobody had answered his own emails read: "Part
         * of this is blocked on someone else, which is different from being behind. Separate the
         * two before reading anything into it." Nothing was on anybody's desk. He had written to a
         * ministry and was waiting, which is the work, not an obstacle to it - and the sentence
         * steered his client away from the only read that mattered.
         *
         * So the protection applies where another PERSON holds it: somebody here, or somebody
         * outside who has been escalated to, which is the record showing it was chased. Waiting on
         * an organisation with nothing on record about chasing it is said plainly instead.
         */
        const theirs = dedupeDependencies(input.dependencies)
          .filter((d) => d.fromParticipantId === p.id && String(d.status).toUpperCase() !== 'CLEARED');
        const somebodyHoldsIt = theirs.some((d) => !!d.onParticipantId || !!d.escalatedAt);
        reasonParts.push(
          somebodyHoldsIt
            ? 'Part of this is blocked on someone else (see what people are waiting on), which is different from being behind. Separate the two before reading anything into it.'
            : `What they say is in the way sits outside this check-in${theirs[0]?.onLabel ? `, with ${anArticleSaidMidSentence(theirs[0].onLabel)}` : ''}, and nothing on record says anybody has chased it. That is a thing to ask about, not a reason to read this as blocked.`,
        );
      }
      /*
       * AND ONLY WHERE THERE GENUINELY IS NO SECOND ACCOUNT.
       *
       * `peopleWorkTogether` is a SETTING - whether this kind of check-in assumes people see each
       * other's work. `corroborations` is a COUNT of the times somebody actually named this
       * person's work. They are different questions and both conditions could fire, so one
       * paragraph on a real cohort board read:
       *
       *   "7 of these were independently named by someone else, which is worth more than the count
       *    of what was said. Nobody else on this ground sees this person's work, so there is no
       *    second account to check any of this against."
       *
       * Two sentences apart, contradicting each other, in the read a lead uses to decide whether
       * somebody stays. The caveat is about an ABSENCE, and corroborations are the presence of the
       * very thing it says is missing - so where they exist, the setting is simply wrong about this
       * person and the evidence wins.
       */
      if (!peopleWorkTogether && completed >= 3 && corroborations === 0) {
        // The limitation itself, stated plainly. Someone who does the work and
        // describes it flatly looks identical to someone who did not do it, and
        // on this kind of ground there is no colleague who could tell them apart.
        reasonParts.push(
          'Nobody else in this check-in sees this person\'s work, so nobody else has said anything to check this against. Read it as what one person said, not as confirmed.',
        );
      } else if (!peopleWorkTogether && completed >= 3) {
        /* The setting says they work separately and somebody named their work anyway. That is worth
           more than either fact alone, and hiding it would leave the read quieter than the record. */
        reasonParts.push(
          'This check-in does not assume people see each other\'s work, so what somebody else named here carries more than it would in a check-in where everybody watches everybody.',
        );
      }
      if (map) {
        reasonParts.push(`Their work is read against what being on track means for ${map.label.charAt(0).toLowerCase()}${map.label.slice(1)}, which is ${map.onTrackMeans.charAt(0).toLowerCase()}${map.onTrackMeans.slice(1)}`);
        /*
         * AND WHERE THAT DISAGREES WITH THEIR STATED ROLE, SAY SO.
         *
         * `detectFunction` deliberately lets the ACCOUNT outrank the title - a title can be wrong
         * and the record shows the real work - and it knocks confidence down when they clash. What
         * it does not do is tell the reader.
         *
         * Seen on a real cohort: a hire whose role read "New sales hire, outbound" was read against
         * "Support and customer-facing work" - "named customers unblocked, the repeated problem
         * traced to a cause" - because her sessions were full of being blocked, while two
         * colleagues with near-identical role text got "Sales and expansion". Her lead was deciding
         * whether to keep her against the criteria for a different job, with nothing on the screen
         * saying the yardstick had been swapped.
         *
         * The override stays. What changes is that the disagreement is visible, so a lead who knows
         * the title is right can see the read is not.
         */
        const stated = priorFunctionFromRole(p.roleAsDescribed);
        if (stated && stated.fn !== p.detectedFunction) {
          const statedMap = roleMapFor(stated.fn as any);
          reasonParts.push(
            `Their stated role reads as ${(statedMap?.label ?? stated.fn.toLowerCase().replace(/_/g, ' '))}, and the account does not bear that out. `
            + 'So they are being read against what the record shows rather than against the title. '
            + 'If the title is right, that difference is the thing to look at first.',
          );
        }
        if (!fnConfident) reasonParts.push('This read of their function is still provisional.');
      }

      return {
        participantId: p.id,
        name: nameOf(p.id),
        remit: p.roleAsDescribed,
        remitDefined: true,
        position: null,
        positionLabel: null,
        reason: reasonParts.join(' '),
        fn: p.detectedFunction ?? null,
        fnLabel: map?.label ?? null,
        fnConfident,
        isBlocked,
        ownVoice: null,
        nothingCheckable: onlyReportsAbsence,
        ...conf,
        shown: onlyReportsAbsence ? true : conf.shown,
        guard:
          'Each person against their own role, in its own terms, never on one scale. A position is never shown without its reason, and never at all if the role was not defined. This shows what the record holds, not a rating of anyone.',
      };
    });
}

// ---------------------------------------------------------------------------
// Where work is landing
// ---------------------------------------------------------------------------

export type CoverageResult = { scope: 'role'; reads: (CoverageRead & Partial<Confidence>)[] };

/**
 * Where work is landing. Two-sided, coupled to the reason it cannot
 * self-determine, own-voice enabled, and only where the remit is defined.
 *
 * Computed at ROLE scope only - the sharpest individual read. The other three
 * scopes are in the type but are not derivable until a department or company
 * structure exists to read them at, so they are deliberately absent rather than
 * faked.
 */
export function buildCoverage(input: ReadInput, nameOf: NameOf): CoverageResult {
  const blocked = blockedParticipantIds(input.dependencies);
  const entries = withoutRepeats(input.entries);

  // CAN ANYONE HERE CORROBORATE ANYONE?
  //
  // The quiet-record signal below is only safe because of its guard: someone who
  // goes quiet in their own account is protected if colleagues keep crediting
  // them through the silence. That guard reads the ABSENCE of credit as evidence.
  //
  // Where nobody can credit anybody, absence of credit means nothing, and the
  // guard fails open on everyone. Four clinic managers each running a separate
  // clinic in a different town never see each other's work. Run against exactly
  // that shape, the manager who finished all fourteen modules and was signed off
  // unsupervised was read as "nothing specific for six check-ins in a row, worth
  // asking where the work is going" - and so was the trainer, whose job is
  // training rather than clinic output. On a ground deciding whether people keep
  // their jobs, that is the most damaging sentence this product could produce.
  //
  // This is deliberately NOT inferred from whether credit happens to appear. A
  // delivery team who simply had a quiet fortnight would then lose the signal
  // too, and that signal is the whole point of the read. It comes from what kind
  // of ground this is, which the scenario family already knows.
  //
  // What someone's record does or does not hold still gets said either way - by
  // the contribution read, in the language of the record rather than the language
  // of work going missing.
  const peopleWorkTogether = input.peopleWorkTogether !== false;
  const theSituationHasRoles = input.situationHasRoles !== false;
  const reads: (CoverageRead & Partial<Confidence>)[] = [];

  for (const p of input.participants) {
    if (p.managingOnly) continue;
    const remitDefined = !!p.roleAsDescribed?.trim();

    // Leaking out: others describing doing work that sits in THIS person's remit.
    const leakingOut = input.mentions.filter((m) => m.aboutParticipantId === p.id && m.kind === 'COVERAGE');
    // Absorbing in: THIS person describing picking up work that is someone else's.
    const absorbingIn = input.mentions.filter((m) => m.sourceParticipantId === p.id && m.kind === 'COVERAGE');
    // Credit is the opposite signal and must never be counted as coverage - it
    // is the hidden-contribution read, and confusing the two would turn "people
    // say you unblocked them" into "your work is slipping".
    const credited = input.mentions.filter((m) => m.aboutParticipantId === p.id && m.kind === 'CREDIT');

    const myEntries = entries.filter((e) => e.participantId === p.id);
    const own = myEntries.length;
    const denom = own + leakingOut.length;
    const pct = denom === 0 ? 0 : Math.round((leakingOut.length / denom) * 100);

    const myCheckIns = input.checkIns.filter((c) => c.participantId === p.id);
    const completedCount = myCheckIns.filter(gaveAnAccount).length;
    /* NOBODY IS READ BEFORE THEY HAVE SAID ANYTHING. Hafsah, 22 Sep 2026, a session report on a live
       team: "Participant A and Participant B: the role was never clearly defined, so there is no
       boundary to measure work against" - about the two people who had not answered yet. Where their
       work is landing is a question about a record; with no check-in there is no record, and the
       roster already says they have not answered. */
    if (completedCount === 0) continue;
    const lastSessionNumber = myCheckIns.reduce((m, c) => Math.max(m, c.sessionNumber), 0);

    // SECOND SIGNAL: their own record thinning out.
    //
    // Waiting for a colleague to narrate "I did Kavon's work" misses the
    // commonest way ownership drops, because nobody says that - they just
    // quietly do more of their own. Their OWN record going quiet is the tell.
    //
    // CONSECUTIVE quiet periods, not total. Counting total quiet sessions
    // flagged the steady engineer who describes his work modestly - exactly the
    // "invisible work" person the engineering map says to protect - just as hard
    // as the person who genuinely went dark for a month.
    // "Added nothing specific to the record" has to mean exactly that. Counting
    // any entry at all let a run of restated old news and admissions of nothing
    // read as an active session.
    const sessionsWithEntries = new Set<number>(
      myEntries
        .filter((e) => tierOf(e.text, e.verifiability) !== 'LOW')
        .map((e) => e.sessionNumber)
        .filter((n): n is number => n != null),
    );
    let longestQuietRun = 0,
      run = 0,
      quietRunEnd = 0;
    for (let n = 1; n <= lastSessionNumber; n++) {
      if (!sessionsWithEntries.has(n)) {
        run++;
        if (run > longestQuietRun) {
          longestQuietRun = run;
          quietRunEnd = n;
        }
      } else run = 0;
    }
    const quietRunStart = quietRunEnd - longestQuietRun + 1;

    // THE HIDDEN CONTRIBUTOR GUARD.
    //
    // Someone can go quiet in their OWN account and still be doing the work -
    // the engineer whose sessions read "stable, consolidating and documenting so
    // it is not all in my head". That is real work described unverifiably, and
    // it is exactly the person the engineering map says to protect from being
    // read as low contribution.
    //
    // What separates them from a genuine drop is whether OTHER people are
    // crediting them DURING the quiet stretch. If colleagues keep naming you as
    // the reason something moved while your own account is modest, that is
    // underclaim, not a drop.
    const creditedDuringQuietRun = credited.some(
      (m) => m.sessionNumber >= quietRunStart && m.sessionNumber <= quietRunEnd,
    );

    // Three consecutive periods is the same bar every other negative read has
    // to clear.
    const ownRecordThinning =
      peopleWorkTogether &&
      completedCount >= 3 &&
      longestQuietRun >= 3 &&
      !blocked.has(p.id) &&
      !creditedDuringQuietRun;

    const kind: CoverageKind =
      (leakingOut.length >= 2 && pct >= 40) || ownRecordThinning
        ? CoverageKind.LEAKING
        : absorbingIn.length >= 2
          ? CoverageKind.ABSORBING
          : CoverageKind.STABLE;

    // Rising over periods, from the sessions the coverage mentions land in. A
    // single period of someone covering is not a pattern - the three-period
    // discipline applies here as it does everywhere else.
    const leakSessions = new Set(leakingOut.map((m) => m.sessionNumber));
    const risingPeriods = Math.max(leakSessions.size, ownRecordThinning ? longestQuietRun : 0);

    const { reason, reasonText } = classifyCoverageReason({
      kind,
      isBlocked: blocked.has(p.id),
      remitDefined,
      ownVoiceClaimsDelegation: false,
      risingPeriods,
    });

    const base = !remitDefined
      ? 'The role was never defined, so there is no boundary to measure against.'
      : kind === CoverageKind.LEAKING && leakingOut.length >= 2
        ? `${leakingOut.length} time${leakingOut.length === 1 ? '' : 's'} across ${risingPeriods} check-in${risingPeriods === 1 ? '' : 's'}, someone else described doing work that sits in this remit, against ${own} thing${own === 1 ? '' : 's'} named here directly.`
        : kind === CoverageKind.LEAKING
          ? `${longestQuietRun} check-ins in a row added nothing specific to the record, and nothing is blocking them. The work has not stopped existing, so it is worth asking where it is going.`
          : kind === CoverageKind.ABSORBING
            ? `This person described picking up work outside this remit ${absorbingIn.length} time${absorbingIn.length === 1 ? '' : 's'}.`
            : "Nobody has said anything about this person's work moving elsewhere.";

    // Credit is surfaced WHATEVER the coverage reading is. The person absorbing
    // other people's work is very often the same quiet load-bearer others keep
    // crediting, and dropping their credit because they also picked something up
    // would lose exactly the contribution this is meant to catch.
    const creditNote = credited.length
      ? ` Others credit them ${credited.length} time${credited.length === 1 ? '' : 's'} for moving something forward.`
      : '';

    // Confidence comes from evidence, never from its absence. Counting the quiet
    // run here made the read more certain the less the person said, which is
    // circular: silence was treated as proof of the conclusion drawn from it.
    const conf = confidenceOf({
      sessions: completedCount,
      checkableEntries: leakingOut.length + absorbingIn.length,
      corroborations: credited.length,
    });

    reads.push({
      participantId: p.id,
      name: nameOf(p.id),
      scope: 'role',
      pct,
      kind,
      trend: risingPeriods >= 3 ? 'rising' : 'stable',
      what: remitDefined ? base + creditNote : base,
      reason,
      reasonText,
      ownVoice: null,
      coupledToBlocker: blocked.has(p.id),
      remitDefined,
      // A STABLE read is a statement that nothing was found, which is honest at
      // any confidence. The floor exists to stop thin evidence turning into a
      // read ABOUT someone, so it only gates the two that do.
      ...conf,
      shown: kind === CoverageKind.STABLE ? true : conf.shown,
    } as CoverageRead & Confidence);
  }

  return { scope: 'role', reads };
}
