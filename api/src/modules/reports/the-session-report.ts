import { COUNTS_AS_A_SOURCE } from '../documents/what-kind-of-thing-a-document-is';
import { RecordEntryType } from '@prisma/client';
import { howMuchThereIsToGoOn, type Confidence } from './how-much-there-is-to-go-on';

/**
 * THE PER-SESSION REPORT, IN THE SHAPE WE PROMISED A CLIENT.
 *
 * "I need the forming sessions report(s) to take the same shape we promised the client for each
 * session - specificity, alignment, etc."
 *
 * The promise is on our own site, per check-in, and it is specific. Each check-in records
 * "progress, priorities, changes, commitments, risks, concerns, and any evidence". At every
 * check-in the product compares what people say now against what was agreed at the beginning,
 * against what they said before, and against the evidence - surfacing expectations that have
 * changed, risks starting to show, work falling behind, unclear ownership, and where a
 * conversation is needed. And "every report says how many areas the accounts agree on and how
 * many are still open".
 *
 * What the report OBJECT holds is a shared picture, agreements, divergences, a central question,
 * an engagement read and the evidence it rests on. So the counts, the specificity and the
 * evidence were kept, and commitments, risks, concerns and both kinds of change were not - even
 * though every one of them is already extracted per session as a typed `RecordEntry`, and the
 * baseline and starting point are already recorded rows.
 *
 * NOTHING HERE IS ASKED OF A MODEL. Every section is assembled from what somebody said, typed at
 * extraction time, or from a snapshot of a closed round. A model asked "were the commitments
 * delivered?" will always answer; this can only say what the record shows, which is the whole
 * point of the product.
 *
 * A SECTION THAT IS EMPTY SAYS WHY. A heading that disappears when there is nothing in it teaches
 * a client that the product is inconsistent; a heading that says "nobody named a risk this
 * session" is a finding.
 */

/** One thing somebody said, as it reaches a section. */
/** Null origin (a document from before origins existed) counts as a source; generated notes do not. */
const countsAsASource = (origin: string | null | undefined) => origin == null || COUNTS_AS_A_SOURCE.has(origin);

export interface SaidThing {
  text: string;
  /** The party's label, or null where the section is the reader's own. */
  who: string | null;
  /** True when it was anchored to a document rather than recalled. */
  documented: boolean;
}

export interface SessionReportSection {
  /** A line about how to read the section, where the shape of it could mislead. Usually null. */
  note?: string | null;
  /** The heading, in the order the promise makes. */
  title: string;
  /** What this section is, in one line. */
  about: string;
  items: SaidThing[];
  /** Said INSTEAD of items when there are none, and it never apologises. */
  saying?: string;
}

/** One of the four reads the product's own front page shows when it shows a report. */
export interface AGlanceRead {
  label: string;
  value: string;
  /** What it is a read of, in half a sentence. */
  sub: string;
  /**
   * WHETHER THIS IS GOOD NEWS, BAD NEWS OR NEITHER.
   *
   * All four used to render identically, so "no blockers noted" and "1 unresolved" looked like the
   * same kind of fact and the row read as four failures. No blockers is good news. Nothing to
   * compare yet is neither.
   */
  tone: 'good' | 'warn' | 'bad' | 'flat';
}

/** What one person said they did this session, in their own lines. */
export interface WhatOnePersonSaid {
  who: string;
  isYou: boolean;
  lines: string[];
  /** Said instead of lines when they answered and named nothing specific. */
  saying?: string;
}

