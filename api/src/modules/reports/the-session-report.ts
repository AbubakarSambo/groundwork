import { howALineIsKnown, type HowALineIsKnown } from './how-a-line-is-known';
import { theDifferencesReadAgreesWithTheQuestion } from '../board/the-quick-read-agrees-with-the-report';
import { WHAT_EACH_MARK_SAYS, type AMarkOnALine, type TheMarksOfAReport } from './the-mark-on-every-line';
import { WHERE_IT_WAS_READ_FROM } from '../conversation/how-checkable-a-session-was';
import { COUNTS_AS_A_SOURCE } from '../documents/what-kind-of-thing-a-document-is';
import { RecordEntryType } from '@prisma/client';
import { howMuchThereIsToGoOn, type Confidence } from './how-much-there-is-to-go-on';
import { atAGlanceTiles, type AGlanceRead, type WhyNoWorryIsShown } from './what-this-session-holds';
import { howSolid, MARK } from './a-figure-nobody-can-check-says-so';
import { splitAtFieldNames, withoutRepeatedSentences, readableWithoutFieldNames } from './no-field-names-on-the-page';

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
  /**
   * A CAVEAT ON A FIGURE, WHERE THE LINE CARRIES ONE THE READER CANNOT CHECK.
   *
   * "About a third of the way there I would say" and "Twelve tickets are over a day old" arrive on
   * a manager's screen as two sentences with numbers in them, in a list beside lines that came off
   * a system. One is a guess made in a chat. The mark says which; it never scores the person and
   * never removes the line. Absent where the line holds no figure, so it does not become wallpaper.
   */
  figureIs?: 'their estimate' | 'from memory';
  /**
   * HOW THE LINE IS KNOWN: proven, confirmed by the person who received it, their word, or memory
   * (week 6b, decision 43, screens request 2). The prototype's four marks; see how-a-line-is-known.
   */
  mark?: HowALineIsKnown;
  /** The mark in the prototype's own words, ready to print. */
  markSays?: string;
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

export type { AGlanceRead } from './what-this-session-holds';

/** What one person said they did this session, in their own lines. */
export interface WhatOnePersonSaid {
  who: string;
  isYou: boolean;
  lines: string[];
  /** How each line is known, in the same order as `lines`: proven, confirmed, said or memory. */
  lineMarks?: HowALineIsKnown[];
  /** The same marks in the prototype's own words, in the same order. */
  lineMarksSay?: string[];
  /** Said instead of lines when they answered and named nothing specific. */
  saying?: string;
}

