/**
 * THE JUDGEMENT OVER THE ANSWERS.
 *
 * Hafsah, 23 September 2026: "we need judgement, that is the whole fucking point, insights and
 * judgement." And from the customer who read the last report: it "did not classify things or assess
 * or recommend well", and "talked in parables rather than being clear in normal human language
 * about the gap".
 *
 * Both are the same instruction and this module is the answer to it, in three parts and in this
 * order, because the order is what makes judgement defensible rather than confident:
 *
 *   CLASSIFY   is arithmetic. Once every answer holds the same fields, the buckets are counts -
 *              how many named Kano, how many have no way to check a new supplier, how the split
 *              differs between aggregators and research institutes. No model is asked for these and
 *              no model can soften them.
 *
 *   ASSESS     is arithmetic about the arithmetic. How many of the people asked actually answered,
 *              how concentrated the answers are, where they contradict each other, and what this
 *              data cannot tell anybody. A report that does not say what it cannot tell you is the
 *              one that gets called abstract, because the reader cannot locate the edge of it.
 *
 *   RECOMMEND  is the only part a model does, and it is handed nothing but the counts. Every
 *              sentence it writes must carry a number that is already in the table. That single
 *              rule is what stops parables: you cannot be abstract about twenty-nine out of
 *              thirty-four, and you cannot recommend something the counts do not support.
 *
 * WHY THE LAST REPORT READ LIKE A LIST. It was not a report fault. A hundred people answered one
 * brief in a hundred different shapes, and nothing incomparable can be counted, ranked or cut by
 * kind of organisation - so the only thing left to write was what each person said, and above a list
 * the only thing left to say is atmosphere. The fix is upstream of the writing, in the frame; this
 * is what becomes possible once the frame is there.
 */
/*
 * THE RULES, AND DELIBERATELY NEITHER OF THE TWO SURFACE HALVES.
 *
 * The judgement is stored in labels and name-swapped on the way out, which would normally mean
 * WRITTEN_ONCE_FOR_SEVERAL_READERS. But the room judgement is handed the lead's real name and told
 * to use it, and the population judgement is told to name who to start with, so that half would
 * contradict two instructions further down that were each written to fix a live defect. The rules
 * themselves - full sentences, plain words, no labels on people - hold either way, so those go in
 * and the naming stays where it already is.
 */
import { PLAIN_WORDS, EVERY_VERB_KEEPS_ITS_SUBJECT } from '../conversation/plain-words';
import type { AField } from '../conversation/what-a-complete-answer-holds';
import type { AFittedAnswer } from './fitting-an-answer-into-the-frame';

/* ------------------------------------------------------------------------------------------------
 * CLASSIFY - counts, and nothing a model touched
 * ---------------------------------------------------------------------------------------------- */

export interface ACount {
  value: string;
  howMany: number;
  /** Of the people who answered this field. */
  share: number;
  who: string[];
}

export interface AFieldRead {
  field: AField;
  /** How many people this field applies to. */
  asked: number;
  /** How many gave a value. */
  answered: number;
  /** How many were asked and said they cannot. An answer, and often the finding. */
  couldNotSay: number;
  /** How many were never asked - a hole in our work, not in theirs. */
  neverReached: number;
  counts: ACount[];
  /** The share held by the most common answer. High means agreement; low means a long tail. */
  concentration: number;
  /** Counts again, cut by kind of organisation. */
  byKind: { kind: string; counts: ACount[] }[];
}

const share = (n: number, of: number) => (of ? Math.round((n / of) * 100) / 100 : 0);

/**
 * SPLIT A VALUE INTO THE THINGS THAT CAN BE COUNTED SEPARATELY. "Niger and Kogi" is two places.
 *
 * NOT INSIDE A NUMBER. The first version split on every comma and turned "3,000 farmers" into "3"
 * and "000 farmers", which then appeared in the table as a finding. A count that is visibly wrong
 * costs more than a missing one: the reader stops believing the column.
 *
 * AND A PLACE IS THE PLACE, NOT HOW THEY SAID IT. "Jigawa states", "Bauchi state" and "Jigawa" are
 * one place and have to land in one row, or the ranking is decided by grammar.
 */
export function theThingsIn(value: string, shape: AField['shape']): string[] {
  const raw = (value ?? '').trim();
  if (!raw) return [];
  /* One value, never split: a quantity, an amount, a date, or one of a few named options. */
  if (shape === 'CHOICE' || shape === 'QUANTITY' || shape === 'MONEY' || shape === 'DATE' || shape === 'COUNT') {
    return [raw.replace(/\s+/g, ' ')];
  }
  return raw
    /* A comma between digits is a thousands separator and splitting there invents numbers. */
    .replace(/(\d),(\d)/g, '$1<>$2')
    .split(/,| and | & |\/|;|\|/i)
    .map((s) => s.replace(/<>/g, ','))
    .map((s) => s.trim()
      .replace(/^(the|a|an|our|their|my|in|for|from|of)\s+/i, '')
      .replace(/\s+(states?|markets?|region|regions|area|areas)$/i, '')
      .replace(/[.!?]+.*$/, '')
      .replace(/\s+/g, ' ')
      .trim())
    /* A fragment longer than this is a sentence that escaped the fit, not a thing to count. */
    .filter((s) => s.length > 1 && s.split(/\s+/).length <= 6)
    .slice(0, 8);
}