export interface SessionReportShape {
  sessionNumber: number;
  /** 'forming' while the round is open, 'final' once it closed and was snapshotted. */
  state: 'forming' | 'final';
  whereThingsStand: {
    agreed: number;
    stillOpen: number;
    saying: string;
    /** What is settled and what is not, named. A count with no subject is what the tiles are for. */
    settled: string[];
    open: string[];
  };
  sections: SessionReportSection[];
  howClearThisWas: {
    level: string | null;
    recall: string | null;
    saying: string;
  };
  /**
   * HOW MUCH THERE IS TO GO ON, which is a reading on the document and not on a person.
   * See how-much-there-is-to-go-on.ts for why this is not the specificity meter.
   */
  confidence: Confidence;
  /**
   * THE FOUR READS, which the report did not have and the front page promises.
   *
   * "The report where we have people's names and where they are and also risk, similar to what is
   * in the home page, and how aligned and specific things are, is completely absent."
   *
   * They existed - on the BOARD, as `quickRead` - and the report, which is the thing a person
   * actually reads, had none of them. Same four, computed the same way, because two surfaces
   * disagreeing about how many differences are open is worse than one surface not saying.
   */
  atAGlance: AGlanceRead[];
  /**
   * WHAT EACH PERSON SAID THEY DID, which is the front page's "show what each of the eight said".
   *
   * Each person's own lines, under their own name, and nobody describing anybody else. Somebody
   * who answered and named nothing specific says so - that is a finding about the record and the
   * single most useful thing on the page for whoever runs it.
   */
  whatEachPersonSaid: WhatOnePersonSaid[];
  theConversationWorthHaving: string | null;
}

export interface SessionReportInputs {
  sessionNumber: number;
  /** Whether the round closed and was snapshotted. */
  closed: boolean;
  /**
   * From the report: what the records agree on and what is still open between them.
   *
   * The counts were all this took, and the section printed "1 area the accounts agree on, 1 still
   * open" and named neither - beside a tile carrying the same two numbers. The tiles count; this
   * says what.
   */
  agreements: unknown[];
  divergences: unknown[];
  /** This session's entries, already typed at extraction. */
  entries: { type: RecordEntryType; text: string; who: string | null; recallBased: boolean; threadKey: string | null; /** the origin of the document that backs it, when one does */ backedBy?: string | null }[];
  /** The previous session's entries, for what has changed and what was not spoken to again. */
  previousEntries: { type: RecordEntryType; text: string; who: string | null; threadKey: string | null }[];
  /** What was said at the beginning: the baseline's success statement and the starting point. */
  baselineSuccess: string | null;
  startingPoint: string | null;
  /** The shared picture at the previous round, for what moved between them. */
  previousSharedPicture: string | null;
  /** Documents and other non-recalled evidence this record rests on. */
  evidence: { text: string; who: string | null }[];
  specificityLevel: string | null;
  recallConfidence: string | null;
  centralQuestion: string | null;
  /** How many named targets moved this session, for the movement read. Null when none are set. */
  movedOnTargets: number | null;
  /** How many things are recorded as hard-blocked and waiting on somebody else. */
  blocked: number;
  /** WAITING rows: somebody is waiting on somebody else, not hard-blocked. */
  waiting?: number;
  /** Everybody this session counts, so a person who answered nothing specific still gets a line. */
  answeredThisSession: { who: string; isYou: boolean }[];
  /** How many people the session counts in all, answered or not, for the confidence read. */
  peopleInAll?: number;
  /** Commitments this session that carry both somebody's name and a date. */
  commitmentsWithOwnerAndDate?: number;
}

/**
 * WHAT AN AGREEMENT OR A DIVERGENCE IS CALLED.
 *
 * They arrive as the report's own JSON, whose shape has changed twice, so this reads whichever of
 * the three fields is filled rather than asserting one. Nothing is invented: an entry with no
 * words in it is dropped instead of being printed as an empty bullet.
 */