export interface SessionReportShape {
  sessionNumber: number;
  /** How many this run holds, so the header can say "check-in 3 of 6". Null when nobody set both. */
  plannedSessions?: number | null;
  /** True when the check-in runs until the lead ends it: no total, so nothing says how far through it is. */
  runsUntilEnded?: boolean;
  /** The plain count, ready to print: "Session 3 of 12.", or "Session 3. It runs until you end it." */
  position?: string;
  /** 'forming' while the round is open, 'final' once it closed and was snapshotted. */
  state: 'forming' | 'final';
  whereThingsStand: {
    agreed: number;
    stillOpen: number;
    saying: string;
    /** What is settled and what is not, named. A count with no subject is what the tiles are for. */
    settled: string[];
    /** How each settled line is known, in the same order as `settled`. Absent where the report was stored before the marks. */
    settledMarks?: AMarkOnALine[];
    /** The same for `open`. */
    openMarks?: AMarkOnALine[];
    /**
     * THE DIFFERENCES ALONE (B-165). `open` is what the screen lists under "What is still open", and where the report lists no difference but the
     * record holds a blocker, a wait or a worry, `open` says what the record holds, so the screen never reads "Nothing is open. Everything anybody
     * raised has been settled." beside Esther's three shops waiting on a credit decision. Anything that means a difference between people reads this.
     */
    differences?: string[];
    /*
     * AND WHY EACH OPEN ONE IS OPEN, WHICH THIS THREW AWAY.
     *
     * Read off a live three-person report: "03 WHERE THINGS STAND" held one line, "The definition
     * of success", and that was the whole section. A topic. Her verdict: "the shared report has no
     * reasoning at all."
     *
     * The reasoning was never missing from the report - the synthesis returns each difference with
     * where each person stands, what it rests on and what is at stake - it was thrown away HERE, by
     * a map to the title. The strings stay for anything still reading them; `openWithReasons` is
     * the same list with everything that makes it worth reading.
     */
    open: string[];
    openWithReasons: {
      topic: string;
      mark?: HowALineIsKnown;
      markSays?: string;
      markNote?: string;
      marksBehind?: HowALineIsKnown[];
      /** Where each person stands, in their own terms. */
      positions: ({ who: string; view: string } & Partial<AMarkOnALine>)[];
      /** The lines it rests on, from what people actually said. */
      restsOn: string[];
      /** How each line in `restsOn` is known, in the same order. */
      restsOnMarks?: AMarkOnALine[];
      /** What happens to the work if it holds. Never about a person. */
      atStake: string | null;
      /** What would settle it. The half a reader can act on. */
      settledBy: string | null;
    }[];
  };
  sections: SessionReportSection[];
  howClearThisWas: {
    level: string | null;
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
  /** From the length and the rhythm. Null where either is unset, so the header simply omits it. */
  plannedSessions?: number | null;
  /** The check-in runs until the lead ends it (request 37). */
  runsUntilEnded?: boolean;
  /** Who can end it, as the reader reads it: null when the reader is the one who runs it ("you"), otherwise a name or "the person running it". */
  whoEndsIt?: string | null;
  /** Whether the round closed and was snapshotted. */
  closed: boolean;
  /**
   * Whether other people's words are not yet open to this reader: the team's report has not been shared with them. Read from the release, which is what the wall
   * is. Where it is not given, it is read from `closed` as it always was, which was wrong once a round had closed and still not been shared (user journeys, F-12).
   */
  othersWordsAreNotYetOpen?: boolean;
  /**
   * From the report: what the records agree on and what is still open between them.
   *
   * The counts were all this took, and the section printed "1 area the accounts agree on, 1 still
   * open" and named neither - beside a tile carrying the same two numbers. The tiles count; this
   * says what.
   */
  agreements: unknown[];
  divergences: unknown[];
  /** The marks the build stored for the report these came from (engagement.marksOnItsLines). Absent on a report stored before, and on a closed round. */
  marksOnItsLines?: TheMarksOfAReport | null;
  /** This session's entries, already typed at extraction. */
  entries: { type: RecordEntryType; text: string; who: string | null; recallBased: boolean; threadKey: string | null; /** the origin of the document that backs it, when one does */ backedBy?: string | null; /** when the colleague who received it confirmed it */ confirmedAt?: Date | null; /** false when the backing document is somebody else's */ documentIsTheirOwn?: boolean }[];
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
  /** The whole session's line count and documented count, for the confidence read. See howMuchThereIsToGoOn. */
  saidInAll?: number;
  documentedInAll?: number;
  centralQuestion: string | null;
  /** How many named targets moved this session, for the movement read. Null when none are set. */
  movedOnTargets: number | null;
  /** How many targets exist, so the Movement tile says "none moved" rather than "none set". */
  targetsSet?: number;
  /** Of those, how many have a number (request 109 c). */
  targetsWithANumber?: number;
  /** How many went up, so two targets are never added together on the tile. */
  targetsMoved?: number;
  /** How many things are recorded as hard-blocked and waiting on somebody else. */
  blocked: number;
  /** WAITING rows: somebody is waiting on somebody else, not hard-blocked. */
  waiting?: number;
  /** The first of those, in the words it was raised in, so the tile names it. */
  theFirstBlocker?: string | null;
  worries?: number;
  theFirstWorry?: string | null;
  /** Files, photos and location pins sent with this session's check-ins that the reader may see (B-103). */
  filesSentThisSession?: number;
  whyNoWorryIsShown?: WhyNoWorryIsShown;
  /** Waits raised before this session and still open (see whatThisSessionHolds). */
  waitsFromEarlier?: number;
  /** Everybody this session counts, so a person who answered nothing specific still gets a line. */
  answeredThisSession: { who: string; isYou: boolean }[];
  /** How many people the session counts in all, answered or not, for the confidence read. */
  peopleInAll?: number;
  /** How many were invited and have not joined yet (decision 136: not counted, not waited on). */
  notJoinedYet?: number;
  /** Commitments this session that carry both somebody's name and a date. */
  commitmentsWithOwnerAndDate?: number;
  /** Release 1's switch is on for the check-in's organisation (release-one-sales-board). */
  releaseOne?: boolean;
}

/**
 * WHAT AN AGREEMENT OR A DIVERGENCE IS CALLED.
 *
 * They arrive as the report's own JSON, whose shape has changed twice, so this reads whichever of
 * the three fields is filled rather than asserting one. Nothing is invented: an entry with no
 * words in it is dropped instead of being printed as an empty bullet.
 */
/** The title as stored, which on a report written before the rebuild can carry its other fields joined on ("Topic. atStake: ..."). */
function storedTitleOf(x: unknown): string | null {
  if (typeof x === 'string') return x.trim() || null;
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  for (const k of ['topic', 'title', 'area', 'summary', 'text']) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/** The title a reader sees: the stored title without any field joined onto it (journey walk rows 1 and 2; no-field-names-on-the-page.ts). */
export function titleOf(x: unknown): string | null {
  const stored = storedTitleOf(x);
  return stored ? splitAtFieldNames(stored).head || stored : null;
}

/** A field the old rows joined onto the title, read back out of it, when the row does not carry it on its own. */
function fieldOf(d: any, key: string): string | null {
  const own = d?.[key];
  if (typeof own === 'string' && own.trim()) return withoutRepeatedSentences(own.trim());
  const stored = storedTitleOf(d);
  return stored ? splitAtFieldNames(stored).fields[key] ?? null : null;
}

const said = (e: { type?: string; text: string; who: string | null; recallBased: boolean; backedBy?: string | null; confirmedAt?: Date | null; documentIsTheirOwn?: boolean }): SaidThing => {
  const how = howSolid({ text: e.text, recallBased: e.recallBased });
  const mark = howALineIsKnown({ type: String(e.type ?? ''), text: e.text, recallBased: e.recallBased, anchoredOrigin: e.backedBy ?? null, confirmedAt: e.confirmedAt ?? null, documentIsTheirOwn: e.documentIsTheirOwn });
  return {
    text: e.text,
    who: e.who,
    documented: !e.recallBased,
    ...(how === 'estimated' || how === 'from-memory' ? { figureIs: MARK[how] as 'their estimate' | 'from memory' } : {}),
    mark,
    markSays: WHAT_EACH_MARK_SAYS[mark],
  };
};

const ofTypes = (
  entries: SessionReportInputs['entries'],
  types: RecordEntryType[],
): SaidThing[] => entries.filter((e) => types.includes(e.type)).map(said);

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const inWords = (n: number) => (n >= 0 && n < COUNT_WORDS.length ? COUNT_WORDS[n] : String(n));

/** "Three things are settled, and three are still open." / "Nothing is settled yet, and one thing is still open." */
export function theCountsInASentence(settled: number, open: number): string {
  const firstHalf = settled > 0 ? `${inWords(settled).replace(/^./, (c) => c.toUpperCase())} ${settled === 1 ? 'thing is' : 'things are'} settled` : 'Nothing is settled yet';
  const secondHalf = open > 0 ? `${settled > 0 ? inWords(open) : `${inWords(open)} ${open === 1 ? 'thing' : 'things'}`} ${open === 1 ? 'is' : 'are'} still open` : 'nothing is still open';
  return `${firstHalf}, and ${secondHalf}.`;
}

/** What a person reads on another person's row, before the team's report is shared with them. The words are walled, and nobody is said to have said nothing. */
export const WHAT_THEY_SAID_OPENS_WHEN_SHARED = 'This person has answered, and what they said opens to you when the team\'s report is shared.';

export function theSessionReport(input: SessionReportInputs): SessionReportShape {
  /* FILTER FIRST, THEN COUNT. These were the raw array lengths while the lists under them went
     through .filter(Boolean), so "4 still open" could sit above a list of two. */
  const settled = input.agreements.map(titleOf).filter(Boolean) as string[];
  const openNow = input.divergences.map(titleOf).filter(Boolean) as string[];

  /*
   * THE SAME DIFFERENCES, WITH THE REASONING KEPT. See the note on the shape above: everything
   * below was already on the object and was being dropped on the way to a bullet list.
   */
  /* The stored marks fit only where they were worked out for these very lists. */
  const theMarks = input.marksOnItsLines;
  const agreementMarksFit = !!theMarks && theMarks.agreements?.length === input.agreements.length;
  const divergenceMarksFit = !!theMarks && theMarks.divergences?.length === input.divergences.length;
  const settledMarks = agreementMarksFit ? input.agreements.map((a, i) => (titleOf(a) ? theMarks!.agreements[i] : null)).filter(Boolean) as AMarkOnALine[] : undefined;
  const openMarks = divergenceMarksFit ? input.divergences.map((d, i) => (titleOf(d) ? theMarks!.divergences[i].topic : null)).filter(Boolean) as AMarkOnALine[] : undefined;
  const openWithReasons = (input.divergences as any[])
    .map((d, at) => {
      const topic = titleOf(d);
      if (!topic) return null;
      const mine = divergenceMarksFit ? theMarks!.divergences[at] : null;
      const sides = Array.isArray(d?.positions) ? d.positions : Array.isArray(d?.perspectives) ? d.perspectives : [];
      const theSides = sides
        .map((p: any, j: number) => ({
          who: String(p?.participantLabel ?? p?.who ?? '').trim(),
          view: String(p?.view ?? p?.said ?? '').trim(),
          ...(mine && mine.positions.length === sides.length ? mine.positions[j] : {}),
        }))
        .filter((p: { who: string; view: string }) => p.view);
      const evidence = Array.isArray(d?.evidence) ? (d.evidence as unknown[]) : [];
      const evidenceMarks = mine && mine.evidence.length === evidence.length
        ? evidence.map((e, j) => (String(e ?? '').trim() ? mine.evidence[j] : null)).filter(Boolean) as AMarkOnALine[]
        : undefined;
      return {
        topic,
        ...(mine ? mine.topic : {}),
        positions: theSides,
        restsOn: evidence.map((e) => String(e ?? '').trim()).filter(Boolean),
        ...(evidenceMarks ? { restsOnMarks: evidenceMarks } : {}),
        atStake: fieldOf(d, 'atStake') ?? fieldOf(d, 'whyItMatters'),
        settledBy: fieldOf(d, 'settledBy'),
      };
    })
    .filter(Boolean) as SessionReportShape['whereThingsStand']['openWithReasons'];
  const agreed = settled.length;
  const stillOpen = openNow.length;

  /**
   * WHERE THINGS STAND. The one line the site promises every report carries, and the only place
   * a number is allowed to stand on its own - because both halves of it are countable.
   */
  /* ONE TRUE STATEMENT ABOUT WHO HAS ANSWERED (B-118). When the count of people is known it decides, here and in the Differences tile alike: a round closed half-done said
     "Not everyone has answered" in one sentence and "Everybody has answered" in the next. Closed or not decides only when nobody passed a count. */
  const everyoneHasAnswered = input.peopleInAll ? input.answeredThisSession.length >= input.peopleInAll : input.closed;
  const standing =
    agreed === 0 && stillOpen === 0
      ? everyoneHasAnswered
        /* Never "everybody" while somebody invited has not joined (reviewer, 14 October): the team had not been contacted yet. */
        ? (input.notJoinedYet ? `Everybody who has joined has answered. ${notJoinedSaid(input.notJoinedYet)}` : 'Everybody has answered. The report has not yet found anything they agree or differ on.')
        : 'Not everyone has answered yet, so there is nothing to agree or differ with.'
      /* A whole sentence, its numbers in words (messages test, 19 October: "3 settled, 3 still open." reached Mercy and Joseph on WhatsApp). */
      : theCountsInASentence(agreed, stillOpen);

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

  const sectionsAsBuilt: SessionReportSection[] = [
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
      /*
       * AND WHAT ACTUALLY HAPPENED, which this section is named for and did not hold.
       *
       * It drew INTENT only - what somebody understood their role to be - so on the round where a
       * team delivered a quarter's plan, "Progress and priorities" was empty and said nobody had
       * stated what they were working towards. The delivery lines existed; there was no type for
       * them and they had scattered into SUCCESS_DEFINITION. PROGRESS first, because what happened
       * outranks what somebody means to do.
       */
      items: [...ofTypes(input.entries, [RecordEntryType.PROGRESS]), ...ofTypes(input.entries, [RecordEntryType.INTENT])],
      saying: 'Nobody said what has moved, or what they are working towards, this session.',
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
  /*
   * "SAID INSTEAD OF ITEMS" MEANS INSTEAD. Every section carried both its list and its empty
   * sentence, and the page hid the sentence when the list had anything in it - so on the page it
   * held, and in the payload every consumer that is not the page (the panel, the API, a reader of
   * the JSON) got "Nobody named a risk or a concern this session" printed above a listed risk
   * (adversarial run, 20 Sep 2026). The payload says one thing now.
   */
  const sections: SessionReportSection[] = sectionsAsBuilt.map((s) => (s.items.length ? { ...s, saying: undefined } : s));

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
  const atAGlance: AGlanceRead[] = theDifferencesReadAgreesWithTheQuestion(atAGlanceTiles({
    agreed, stillOpen, movedOnTargets: input.movedOnTargets, blocked: input.blocked, waiting: input.waiting ?? 0,
    targetsSet: input.targetsSet ?? 0,
    targetsWithANumber: input.targetsWithANumber ?? input.targetsSet ?? 0,
    targetsMoved: input.targetsMoved,
    backedPct, numberWasSaid: aNumberWasSaid(input),
    filesSent: input.filesSentThisSession ?? 0,
    /* So the Differences tile stops saying somebody has not answered when everybody has. */
    stillToAnswer: Math.max(0, (input.peopleInAll ?? input.answeredThisSession.length) - input.answeredThisSession.length),
    notJoinedYet: input.notJoinedYet ?? 0,
    /* And so the two that have something to name, name it rather than repeating their own label. */
    theDifference: openWithReasons[0]?.topic ?? null,
    theBlocker: input.theFirstBlocker ?? null,
    worries: input.worries ?? 0,
    theWorry: input.theFirstWorry ?? null,
    whyNoWorry: input.whyNoWorryIsShown ?? null,
    waitsFromEarlier: input.waitsFromEarlier ?? 0,
  }), input.centralQuestion);

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
    /* What happened, which is the first thing anybody wants from a check-in and had no type until
       a lead's own run showed both people reading "nothing specific enough to record came out of
       it" on the round they finished the work. */
    RecordEntryType.PROGRESS,
    RecordEntryType.INTENT,
    RecordEntryType.COMMITMENT,
    RecordEntryType.WORRY,
    RecordEntryType.TENSION,
    RecordEntryType.ASK,
  ];
  const said = new Map<string, string[]>();
  const marked = new Map<string, HowALineIsKnown[]>();
  for (const e of input.entries.filter((e) => IN_THE_THEMES.includes(e.type))) {
    const key = e.who ?? '';
    said.set(key, [...(said.get(key) ?? []), e.text]);
    marked.set(key, [...(marked.get(key) ?? []), howALineIsKnown({ type: e.type, text: e.text, recallBased: e.recallBased, anchoredOrigin: e.backedBy ?? null, confirmedAt: e.confirmedAt ?? null, documentIsTheirOwn: e.documentIsTheirOwn })]);
  }
  /*
   * THE READER'S OWN LINES ARE FILED UNDER THEIR NAME. The read names the reader's own rows the way it
   * names everybody's (whoOf), and this looked them up under '' only, so a person read "Answered, and
   * nothing specific enough to record came out of it." on their own row while seven of their lines
   * were on record and the lead read a summary of them (review, 29 September). Their name first,
   * and '' for a read that leaves their own rows unnamed.
   */
  const keyOf = (p: { who: string; isYou: boolean }) => (said.has(p.who) || !p.isYou ? p.who : '');
  const whatEachPersonSaid: WhatOnePersonSaid[] = input.answeredThisSession.map((p) => {
    const lines = said.get(keyOf(p)) ?? [];
    return {
      who: p.who,
      isYou: p.isYou,
      lines,
      /* How each of those lines is known, in the same order (week 6b, screens request 2). Beside
         `lines` rather than in it, so a screen that reads `lines` as words is unchanged. */
      ...(lines.length ? { lineMarks: marked.get(keyOf(p)) ?? [], lineMarksSay: (marked.get(keyOf(p)) ?? []).map((m) => WHAT_EACH_MARK_SAYS[m]) } : {}),
      /* BEFORE RELEASE, ANOTHER PERSON'S LINES ARE WALLED, NOT ABSENT. A participant read "Answered, and nothing
         specific enough to record came out of it" beside twenty-three names whose lines he was not yet entitled
         to (run 10, 21 Sep 2026). The wall says so; it does not claim the person said nothing. */
      ...(lines.length === 0
        ? { saying: (input.othersWordsAreNotYetOpen ?? !input.closed) && !p.isYou ? WHAT_THEY_SAID_OPENS_WHEN_SHARED : 'This person has answered, and nothing specific enough to record came out of it.' }
        : {}),
    };
  });

  /*
   * ONE POPULATION FOR BOTH TERMS. `entries` is what THIS reader may read - their own lines before
   * release - while `ofPeople` was everybody, so a participant's confidence score divided their own
   * lines by the whole head count and fell as more people were invited. The confidence read is a
   * statement about the record, not about what this reader may see; the caller passes the whole
   * session's counts when it has them, and the reader-scoping stays on the lines that are rendered.
   */
  const confidence = howMuchThereIsToGoOn({
    answered: input.answeredThisSession.length,
    ofPeople: input.peopleInAll ?? input.answeredThisSession.length,
    documented: input.documentedInAll ?? input.entries.filter((e) => !e.recallBased && countsAsASource(e.backedBy)).length,
    saidInAll: input.saidInAll ?? input.entries.length,
    agreed,
    stillOpen,
    commitments: commitmentsNow.length,
    commitmentsWithOwnerAndDate: input.commitmentsWithOwnerAndDate ?? 0,
    releaseOne: !!input.releaseOne,
  });

  /*
   * WHAT IS STILL OPEN IS NEVER "NOTHING" WHILE THE RECORD HOLDS A BLOCKER, A WAIT OR A WORRY (B-165). The page says "Nothing is open. Everything anybody
   * raised has been settled." when it is handed something settled and nothing open. Where the report lists no difference, the Blockers read says what the
   * record holds, in the one sentence the quick read uses, and it goes on the list too. Counts of differences are left as they were.
   */
  const theBlockersRead = atAGlance.find((t) => t.label === 'Blockers');
  const theRecordHoldsSomethingOpen = !!(input.blocked || input.waiting || input.worries || input.waitsFromEarlier);
  const theOpenListWithWhatTheRecordHolds = openNow.length === 0 && settled.length > 0 && theRecordHoldsSomethingOpen && theBlockersRead?.sub
    ? [theBlockersRead.sub]
    : openNow;

  return {
    sessionNumber: input.sessionNumber,
    plannedSessions: input.runsUntilEnded ? null : input.plannedSessions ?? null,
    runsUntilEnded: input.runsUntilEnded === true,
    position: input.runsUntilEnded
      ? `Session ${input.sessionNumber}. It runs until ${input.whoEndsIt ? input.whoEndsIt : 'you'} end${input.whoEndsIt ? 's' : ''} it.`
      : input.plannedSessions ? `Session ${input.sessionNumber} of ${input.plannedSessions}.` : `Session ${input.sessionNumber}.`,
    state: input.closed ? 'final' : 'forming',
    confidence,
    whereThingsStand: { agreed, stillOpen, saying: standing, settled, ...(settledMarks ? { settledMarks } : {}), open: theOpenListWithWhatTheRecordHolds, differences: openNow, ...(openMarks ? { openMarks } : {}), openWithReasons },
    atAGlance,
    whatEachPersonSaid,
    sections,
    howClearThisWas: {
      level: input.specificityLevel ?? null,
      saying: howClear(input.specificityLevel),
    },
    theConversationWorthHaving: readableWithoutFieldNames(input.centralQuestion ?? null),
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
      out.push({ text: `Was: ${was} - now: ${e.text}`, who: e.who, documented: !e.recallBased });
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
        text: `At the start: ${input.baselineSuccess} - this session: ${e.text}`,
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
/**
 * FOUR REACHABLE SENTENCES, ONE PER LEVEL. This switched on `high`/`low`, which the scorer never
 * emits, so every report with a level printed the middle sentence whatever the score. The recall
 * clause is gone with the number it read (see scoreSessionSpecificity). Where it was read from is
 * said, so a keyword count is never presented in the grammar of an assessment.
 */
function howClear(level: string | null): string {
  const clarity =
    level === 'specific'
      /* "Accounts" is the login word to a reader. What is meant is what people said, so it says that. */
      ? 'What people said was specific: dates, numbers and named work rather than impressions.'
      : level === 'directional'
        ? 'What people said was specific in places and general in others.'
        : level === 'vague'
          ? 'What people said stayed general. A report can only be as specific as what it was given, so this one names fewer things than it otherwise would.'
          : level === 'managed'
            ? 'Little that could be checked was said in this session. The report names what it can and no more.'
            : 'How specific this session was has not been read yet.';
  return level ? `${clarity} ${WHERE_IT_WAS_READ_FROM}` : clarity;
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

/** "One person has not joined yet." / "Two people have not joined yet." */
export function notJoinedSaid(n: number): string {
  const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  const how = n <= 10 ? words[n] : String(n);
  return n === 1 ? 'One person has not joined yet.' : `${how} people have not joined yet.`;
}