/** One row per thing, however people capitalised it. */
const asOneName = (all: string[]): string => {
  const by = new Map<string, number>();
  for (const s of all) by.set(s, (by.get(s) ?? 0) + 1);
  const best = [...by.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  /* An all-lowercase place name reads as a typo next to the others; a phrase is left alone. */
  return best.split(/\s+/).length <= 2 && best === best.toLowerCase()
    ? best.replace(/\b[a-z]/g, (c) => c.toUpperCase())
    : best;
};

const rank = (rows: { value: string; who: string }[], of: number): ACount[] => {
  const by = new Map<string, { spellings: string[]; who: string[] }>();
  for (const r of rows) {
    const key = r.value.toLowerCase();
    const at = by.get(key) ?? { spellings: [], who: [] };
    at.spellings.push(r.value);
    if (!at.who.includes(r.who)) at.who.push(r.who);
    by.set(key, at);
  }
  return [...by.values()]
    .map((x) => ({ value: asOneName(x.spellings), howMany: x.who.length, share: share(x.who.length, of), who: x.who }))
    .sort((a, b) => b.howMany - a.howMany || a.value.localeCompare(b.value));
};

/** Does a field marked for one kind of respondent apply to this person. */
export function itAppliesTo(field: AField, kind: string | null): boolean {
  if (!field.askedOf) return true;
  const theirs = (kind ?? '').toLowerCase();
  if (!theirs) return false;
  return field.askedOf.toLowerCase().split(/\W+/).filter((w) => w.length > 3).some((w) => theirs.includes(w));
}

export function whatTheNumbersSay(frame: AField[], answers: AFittedAnswer[]): AFieldRead[] {
  return frame.map((field) => {
    const theirs = answers.filter((a) => itAppliesTo(field, a.kind));
    const rows: { value: string; who: string }[] = [];
    let couldNotSay = 0;
    let answered = 0;
    const perKind = new Map<string, { value: string; who: string }[]>();
    for (const a of theirs) {
      const v = a.values.find((x) => x.fieldId === field.id);
      if (!v) continue;
      if (v.couldNotSay) { couldNotSay += 1; continue; }
      if (!v.value) continue;
      answered += 1;
      const who = a.who ?? a.participantId.slice(0, 8);
      for (const thing of theThingsIn(v.value, field.shape)) {
        rows.push({ value: thing, who });
        const k = (a.kind ?? 'not said').toLowerCase();
        perKind.set(k, [...(perKind.get(k) ?? []), { value: thing, who }]);
      }
    }
    const counts = rank(rows, answered);
    return {
      field,
      asked: theirs.length,
      answered,
      couldNotSay,
      neverReached: theirs.length - answered - couldNotSay,
      counts,
      concentration: counts.length ? counts[0].share : 0,
      byKind: [...perKind.entries()]
        .map(([kind, rs]) => ({ kind, counts: rank(rs, new Set(rs.map((r) => r.who)).size) }))
        .sort((a, b) => b.counts.length - a.counts.length),
    };
  });
}

/* ------------------------------------------------------------------------------------------------
 * ASSESS - what this data is worth, before anybody acts on it
 * ---------------------------------------------------------------------------------------------- */

export interface AnAssessment {
  fieldId: string;
  /** What the reader may do with this field, decided by counts and nothing else. */
  standing: 'SOLID' | 'THIN' | 'SPLIT' | 'NOBODY_COULD_ANSWER' | 'WE_NEVER_ASKED';
  because: string;
}

/** How many answers before a count means anything. Below it, a share is a coincidence. */
export const ENOUGH_TO_COUNT = 8;

export function howGoodIsThis(read: AFieldRead): AnAssessment {
  const { field, asked, answered, couldNotSay, neverReached, concentration } = read;
  if (asked && neverReached / asked > 0.5) {
    return {
      fieldId: field.id, standing: 'WE_NEVER_ASKED',
      because: `${neverReached} of ${asked} conversations never reached this. That is a gap in how we ran the check-in, not a finding about anybody.`,
    };
  }
  if (answered + couldNotSay && couldNotSay >= answered) {
    return {
      fieldId: field.id, standing: 'NOBODY_COULD_ANSWER',
      because: `${couldNotSay} of ${answered + couldNotSay} who were asked said they have no way to answer it. That is the finding.`,
    };
  }
  if (answered < ENOUGH_TO_COUNT) {
    return { fieldId: field.id, standing: 'THIN', because: `only ${answered} people answered, which is too few to rank.` };
  }
  if (field.shape === 'CHOICE' && concentration < 0.4) {
    return { fieldId: field.id, standing: 'SPLIT', because: `no option holds more than ${Math.round(concentration * 100)}% of ${answered} answers, so there is no single situation to design for.` };
  }
  /*
   * A LONG TAIL IS NOT WEAKNESS FOR A PLACE OR A PRODUCT, and reading it as one was wrong: fifty
   * people naming forty states is the most useful thing in the dataset, and the first version
   * reported it as "the top answer holds 8%" as though that were a problem. What matters for a
   * named thing is whether anything is repeated at all - a list where nobody agrees with anybody is
   * a hundred anecdotes, and a top three that holds a real share is a place to start.
   */
  const topThree = read.counts.slice(0, 3);
  const heldByTopThree = topThree.reduce((n, c) => n + c.share, 0);
  if (field.shape !== 'CHOICE' && topThree[0] && topThree[0].howMany < 2) {
    return {
      fieldId: field.id, standing: 'SPLIT',
      because: `${answered} answered and no two people named the same thing, so there is nothing to rank yet.`,
    };
  }
  return {
    fieldId: field.id, standing: 'SOLID',
    because: field.shape === 'CHOICE'
      ? `${answered} answered and the most common answer holds ${Math.round(concentration * 100)}%.`
      : `${answered} answered; the top three (${topThree.map((c) => `${c.value} ${c.howMany}`).join(', ')}) hold ${Math.round(heldByTopThree * 100)}% between them.`,
  };
}

/** Who gave a usable answer and who did not, measured, ranked, for the lead to act on. */
export function whoAnsweredWell(answers: AFittedAnswer[]): AFittedAnswer[] {
  return [...answers].sort((a, b) => b.completeness - a.completeness || (b.specificity ?? 0) - (a.specificity ?? 0));
}

/* ------------------------------------------------------------------------------------------------
 * THE TABLE, WHICH IS ALSO THE SPREADSHEET
 * ---------------------------------------------------------------------------------------------- */

/**
 * The counts as the model is given them, and as a person would read them.
 *
 * THE TEST FOR THE WHOLE REPORT IS THAT THIS EXISTS. If the findings cannot be laid out as rows and
 * columns, we built a newsletter. Every number the judgement is allowed to use is in here, which is
 * also why the judgement cannot invent one.
 */
/**
 * WHERE THE ANSWERS POINT, WHICH IS THE QUESTION AN EXPANSION CHECK-IN ACTUALLY ASKED.
 *
 * Measured on the MarketView expansion run, 24 September 2026. The brief asked which states,
 * markets, products, actors and volumes the network needs. What came back was a standing per field
 * - who named Kano, how many could not answer about volumes - and the reader's actual question,
 * "which markets and regions and value chains should we prioritise next", was never answered.
 *
 * The material for it was already in the table and nothing composed it. A prioritisation is the top
 * of each field read together: this place, with this product, with these actors, and how much of
 * the room stands behind each. It is arithmetic - no model writes it and no model can soften it -
 * and it says its own strength, because two people naming Kano is not a market entry decision.
 *
 * ONE LINE PER FIELD AND NO CROSS-TABULATION. Pairing "Kano" with "maize" because both are top of
 * their column would be inventing a claim nobody made: the person who said Kano may have said
 * cassava. Each line says what its own column says, and the reader does the joining, which is the
 * honest division of labour here.
 */
export interface WhereItPoints {
  fieldId: string;
  asks: string;
  value: string;
  howMany: number;
  ofHowMany: number;
  share: number;
  /** Whether this is enough to act on, in the table's own vocabulary. */
  standing: AnAssessment['standing'];
  say: string;
}

export function whereTheAnswersPoint(reads: AFieldRead[], assessments: AnAssessment[]): WhereItPoints[] {
  const out: WhereItPoints[] = [];
  for (const r of reads) {
    const top = r.counts[0];
    if (!top || !r.answered) continue;
    /* One person naming a thing is an anecdote, and a prioritisation built on anecdotes is worse
       than none: it reads as a recommendation and is a single sentence somebody said once. */
    if (top.howMany < 2) continue;
    const a = assessments.find((x) => x.fieldId === r.field.id);
    const standing = a?.standing ?? 'THIN';
    out.push({
      fieldId: r.field.id,
      asks: r.field.asks,
      value: top.value,
      howMany: top.howMany,
      ofHowMany: r.answered,
      share: top.share,
      standing,
      say: `${r.field.asks} -> ${top.value}, named by ${top.howMany} of the ${r.answered} who answered`
        + (standing === 'SOLID' ? '.' : standing === 'THIN' ? ', which is too few to rank on.' : ', and the answers are split.'),
    });
  }
  /* Strongest support first: the number of people, then the share of those who answered. */
  return out.sort((x, y) => y.howMany - x.howMany || y.share - x.share);
}

export function theTable(reads: AFieldRead[], assessments: AnAssessment[], howMany: number): string {
  const lines = [`${howMany} people answered this check-in.`, ''];
  for (const r of reads) {
    const a = assessments.find((x) => x.fieldId === r.field.id);
    lines.push(`FIELD: ${r.field.asks}`);
    lines.push(`  standing: ${a?.standing} - ${a?.because}`);
    lines.push(`  asked ${r.asked} · answered ${r.answered} · said they cannot ${r.couldNotSay} · never reached ${r.neverReached}`);
    for (const c of r.counts.slice(0, 12)) {
      lines.push(`  ${String(c.howMany).padStart(3)}  ${Math.round(c.share * 100)}%  ${c.value}`);
    }
    for (const k of r.byKind.slice(0, 6)) {
      const top = k.counts.slice(0, 3).map((c) => `${c.value} (${c.howMany})`).join(', ');
      if (top) lines.push(`  by kind - ${k.kind}: ${top}`);
    }
    lines.push('');
  }
  /*
   * AND WHERE ALL OF IT POINTS, composed rather than left to the reader to assemble from nine
   * separate standings. See whereTheAnswersPoint for why it is one line per field and never a
   * cross-tabulation.
   */
  const points = whereTheAnswersPoint(reads, assessments);
  if (points.length) {
    lines.push('WHERE THE ANSWERS POINT, strongest support first. Each line is its own column; do not pair two of them into one claim, because the people behind them are not the same people.');
    for (const p of points) lines.push(`  ${p.say}`);
    lines.push('');
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------------------------------------
 * RECOMMEND - the only part a model writes, and it is handed nothing but the table
 * ---------------------------------------------------------------------------------------------- */

/*
 * A MOVE IS SOMETHING THE READER DOES. The lead read "Tell you what Blessing Okafor's record says
 * about the handover time changing" and "Ask you to decide what Zainab Suleiman should work on now"
 * (8 such moves in run-5, 4 in run-6). The judgement is written about labels, so the model wrote
 * "Tell the initiator ..." as if the lead were somebody else, and serving turned the label into
 * "you". Both WHAT TO DO items now say the move is an instruction to the reader. Nothing rewrites
 * the text afterwards; the instruction is where it is fixed.
 */
export function theJudgementInstruction(whoIsReading: string, whatTheyAreDeciding: string): string {
  return fillTheJudgement(theJudgementTemplate(), { whoIsReading, whatTheyAreDeciding, leadName: null });
}

/*
 * THE JUDGEMENT'S INSTRUCTIONS ARE STORED VERSIONS TOO (plan for requests 123 item 7, 134 item 4, 135 item 3).
 *
 * The judgement was the one prompt with no `PromptVersion` key, so a report's `promptVersionId` said which synthesis
 * prompt ran and nothing said which judgement prompt did. Each instruction is now a template with three places to
 * fill: who is reading, what they are deciding, and the line about the person running it. The code text below is the
 * fallback, and the stored version under these keys wins where one is active. The id of the one that ran is kept
 * inside the stored judgement as `promptVersionId`.
 */
export const THE_JUDGEMENT_POPULATION_KEY = 'the_judgement_population';
export const THE_JUDGEMENT_ROOM_KEY = 'the_judgement_room';

export function theLeadLine(leadName: string | null): string {
  return leadName
    ? `THE PERSON RUNNING THIS IS ${leadName}. They are not one of the people being checked in on and must never be counted as one. Where the record shows something about how they are running it, say that - it is often the most useful thing here - but say it as their own finding.`
    : 'One of these people runs the check-in and is not one of the people being checked in on. Never count them as one.';
}

export function fillTheJudgement(template: string, a: { whoIsReading: string; whatTheyAreDeciding: string; leadName: string | null }): string {
  return template
    .split('{{whoIsReading}}').join(a.whoIsReading)
    .split('{{whatTheyAreDeciding}}').join(a.whatTheyAreDeciding)
    .split('{{theLeadLine}}').join(theLeadLine(a.leadName));
}

export function theJudgementTemplate(): string {
  return [
    'You are writing the judgement over a check-in that {{whoIsReading}} ran. They are deciding: {{whatTheyAreDeciding}}',
    '',
    'You are given a TABLE of counts computed from the answers. It is everything you have and everything you may use.',
    '',
    'THE ONE RULE: every sentence you write contains a number that is in the table. If you cannot put a number in a sentence, the sentence does not go in. This is not a style preference - it is what separates a judgement from an impression, and the last report was thrown out for being an impression.',
    '',
    'WRITE LIKE A PERSON TALKING TO ANOTHER PERSON. The reader runs a business. Say the thing.',
    '  No metaphors. No "landscape", "journey", "ecosystem", "tapestry", "lens", "unlock", "leverage", "navigate".',
    '  No "it is worth noting", "it is important to", "this suggests that", "there appears to be".',
    '  Short sentences. One idea each. The words the respondents themselves used.',
    '  Never soften a number. "29 of 34 have no way to check a new supplier" is the sentence; do not write "many rely on informal methods".',
    '',
    'WHAT GOES WRONG IF YOU GUESS: this goes to somebody who will spend money on it. A recommendation the counts do not support costs them a quarter. Where the table says a field is THIN or SPLIT, say so and recommend finding out, not acting.',
    '',
    'FIVE THINGS, AND NOTHING ELSE:',
    '',
    '1. THE GAP, in one or two sentences. The single thing this group cannot do today, with the count that proves it. This is the first thing the reader reads and the only thing they will remember.',
    '',
    '2. WHAT THE NUMBERS SAY - one line per field that has a standing of SOLID, SPLIT or NOBODY_COULD_ANSWER. The count first, then what it means for the decision. Skip THIN and WE_NEVER_ASKED fields here; they belong in 4 and 5.',
    '',
    '3. WHAT TO DO, ranked, most valuable first, three to five of them. Each one: the move, the count that justifies it, and who to start with by name or by kind of organisation. A move nobody could act on next week is not a move. Every move is something the reader does themselves, written as an instruction to them: "Speak with Ngozi Eze about the 11 applications." Never write a move that tells, asks or shows the reader something, such as "Tell the initiator..." or "Ask the initiator to...". Where the reader is the one who must act, write what they do.',
    '',
    '4. WHAT THIS CANNOT TELL YOU. Every field the table marks THIN or SPLIT, and what it would take to know. A reader who cannot see the edge of the data calls the whole thing abstract.',
    '',
    '5. WHAT WE FAILED TO ASK. Every field marked WE_NEVER_ASKED, with the number of conversations that missed it. This is our failure, said plainly, and it is the instruction for the next round.',
    '',
    PLAIN_WORDS,
    '',
    EVERY_VERB_KEEPS_ITS_SUBJECT,
  ].join('\n');
}

/* ------------------------------------------------------------------------------------------------
 * A ROOM IS NOT A POPULATION, AND THE COUNTS MEAN NOTHING IN ONE
 * ---------------------------------------------------------------------------------------------- */

/**
 * BELOW THIS MANY PEOPLE, THE JUDGEMENT STOPS COUNTING AND STARTS NAMING.
 *
 * Measured across three live scenarios, 24 September 2026, and it failed the same way in all three:
 *
 *   Four salespeople. "3 of the 4 relationship officers cannot say what the total value of their
 *   pipeline is" -> give them a tool to track pipeline value. And "3 of 4 officers report that all
 *   their facilities are blocked" - collapsing the man who has submitted nothing, the woman whose
 *   eleven files are genuinely stuck at credit committee, and the man who is counting applications
 *   as approvals, into one sentence. Those three need three different conversations.
 *
 *   A chief executive and her new hire. "2 of 2 new hires are blocked." One of the two is the chief
 *   executive.
 *
 *   Eight borrowers. "5 of 7 people cannot tell you their average weekly revenue" -> give them a way
 *   to track revenue. The actual finding, which the narrative half of the same report found, was
 *   that the repayment schedule starts before any of these assets can earn.
 *
 * None of that is the model being careless. `ENOUGH_TO_COUNT` is 8, so on a small ground EVERY field
 * comes back THIN, the instruction says skip THIN fields, and the only material left is a proportion
 * of four. A proportion of four is not a finding; it is four people, and the difference between them
 * is the whole point.
 *
 * SO A SMALL GROUND GETS A DIFFERENT JUDGEMENT, written from the people rather than from the fields.
 * The arithmetic route is untouched for the corpus it was built for.
 */
/**
 * TWENTY, AND NOT `ENOUGH_TO_COUNT`, WHICH ANSWERS A DIFFERENT QUESTION.
 *
 * The first version of this borrowed the eight that decides whether a FIELD can be ranked. Those
 * are two different questions and using one constant for both put a nine-person loan cohort back on
 * the population route, where it produced "4 of 6 people who were asked do not know their monthly
 * revenue" - and missed both the borrower who never received his asset and the repayment schedule
 * that starts before any of these assets can earn, which the narrative half of the same report had
 * found.
 *
 * The question here is not "can this column be ranked". It is "can I name everybody". A block per
 * person is about five lines, so twenty people is a hundred lines, which a prompt holds and a reader
 * can follow. A hundred and one cannot be named and must be counted - that corpus is what the
 * arithmetic route was built for and it keeps it.
 */
export const A_POPULATION_STARTS_AT = 20;

export function thisIsARoom(howManyPeople: number): boolean {
  return howManyPeople < A_POPULATION_STARTS_AT;
}

export interface SomebodyInTheRoom {
  /** How they are named to this reader. */
  who: string;
  /** Lead, or one of the people being checked in on. The judgement must not count these together. */
  isLead: boolean;
  role: string | null;
  /** The product's own paragraph about them: what they said it was for, where they stand, what is in the way. */
  finding: string | null;
  /**
   * Behaviours seen often enough to be a pattern, under their PLAIN name and never the internal one
   * or the code: the lead reads the judgement, and the model writes the names it is given into it.
   * Only the ones the lead may already read. See patterns/who-reads-a-pattern. Never a verdict.
   */
  patterns: { name: string; observation: string; seenInSessions: number[] }[];
  /** What they said they would do and nobody has closed. */
  openCommitments: string[];
}

/** The room, as the model is given it. One block per person, and the differences between them. */
export function theRoom(
  people: SomebodyInTheRoom[],
  differences: { topic: string; positions: { who: string; view: string }[] }[],
  sessions: number,
  /* What more than one person's record names. Counted, not judged - see
     what-more-than-one-person-named.ts. Omitted where nothing is shared. */
  sharedNames = '',
): string {
  const lines: string[] = [
    `${people.length} people, ${sessions} ${sessions === 1 ? 'session' : 'sessions'}.`,
    '',
  ];
  for (const p of people) {
    lines.push(`--- ${p.who}${p.isLead ? ' (RUNS THIS CHECK-IN - not one of the people being checked in on)' : ''}`);
    if (p.role) lines.push(`    taken on for: ${p.role}`);
    if (p.finding) lines.push(`    what the record holds: ${p.finding}`);
    for (const x of p.patterns) {
      lines.push(`    seen in sessions ${x.seenInSessions.join(', ')} (${x.name}): ${x.observation}`);
    }
    for (const c of p.openCommitments.slice(0, 6)) lines.push(`    said they would, nobody has closed it: "${c}"`);
    lines.push('');
  }
  if (differences.length) {
    lines.push('WHERE THE ACCOUNTS DIFFER');
    for (const d of differences) {
      lines.push(`  ${d.topic}`);
      for (const pos of d.positions) lines.push(`    ${pos.who}: ${pos.view}`);
    }
    lines.push('');
  }
  /* Last, because it is the thing nobody in the check-in can see from where they sit. */
  if (sharedNames.trim()) lines.push(sharedNames.trim());
  return lines.join('\n');
}

/**
 * The instruction for a room. Same output shape as the population one, so nothing downstream changes.
 *
 * THE RULE INVERTS. In a population every sentence must carry a count. Here every sentence must
 * carry a PERSON, because a count over four people is what produced "3 of 4 are blocked" about three
 * people in three different situations.
 */
export function theJudgementOverARoom(whoIsReading: string, whatTheyAreDeciding: string, leadName: string | null): string {
  return fillTheJudgement(theRoomJudgementTemplate(), { whoIsReading, whatTheyAreDeciding, leadName });
}

export function theRoomJudgementTemplate(): string {
  return [
    'You are writing the judgement over a check-in that {{whoIsReading}} ran. They are deciding: {{whatTheyAreDeciding}}',
    '',
    'You are given a BLOCK PER PERSON: what they were taken on for, what the record holds about them, behaviours seen often enough to be a pattern, and what they said they would do that nobody has closed. Then the places the accounts differ. That is everything you have and everything you may use.',
    '',
    'THE ONE RULE: every sentence names a PERSON. Not "3 of 4", not "most of the team", not "several people". This is a room, not a survey - there are few enough people here to say which one you mean, and a proportion of four hides the only thing that matters, which is that they are in different situations.',
    '',
    'NEVER MERGE TWO PEOPLE WHOSE REASONS DIFFER. Somebody who has submitted nothing, somebody whose work is genuinely stuck with a third party, and somebody who has misunderstood what is being counted can all look like "behind" from a distance. They need three different conversations. If two blocks say different things, they are two findings.',
    '{{theLeadLine}}',
    '',
    'AND NOTHING IS ANYBODY\'S FAULT UNLESS AN ACCOUNT SAYS SO. This is the limit on the line above, and it was written because the line above was taken too far. State what the record holds. Never write that somebody caused a problem, failed to do something, or made the situation happen, unless one of the blocks actually says it. "Nobody wrote the target down" is what the record holds. "You created this problem" is a charge, and a charge nobody made is an invention, however reasonable it looks from the blocks. If you find yourself explaining why things are as they are, stop and write what is on the record instead.',
    '',
    'A REASON IS ONLY A REASON IF SOMEBODY SAID IT. Naming a person is not the same as being right about them. Two live reports: "Kwame Mensah is also blocked by the credit committee", when Kwame had said "I haven\'t actually checked in with Credit about those specific 19 applications yet" - he is not blocked, he has not understood what is being counted; and "Martin Vogel is waiting on a decision to hire more analysts", when hiring analysts was the CUSTOMER\'s problem that Martin reported, not anything Martin is waiting on. Where you write that somebody is blocked, waiting, or held up, one block must say so in their own words. Where their words say the opposite, their words win.',
    '',
    'AND TWO FACTS SIDE BY SIDE ARE NOT A CAUSE. One block says a number rose; another says something ended. Writing that the first caused the second puts a claim in somebody\'s mouth that they did not make, and anything you tell the reader on top of it - that they are looking in the wrong place, that they have the reason wrong - is then built on your own invention. Where two things are both on the record and nobody has joined them, leave them unjoined and put them in order, as the rule on pieces of one story says.',
    '',
    'AND A MOVE IS ABOUT THIS CHECK-IN, NEVER ABOUT SOMEBODY ELSE\'S PROBLEM. "Make the decision about hiring more analysts" was put to a lead whose check-in is about what a customer said: the customer cannot hire analysts, and that became an instruction to the reader. Before you write a move, find the line in a block it comes from. If there is not one, it is not a move, however sensible it sounds.',
    '',
    'THE SAME THING IN TWO BLOCKS IS USUALLY THE FINDING, and it is the thing most often missed. Read across the blocks for one name, one number, one supplier, one piece of work appearing in two people\'s accounts who do not know about each other. Two people costing the same contractor into two different plans is the reason the budget does not add up, and neither of them can see it from where they sit. Nobody will tell you this in their own block; it only exists between them. Where you find one, it is almost always the gap.',
    '',
    'THE SAME CAUSE IN SEVERAL BLOCKS IS ONE FINDING. When several people give the same reason in their own words, say it once, as one cause, and name everyone it applies to. Keep anybody whose reason differs as a finding of their own. A cause that several people share is usually about how the thing is set up, not about the people, so say what in the arrangement would need to change, but only as far as the blocks support it.',
    '',
    'PIECES OF ONE STORY GO IN ORDER. When different people each hold one piece of what happened, put the pieces in the order they happened, with the dates the blocks give, and say that no one person had all of them. Each piece still names the person who held it, and putting the pieces in order is not saying whose fault it was.',
    '',
    'WRITE LIKE A PERSON TALKING TO ANOTHER PERSON. The reader runs a business. Say the thing.',
    '  No metaphors. No "landscape", "journey", "ecosystem", "lens", "unlock", "leverage", "navigate".',
    '  No "it is worth noting", "it is important to", "this suggests that", "there appears to be".',
    '  Short sentences. One idea each. The words the people themselves used.',
    '',
    'NEVER DECIDE ABOUT A PERSON. Not "X should be let go", not "X is underperforming", not a rating. Say what the record holds and what it means for the decision the reader has to make. They decide.',
    '',
    'FIVE THINGS, AND NOTHING ELSE:',
    '',
    '1. THE GAP, in one or two sentences. The single most important thing the reader does not currently know or is getting wrong, naming who it is about. This is the only thing they will remember.',
    '',
    '2. WHAT THE RECORD SHOWS - one line per person who has something worth a line. Name them, say what the record holds, and say what it means for the decision. Somebody the record shows doing the job well gets a line too; a judgement that only names problems is not a judgement.',
    '',
    '3. WHAT TO DO, ranked, most valuable first, three to five. Each one: the move, the person it is about, and what in the record justifies it. A move nobody could make next week is not a move. Every move is something the reader does themselves, written as an instruction to them: "Speak with Ngozi Eze about the 11 applications." Never write a move that tells, asks or shows the reader something, such as "Tell the initiator..." or "Ask the initiator to...". Where the reader is the one who must act, write what they do.',
    '',
    '4. WHAT THIS CANNOT TELL YOU. What is not on the record, and what it would take to know. Somebody who has said little is a gap in the record, not a finding about them.',
    '',
    '5. WHAT WE FAILED TO ASK. Anything the check-in should have asked and did not. Ours to own.',
    '',
    PLAIN_WORDS,
    '',
    EVERY_VERB_KEEPS_ITS_SUBJECT,
  ].filter(Boolean).join('\n');
}

export const THE_JUDGEMENT_SCHEMA = {
  name: 'the_judgement',
  description: 'The judgement over a set of check-in answers: the gap, what the counts say, what to do, and what this cannot tell anybody.',
  input_schema: {
    type: 'object',
    properties: {
      theGap: { type: 'string', description: 'One or two plain sentences with the count that proves it.' },
      whatTheNumbersSay: {
        type: 'array',
        description: 'One per field worth reporting. Count first, then what it means for the decision.',
        items: {
          type: 'object',
          properties: {
            fieldId: { type: 'string' },
            says: { type: 'string', description: 'Plain sentence containing the count.' },
            soWhat: { type: 'string', description: 'What it changes for the reader\'s decision. One sentence.' },
          },
          required: ['fieldId', 'says', 'soWhat'],
        },
      },
      whatToDo: {
        type: 'array',
        description: 'Three to five moves, most valuable first.',
        items: {
          type: 'object',
          properties: {
            move: { type: 'string', description: 'What to do, in the imperative, specific enough to start next week.' },
            because: { type: 'string', description: 'The count that justifies it.' },
            startWith: { type: 'string', description: 'Who to begin with: named people, or a kind of organisation with how many of them there are.' },
          },
          required: ['move', 'because', 'startWith'],
        },
      },
      whatThisCannotTellYou: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            about: { type: 'string' },
            why: { type: 'string', description: 'The count that makes it unusable.' },
            toKnow: { type: 'string', description: 'What it would take to find out.' },
          },
          required: ['about', 'why'],
        },
      },
      whatWeFailedToAsk: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            about: { type: 'string' },
            howManyMissedIt: { type: 'number' },
          },
          required: ['about', 'howManyMissedIt'],
        },
      },
    },
    required: ['theGap', 'whatTheNumbersSay', 'whatToDo'],
  },
} as const;