function titleOf(x: unknown): string | null {
  if (typeof x === 'string') return x.trim() || null;
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  for (const k of ['topic', 'title', 'area', 'summary', 'text']) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

const said = (e: { text: string; who: string | null; recallBased: boolean }): SaidThing => ({
  text: e.text,
  who: e.who,
  documented: !e.recallBased,
});

const ofTypes = (
  entries: SessionReportInputs['entries'],
  types: RecordEntryType[],
): SaidThing[] => entries.filter((e) => types.includes(e.type)).map(said);

export function theSessionReport(input: SessionReportInputs): SessionReportShape {
  const agreed = input.agreements.length;
  const stillOpen = input.divergences.length;

  /**
   * WHERE THINGS STAND. The one line the site promises every report carries, and the only place
   * a number is allowed to stand on its own - because both halves of it are countable.
   */
  const standing =
    agreed === 0 && stillOpen === 0
      ? input.closed
        ? 'Everybody has answered and this has not yet named anything they agree or differ on.'
        : 'Not everyone has answered yet, so there is nothing to agree or differ with.'
      : `${agreed} settled, ${stillOpen} still open.`;
  const settled = input.agreements.map(titleOf).filter(Boolean) as string[];
  const openNow = input.divergences.map(titleOf).filter(Boolean) as string[];

  const commitmentsNow = ofTypes(input.entries, [RecordEntryType.COMMITMENT]);

  /**
   * DELIVERY AGAINST COMMITMENTS, AS FAR AS THE RECORD CAN SAY.
   *
   * `dimensionThreadKey` groups entries across sessions by theme, so a commitment from last
   * session whose thread is spoken to again this session was returned to, and one whose thread is
   * absent was not mentioned. That is a fact about the record. Whether the work happened is NOT
   * something this can know, and it does not say so - "not mentioned since" is the finding, and
   * it is the one a manager can act on.
   */
  const threadsNow = new Set(input.entries.map((e) => e.threadKey).filter(Boolean) as string[]);
  const lastSessionCommitments = input.previousEntries.filter((e) => e.type === RecordEntryType.COMMITMENT);
  /**
   * AND WHETHER THE RECORD CAN ANSWER THE QUESTION AT ALL.
   *
   * Everything above depends on `dimensionThreadKey`, and one path writes it: the operating-
   * difference extraction, which only runs where the company has written its own process down.
   * Most have not. Counted on a real twelve-session cohort: 227 entries, 0 thread keys.
   *
   * With none, `!c.threadKey` is true of every previous commitment, so the section listed EVERY
   * commitment from last session as "not mentioned again" - beside the same commitments, unchanged,
   * in the list above. The lead read each of them twice, once as a commitment and once as abandoned.
   *
   * A read that cannot be made must say so rather than assert its default. `canFollowThreads` is
   * the honest test: without a thread on either side there is nothing to compare, and "nobody
   * returned to anything" is a claim about people rather than a fact about the record.
   */
  const canFollowThreads = threadsNow.size > 0 || input.previousEntries.some((e) => !!e.threadKey);
  const notSpokenTo = canFollowThreads
    ? lastSessionCommitments.filter((c) => !c.threadKey || !threadsNow.has(c.threadKey))
    : [];

  const sections: SessionReportSection[] = [
    {
      title: 'Progress and priorities',
      about: 'what people said they are doing, and what they said matters most',
      /*
       * SUCCESS_DEFINITION IS NOT SOMETHING THAT HAPPENED.
       *
       * It was in here, in the per-person lines, and in "What success looks like" - so "the rota
       * in writing" and "a named on-call person published by Friday each week" were each printed
       * three times on one page. They are answers to what good would look like, not accounts of
       * the session, and two of the three printings dropped the question they answered, which is
       * why the page ended on a bare "in September".
       *
       * One home, and it is the section named after the question.
       */
      items: ofTypes(input.entries, [RecordEntryType.INTENT]),
      saying: 'Nobody stated what they are working towards this session.',
    },
    {
      title: 'Commitments',
      about: 'what people committed to, and what last session\'s commitments were not returned to',
      items: [
        ...commitmentsNow,
        /*
          * A CARRIED COMMITMENT KEEPS THE PERSON WHO MADE IT. `who: null` here, and a reader that
          * prints a missing author as "you", put six of the participant's commitments under the
          * lead's name on the closing report. The person who said it is the whole point of the line.
          */
        ...notSpokenTo.map((c) => ({
          text: `From last session, not mentioned again: ${c.text}`,
          who: c.who,
          documented: false,
        })),
      ],
      saying:
        lastSessionCommitments.length > 0
          ? canFollowThreads
            ? 'No new commitments, and every commitment from last session was returned to.'
            : 'No new commitments this session. Whether last session\'s were returned to is not something this record can tell you.'
          : 'Nobody committed to anything specific this session.',
    },
    {
      title: 'Risks and concerns',
      about: 'what people said they are worried about, and where two accounts pull against each other',
      items: ofTypes(input.entries, [RecordEntryType.WORRY, RecordEntryType.TENSION]),
      saying: 'Nobody named a risk or a concern this session.',
      /*
       * WHO FILLS THIS SECTION IS NOT WHO IS CAUSING THE TROUBLE.
       *
       * It groups by entry type, so it fills up with whoever NAMES problems. On a real cohort, five
       * of six items were one person's - the hire who said plainly that her list was dead and she
       * would not hit eight - while the person who had closed nothing all quarter while saying
       * things were "very close" barely appeared here at all. A lead skimming the section reads the
       * honest one as the risk.
       *
       * Not reweighted, because the entries are true and hiding somebody's own words to balance a
       * column would be worse than the skim. Named instead: the effect is stated where it happens,
       * once, and only when one person actually dominates.
       */
      note: whoseConcernsTheseAre(ofTypes(input.entries, [RecordEntryType.WORRY, RecordEntryType.TENSION])),
    },
    {
      title: 'Asks',
      about: 'what people said they need from somebody else',
      items: ofTypes(input.entries, [RecordEntryType.ASK]),
      saying: 'Nobody asked for anything this session.',
    },
    /*
     * THE TWO "WHAT CHANGED" SECTIONS DO NOT EXIST ON SESSION 1.
     *
     * On a first session they rendered two cards that both said nothing had happened - "this is
     * the first session, so there is nothing before it to compare with" and "nothing was recorded
     * at the start" - which is two thirds of the page's headings spent saying the page cannot
     * answer a question nobody asked it. A section that can only be empty is not a finding.
     */
    ...(input.sessionNumber <= 1 ? [] : [
    {
      title: 'What changed since last session',
      about: 'what this session says that the one before it did not',
      items: whatChanged(input),
      saying:
        input.sessionNumber <= 1
          ? 'This is the first session, so there is nothing before it to compare with.'
          : canFollowThreads
            ? 'Nothing in this session contradicts or moves what was said last time.'
            /* The same limit as the commitments band above: with nothing threading the sessions
               together, "nothing moved" is a claim this cannot support. Said on all twelve sessions
               of a real cohort in which plenty moved. */
            : 'This record does not thread across sessions, so what moved since last time cannot be read from it. What each person said this session is above.',
    },
    {
      title: 'What changed since the beginning',
      about: 'this session against what was agreed and where things stood on day one',
      items: sinceTheBeginning(input),
      saying:
        !input.baselineSuccess && !input.startingPoint
          ? 'Nothing was recorded at the start, so there is no day one to measure against. Whoever runs this can still state it.'
          : 'Nothing this session moves what was agreed at the start.',
    },
    ]),
    /*
     * "WHAT THIS RESTS ON" IS ABSORBED BY THE CONFIDENCE READING.
     *
     * "Every account this session was from memory. Nobody attached anything." is exactly the kind
     * of fact that decides how much a report can be trusted, and it sat eight positions down as a
     * section of its own. It is now a reason under the confidence meter at the top of the shared
     * half, where somebody reads it before the content rather than after.
     *
     * The section survives only when there IS something to list, because a list of documents is a
     * list and not a reason.
     */
    ...(input.evidence.length ? [{
      title: 'What this rests on',
      about: 'the documents behind what people said, rather than recollection',
      items: input.evidence.map((e) => ({ text: e.text, who: e.who, documented: true })),
    }] : []),
  ];

  /**
   * THE FOUR READS, and each one says plainly when it cannot be computed rather than showing a
   * zero. "No targets set" and "nothing moved" are different facts, and a zero that means the
   * first reads as the second.
   *
   * THEY WERE QUESTIONS ANSWERED BY A NUMBER, AND THAT IS NOT A READ.
   *
   * "Aligned? 1 open" was the one that got picked out, and all four had the same fault: a
   * question word as the label, a bare count as the answer, and nothing saying what was open or
   * between whom. A person reads "Aligned? 1 open" and cannot tell whether that is good.
   *
   * Named things now, with the count as the state of that thing: Misalignment, Moving, Stuck,
   * Solid. The label says what is being read and the value says where it stands, which is the
   * order somebody reads them in.
   */
  /* A line backed by notes somebody wrote with a model is not backed by an independent source: it
     shows as backed, and it does not raise the documented share. */
  const documented = input.entries.filter((e) => !e.recallBased && countsAsASource(e.backedBy)).length;
  const backedPct = input.entries.length ? Math.round((documented / input.entries.length) * 100) : null;
  const atAGlance: AGlanceRead[] = [
    {
      label: 'Differences',
      value: stillOpen ? `${stillOpen}` : agreed ? 'None' : 'Nothing to compare yet',
      /*
       * WHAT THIS COUNT IS OVER, SAID. Agreed and open come from the written report, which a model
       * produced; no engine measures them. The tile kept the count, because the alternative was a
       * tile with nothing in it, and now says whose reading it is counting.
       */
      sub: stillOpen
        ? 'still open, as the written report reads it'
        : agreed ? 'no disagreement, as the written report reads it' : 'one side has answered so far',
      tone: stillOpen ? 'warn' : agreed ? 'good' : 'flat',
    },
    {
      label: 'Movement',
      /*
       * "NO TARGETS SET" WAS TRUE AND USELESS.
       *
       * Read on a real twelve-session cohort whose entire purpose was who reaches eight closed
       * deals: the lead said "each of them at eight closed deals" in EVERY session, and this tile
       * read "no targets set" for the whole quarter. Both halves true about the target table, and
       * the quarter's number was sitting in the transcript the tile is printed beside.
       *
       * It is deliberately not turned into a target automatically. Reading a number out of a
       * sentence and making it the thing somebody is measured against is exactly the inference this
       * product refuses everywhere else - the lead sets the yardstick, on purpose, in one place.
       */
      /* The VALUE of a tile answers its own label. Under "Movement", "A number was said" answers a
         different question, and read live as though it were the movement. What there is to say
         here is that nothing is being tracked. */
      value: input.movedOnTargets == null
        ? aNumberWasSaid(input) ? 'Not tracked' : 'No target set'
        : input.movedOnTargets > 0 ? `+${input.movedOnTargets}` : 'None',
      sub: input.movedOnTargets == null
        ? aNumberWasSaid(input)
          ? 'somebody named a number and nothing is tracking it'
          : 'nobody has set something to measure this against'
        : input.movedOnTargets > 0 ? 'targets moved this session' : 'no target moved this session',
      tone: input.movedOnTargets == null
        ? aNumberWasSaid(input) ? 'warn' : 'flat'
        : input.movedOnTargets > 0 ? 'good' : 'flat',
    },
    {
      label: 'Blockers',
      /* BLOCKING rows are blockers. WAITING rows are not, but a tile saying "None" over a finding that
         says two people are waiting on a third for five things read as the report contradicting
         itself in consecutive lines. Both are counted, in the template's own grammar. */
      value: input.blocked ? `${input.blocked}` : (input.waiting ?? 0) > 0 ? `${input.waiting} waiting` : 'None',
      sub: input.blocked
        ? 'named as holding work up'
        : (input.waiting ?? 0) > 0 ? 'on someone else, nothing hard-blocked' : 'nobody named anything holding work up',
      tone: input.blocked ? 'bad' : (input.waiting ?? 0) > 0 ? 'warn' : 'good',
    },
    {
      /* "Solid - 0% evidence backed" put a positive label over a zero. This counts one thing and
         says which. */
      label: 'How much was said',
      value: backedPct == null
        ? 'Nothing on record yet'
        : backedPct > 0 ? `${backedPct}% documented` : 'All from memory',
      sub: backedPct == null
        ? 'no answers to read'
        : backedPct > 0
          ? 'of what was said is anchored to a document'
          : 'nothing said this session was anchored to a document',
      tone: backedPct == null ? 'flat' : backedPct > 0 ? 'good' : 'warn',
    },
  ];

  /**
   * WHAT EACH PERSON SAID THEY DID, under their own name.
   *
   * Grouped from the same entries the sections above use - so nothing new is read and the wall is
   * the same one: whose lines reach this reader was decided before it got here. Somebody who
   * answered and named nothing specific keeps their line and says so, because that is the finding.
   */
  /**
   * THE SAME LINES THE THEMES SHOW, REGROUPED. NOT A WIDER SET.
   *
   * By-person and by-theme are two views of one set of facts, so anything in one and not the other
   * is a bug the reader meets as a fragment. This drew from every entry regardless of type, so the
   * by-person view carried two kinds of line the themes never show:
   *
   *   SUCCESS_DEFINITION - what good would look like, which belongs under the question it answers
   *   and was being printed as though somebody had done it.
   *
   *   TIMEFRAME - a modifier on another entry. Read off the live page, a person's block ended on a
   *   bare "in September", which is the whole of that entry's text. A fragment on a shared report
   *   reads as a system fault, and it is: a timeframe is not something somebody said.
   *
   * Taken from the themes' own type list so the two views cannot drift apart again.
   */
  const IN_THE_THEMES: RecordEntryType[] = [
    RecordEntryType.INTENT,
    RecordEntryType.COMMITMENT,
    RecordEntryType.WORRY,
    RecordEntryType.TENSION,
    RecordEntryType.ASK,
  ];
  const said = new Map<string, string[]>();
  for (const e of input.entries.filter((e) => IN_THE_THEMES.includes(e.type))) {
    const key = e.who ?? '';
    said.set(key, [...(said.get(key) ?? []), e.text]);
  }
  const whatEachPersonSaid: WhatOnePersonSaid[] = input.answeredThisSession.map((p) => {
    const lines = said.get(p.isYou ? '' : p.who) ?? [];
    return {
      who: p.who,
      isYou: p.isYou,
      lines,
      ...(lines.length === 0
        ? { saying: 'Answered, and nothing specific enough to record came out of it.' }
        : {}),
    };
  });

  const confidence = howMuchThereIsToGoOn({
    answered: input.answeredThisSession.length,
    ofPeople: input.peopleInAll ?? input.answeredThisSession.length,
    documented: input.entries.filter((e) => !e.recallBased && countsAsASource(e.backedBy)).length,
    saidInAll: input.entries.length,
    agreed,
    stillOpen,
    commitments: commitmentsNow.length,
    commitmentsWithOwnerAndDate: input.commitmentsWithOwnerAndDate ?? 0,
  });

  return {
    sessionNumber: input.sessionNumber,
    state: input.closed ? 'final' : 'forming',
    confidence,
    whereThingsStand: { agreed, stillOpen, saying: standing, settled, open: openNow },
    atAGlance,
    whatEachPersonSaid,
    sections,
    howClearThisWas: {
      level: input.specificityLevel ?? null,
      recall: input.recallConfidence ?? null,
      saying: howClear(input.specificityLevel, input.recallConfidence),
    },
    theConversationWorthHaving: input.centralQuestion ?? null,
  };
}

/**
 * WHAT CHANGED SINCE LAST SESSION, deterministically.
 *
 * A theme spoken to this session that was also spoken to last session, where the words differ, is
 * a change worth reading. A theme that is new is new. Nothing is inferred about WHY.
 */
/**
 * WHETHER ANYBODY HAS PUT A NUMBER ON WHAT THEY ARE AIMING AT.
 *
 * Not a target - a target is something the lead sets deliberately, and inferring one from a
 * sentence is the move this product does not make. This only asks whether the quarter's number is
 * sitting in the record while the target table is empty, which is a different and very common
 * state: on a real cohort the lead said "eight closed deals" twelve times and the board read "no
 * targets set" throughout.
 *
 * Deliberately narrow. A date is not a target and neither is a session count, so plain digits
 * attached to a stated aim are what counts - written as a figure or as a word, because people say
 * both and "eight closed deals" is the same claim as "8 closed deals".
 */
const A_NUMBER_IN_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|fifty|hundred)\b/i;

