import { RecordEntryType } from '@prisma/client';

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
  };
  sections: SessionReportSection[];
  howClearThisWas: {
    level: string | null;
    recall: string | null;
    saying: string;
  };
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
  /** From the report: how many areas agree and how many are still open. */
  agreements: unknown[];
  divergences: unknown[];
  /** This session's entries, already typed at extraction. */
  entries: { type: RecordEntryType; text: string; who: string | null; recallBased: boolean; threadKey: string | null }[];
  /** The previous session's entries, for what has changed and what was not spoken to again. */
  previousEntries: { type: RecordEntryType; text: string; threadKey: string | null }[];
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
  /** Everybody this session counts, so a person who answered nothing specific still gets a line. */
  answeredThisSession: { who: string; isYou: boolean }[];
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
        ? 'The accounts are in and this has not yet named an area they agree or differ on.'
        : 'Not everyone has answered yet, so there is nothing to agree or differ with.'
      : `${agreed} area${agreed === 1 ? '' : 's'} the accounts agree on, ${stillOpen} still open.`;

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
      items: ofTypes(input.entries, [RecordEntryType.INTENT, RecordEntryType.SUCCESS_DEFINITION]),
      saying: 'Nobody stated what they are working towards this session.',
    },
    {
      title: 'Commitments',
      about: 'what people committed to, and what last session\'s commitments were not returned to',
      items: [
        ...commitmentsNow,
        ...notSpokenTo.map((c) => ({
          text: `From last session, not mentioned again: ${c.text}`,
          who: null,
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
    {
      title: 'What this rests on',
      about: 'the documents and evidence behind the accounts, rather than recollection',
      items: input.evidence.map((e) => ({ text: e.text, who: e.who, documented: true })),
      saying: 'Every account this session was from memory. Nobody attached anything.',
    },
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
  const documented = input.entries.filter((e) => !e.recallBased).length;
  const backedPct = input.entries.length ? Math.round((documented / input.entries.length) * 100) : null;
  const atAGlance: AGlanceRead[] = [
    {
      label: 'Misalignment',
      value: stillOpen
        ? `${stillOpen} unresolved`
        : agreed ? 'none unresolved' : 'nothing to compare yet',
      sub: stillOpen
        ? 'where what people said does not line up'
        : agreed ? 'what people said lines up' : 'one side only so far',
    },
    {
      label: 'Moving',
      /*
       * "NO TARGETS SET" WAS TRUE AND USELESS.
       *
       * Read on a real twelve-session cohort whose entire purpose was who reaches eight closed
       * deals: the lead said "each of them at eight closed deals" in EVERY session, and this tile
       * read "no targets set / nothing here carries a number yet" for the whole quarter. Both
       * halves true about the target table, and the quarter's number was sitting in the transcript
       * the tile is printed beside.
       *
       * It is deliberately not turned into a target automatically. Reading a number out of a
       * sentence and making it the thing somebody is measured against is exactly the inference this
       * product refuses everywhere else - the lead sets the yardstick, on purpose, in one place.
       *
       * What changes is that the tile stops reporting an empty table and starts naming the gap: a
       * number has been said, nothing is tracking it, and one person can fix that in a minute.
       */
      value: input.movedOnTargets == null
        ? aNumberWasSaid(input) ? 'a number was said' : 'no set target'
        : input.movedOnTargets > 0 ? 'target on track' : 'target has not moved',
      sub: input.movedOnTargets == null
        ? aNumberWasSaid(input)
          ? 'somebody named a number and nothing is tracking it'
          : 'nothing here carries a number yet'
        : 'across targets this session',
    },
    {
      label: 'Stuck',
      value: input.blocked ? `${input.blocked} blocked` : 'no blockers noted',
      sub: input.blocked ? 'waiting on somebody else' : 'nobody said they were held up',
    },
    {
      label: 'Solid',
      value: backedPct == null ? 'nothing on record yet' : `${backedPct}% evidence backed`,
      sub: backedPct == null ? 'no answers to read' : 'check-ins anchored to a document rather than recalled',
    },
  ];

  /**
   * WHAT EACH PERSON SAID THEY DID, under their own name.
   *
   * Grouped from the same entries the sections above use - so nothing new is read and the wall is
   * the same one: whose lines reach this reader was decided before it got here. Somebody who
   * answered and named nothing specific keeps their line and says so, because that is the finding.
   */
  const said = new Map<string, string[]>();
  for (const e of input.entries) {
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

  return {
    sessionNumber: input.sessionNumber,
    state: input.closed ? 'final' : 'forming',
    whereThingsStand: { agreed, stillOpen, saying: standing },
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