/* ------------------------------------------------------------------------------------------------
 * AND THE ONE RULE IS ENFORCED, NOT REQUESTED
 * ---------------------------------------------------------------------------------------------- */

/** Metaphors and hedges the last report was thrown out for. Checked, not asked for. */
/**
 * THE SAME SHAPE, ASKING FOR A PERSON WHERE THE OTHER ONE ASKS FOR A COUNT.
 *
 * The room instruction landed and the room's `whatToDo` came back EMPTY. The instruction says every
 * sentence names a person and never a proportion; the schema it was filling says `because` is "the
 * count that justifies it" and `startWith` is "a kind of organisation with how many of them there
 * are". The model could not satisfy both, left the fields blank, and `withoutTheEmptyOnes` dropped
 * the whole array - so the one section that says what to do about any of it disappeared.
 *
 * Identical field names, so every reader, every guard and every stored report is unchanged. Only
 * the descriptions differ, and they differ in exactly the way the instruction does.
 */
export const THE_ROOM_JUDGEMENT_SCHEMA = {
  name: 'the_judgement',
  description: 'The judgement over a room: the gap, what the record shows about each person, what to do, and what this cannot tell anybody.',
  input_schema: {
    type: 'object',
    properties: {
      theGap: { type: 'string', description: 'One or two plain sentences naming who it is about.' },
      whatTheNumbersSay: {
        type: 'array',
        description: 'One per person who has something worth a line, including anybody the record shows doing the job well.',
        items: {
          type: 'object',
          properties: {
            fieldId: { type: 'string', description: 'The person this line is about, exactly as they are named in the blocks.' },
            says: { type: 'string', description: 'What the record holds about them. Their name, and what it shows.' },
            soWhat: { type: 'string', description: 'What it changes for the reader\'s decision. One sentence.' },
          },
          required: ['says', 'soWhat'],
        },
      },
      whatToDo: {
        type: 'array',
        description: 'Three to five moves, most valuable first. One per person where the record calls for a different conversation with each.',
        items: {
          type: 'object',
          properties: {
            move: { type: 'string', description: 'What to do, in the imperative, specific enough to start next week.' },
            because: { type: 'string', description: 'What in the record justifies it, in the person\'s own terms.' },
            startWith: { type: 'string', description: 'Which person to begin with, by name.' },
          },
          required: ['move', 'because'],
        },
      },
      whatThisCannotTellYou: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            about: { type: 'string' },
            why: { type: 'string', description: 'What the record does not hold. Somebody who has said little is a gap in the record, not a finding about them.' },
            toKnow: { type: 'string', description: 'What it would take to find out.' },
          },
          required: ['about', 'why'],
        },
      },
      whatWeFailedToAsk: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            about: { type: 'string' },
            howManyMissedIt: { type: 'number', description: 'How many people it was not asked of.' },
          },
          required: ['about'],
        },
      },
    },
    required: ['theGap', 'whatTheNumbersSay', 'whatToDo', 'whatThisCannotTellYou'],
  },
} as const;