export function aNumberWasSaid(input: Pick<SessionReportInputs, 'entries'>): boolean {
  return input.entries.some(
    (e) =>
      (e.type === RecordEntryType.SUCCESS_DEFINITION || e.type === RecordEntryType.INTENT)
      && (/\d/.test(e.text) || A_NUMBER_IN_WORDS.test(e.text)),
  );
}

/**
 * A LINE FOR WHEN ONE PERSON'S CONCERNS ARE MOST OF A SECTION.
 *
 * Two thirds and at least three items, which is where a column stops reading as "the risks" and
 * starts reading as "this person". Below that it is just a short list.
 */
export function whoseConcernsTheseAre(items: SaidThing[]): string | null {
  if (items.length < 3) return null;
  const byPerson = new Map<string, number>();
  for (const i of items) if (i.who) byPerson.set(i.who, (byPerson.get(i.who) ?? 0) + 1);
  const [who, count] = [...byPerson.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!who || count / items.length < 2 / 3) return null;
  return `Most of this is ${who}'s - which says they name problems out loud, not that they are the problem. `
    + 'Whoever is not here has not said there is nothing wrong; they have said nothing.';
}

function whatChanged(input: SessionReportInputs): SaidThing[] {
  if (input.sessionNumber <= 1) return [];
  const before = new Map<string, string>();
  for (const e of input.previousEntries) if (e.threadKey) before.set(e.threadKey, e.text);

  const out: SaidThing[] = [];
  for (const e of input.entries) {
    if (!e.threadKey) continue;
    const was = before.get(e.threadKey);
    if (was && was.trim() !== e.text.trim()) {
      out.push({ text: `Was: ${was} — now: ${e.text}`, who: e.who, documented: !e.recallBased });
    }
  }
  return out;
}

