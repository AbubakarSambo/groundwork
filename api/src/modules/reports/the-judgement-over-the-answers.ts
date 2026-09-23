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
  return lines.join('\n');
}

/* ------------------------------------------------------------------------------------------------
 * RECOMMEND - the only part a model writes, and it is handed nothing but the table
 * ---------------------------------------------------------------------------------------------- */

export function theJudgementInstruction(whoIsReading: string, whatTheyAreDeciding: string): string {
  return [
    `You are writing the judgement over a check-in that ${whoIsReading} ran. They are deciding: ${whatTheyAreDeciding}`,
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
    '3. WHAT TO DO, ranked, most valuable first, three to five of them. Each one: the move, the count that justifies it, and who to start with by name or by kind of organisation. A move nobody could act on next week is not a move.',
    '',
    '4. WHAT THIS CANNOT TELL YOU. Every field the table marks THIN or SPLIT, and what it would take to know. A reader who cannot see the edge of the data calls the whole thing abstract.',
    '',
    '5. WHAT WE FAILED TO ASK. Every field marked WE_NEVER_ASKED, with the number of conversations that missed it. This is our failure, said plainly, and it is the instruction for the next round.',
  ].join('\n');
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