export const NOT_HOW_A_PERSON_TALKS = [
  /\blandscape\b/i, /\becosystem\b/i, /\bjourney\b/i, /\btapestry\b/i, /\bthrough the lens\b/i,
  /\bunlock(?:ing|s)?\b/i, /\bleverage\b/i, /\bnavigat(?:e|ing)\b/i, /\bholistic\b/i, /\bsynerg/i,
  /\bit is worth noting\b/i, /\bit is important to\b/i, /\bthis suggests that\b/i,
  /\bthere appears to be\b/i, /\bmay potentially\b/i, /\bsome would argue\b/i, /\bin many ways\b/i,
];

/**
 * A SENTENCE WITH NO NUMBER IN IT IS NOT A FINDING.
 *
 * The prompt says it in the strongest terms available and that is not enough - it was not enough for
 * the report promise, the filler sentence or the goodbye, each of which arrived anyway. So the
 * sentences are read. A finding that carries no count is dropped rather than softened: the reader
 * has already told us what an ungrounded sentence is worth to him.
 */
export function everySentenceCarriesANumber(text: string): boolean {
  return /\d/.test(text ?? '');
}

export function talksLikeAPerson(text: string): string[] {
  return NOT_HOW_A_PERSON_TALKS.filter((rx) => rx.test(text ?? '')).map((rx) => String(rx));
}