/** This session's stated success against what was agreed at the beginning. */
function sinceTheBeginning(input: SessionReportInputs): SaidThing[] {
  if (!input.baselineSuccess && !input.startingPoint) return [];
  const out: SaidThing[] = [];
  const nowSuccess = input.entries.filter((e) => e.type === RecordEntryType.SUCCESS_DEFINITION);
  for (const e of nowSuccess) {
    if (input.baselineSuccess && input.baselineSuccess.trim() !== e.text.trim()) {
      out.push({
        text: `At the start: ${input.baselineSuccess} — this session: ${e.text}`,
        who: e.who,
        documented: !e.recallBased,
      });
    }
  }
  return out;
}

/**
 * HOW CLEAR THE ACCOUNTS WERE, in words rather than a grade.
 *
 * The level and the recall confidence are already computed per check-in. Printed as a band on its
 * own it reads as a mark out of five for the person, which this product does not give - so it
 * says what the level MEANS for the report that came out of it.
 */
function howClear(level: string | null, recall: string | null): string {
  const clarity =
    level === 'HIGH' || level === 'high'
      /* "Accounts" is the login word to a reader. What is meant is what people said, so it says
         that. Three visible sentences at the foot of every shared report. */
      ? 'What people said was specific: dates, numbers and named work rather than impressions.'
      : level === 'LOW' || level === 'low'
        ? 'What people said stayed general. A report can only be as specific as what it was given, so this one names fewer things than it otherwise would.'
        : level
          ? 'What people said was specific in places and general in others.'
          : 'How specific this session was has not been read yet.';
  const memory =
    recall === 'LOW' || recall === 'low'
      ? ' Much of it was recalled rather than checked against anything.'
      : recall === 'HIGH' || recall === 'high'
        ? ' Most of it was anchored to something written down.'
        : '';
  return `${clarity}${memory}`;
}

/**
 * WHETHER A COMMITMENT CARRIES SOMEBODY'S NAME AND A DATE.
 *
 * Not a parse of who and when - that would be an inference, and getting it wrong would put a name
 * against a promise nobody made. This only asks whether the sentence contains the two things that
 * make a commitment checkable later: a person referred to, and a time it is due by. It feeds one
 * of the four inputs to the confidence reading and nothing else reads it.
 */
export function hasOwnerAndDate(text: string): boolean {
  const t = text.toLowerCase();
  const aPerson = /\b(i|we|he|she|they|you)\b|\b[A-Z][a-z]{2,}\b/.test(text);
  const aTime =
    /\b(mon|tues|wednes|thurs|fri|satur|sun)day\b/.test(t) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/.test(t) ||
    /\b\d{1,2}[\/-]\d{1,2}\b/.test(t) ||
    /\bby (the )?(end of|start of|next|this)\b/.test(t) ||
    /\b(today|tomorrow|next week|this week|next month|by then|within \d+ (day|week|month))/.test(t) ||
    /\bq[1-4]\b/.test(t);
  return aPerson && aTime;
}
