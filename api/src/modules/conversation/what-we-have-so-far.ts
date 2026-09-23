/**
 * WHAT WE HAVE SO FAR.
 *
 * The conversation had a brief, a checklist of the brief's items, and a nineteen-thousand-word
 * prompt. What it did not have was any model of what it had established. Every turn was: reflect
 * the answer back, ask the next unasked item. Measured across a hundred real conversations - 626
 * questions - the distribution followed the brief's own wording rather than anything anybody said:
 * 91 questions about expansion plans, 62 about volumes, and 15 about how people vet each other, on
 * a check-in whose strongest finding turned out to be that nineteen organisations cannot vet
 * anybody. Hafsah: "it is a generic conversation not by an expert."
 *
 * This is the missing piece. After each answer the check-in holds a small typed record of what has
 * actually been established, and from it a DETERMINISTIC list of what is missing - ranked.
 *
 * WHY IT MATTERS THAT THE GAPS ARE DETERMINISTIC. The expertise this feeds (see X1/X2, the
 * challenge and the decompose) must never invent a requirement. So the requirements live here, in
 * code, as properties of a claim's TYPE: a target needs a measure, a measure needs a way to verify
 * it, a number needs a baseline to be a change, a plan needs an owner and a date. None of that is
 * a fact about anybody's business - it is what the claim itself needs in order to be checkable -
 * so it can be asserted without knowing anything about Nigeria, horticulture or aggregators.
 *
 * WHAT IS NOT HERE. No judgement, no scoring, no verdict on whether somebody is doing well. The
 * state records what was said and what is missing from it, and that is all. The reading of it is
 * the conversation's job and the report's job.
 */

/** What kind of thing somebody said. The type decides what the claim needs to be checkable. */
export type ClaimKind = 'FACT' | 'TARGET' | 'PLAN' | 'OPINION';

export interface Claim {
  /** Stable within a check-in, so a later turn can fill a field in rather than add a second claim. */
  id: string;
  kind: ClaimKind;
  /** Their words, trimmed. Never ours: everything downstream quotes this. */
  said: string;
  /** What is being counted, where they named one: "income", "signed sales", "meetings". */
  measure?: string | null;
  /** The figure, as they gave it: "30%", "30,000", "4,000MT". */
  number?: string | null;
  /** Where it starts from, which is what makes a number a change rather than a level. */
  baseline?: string | null;
  /** How they would know: "sales records", "a survey", "the weighbridge". */
  verification?: string | null;
  /** Who does it. A name, a role, or an organisation. */
  owner?: string | null;
  /** By when. */
  date?: string | null;
  /** Where: a state, a market, a corridor. */
  place?: string | null;
  session: number;
}

export interface Contradiction {
  /** The two claim ids that cannot both hold. */
  between: [string, string];
  /** Why, in one plain clause. */
  why: string;
}

export interface WhatWeHave {
  claims: Claim[];
  contradictions: Contradiction[];
  /** How many turns were about the product rather than the work. Counted, never stored as content. */
  remarks: number;
  /** How many answers about the work there have been. */
  answers: number;
  /** Who we are talking to, where they have said. */
  who?: { name?: string | null; role?: string | null; organisation?: string | null };
}

export const nothingYet = (): WhatWeHave => ({ claims: [], contradictions: [], remarks: 0, answers: 0 });

/* ------------------------------------------------------------------------------------------------
 * WHAT IS MISSING, AND WHY IT IS MISSING
 * ---------------------------------------------------------------------------------------------- */

/** The kinds of hole a claim can have. Each one is a property of the claim's type, not an opinion. */
export type GapKind =
  | 'target-has-no-measure'
  | 'measure-cannot-be-verified'
  | 'number-has-no-baseline'
  | 'plan-has-no-owner'
  | 'plan-has-no-date'
  | 'nobody-said-who-they-are';

export interface Gap {
  kind: GapKind;
  /** The claim it is about, or null where it is about the conversation as a whole. */
  claimId: string | null;
  /** Their own words, so whatever asks about it can quote them rather than paraphrase. */
  about: string;
  /** Why this hole matters, in one clause, for the turn that raises it. */
  because: string;
}

/**
 * HOW THEY RANK, AND IT IS NOT BY HOW EASY THEY ARE TO ASK ABOUT.
 *
 * A target nobody can verify is the hole that makes every other answer unusable, so it goes first.
 * Not knowing who you are talking to comes next, because it is cheap and it was the first thing
 * Hafsah noticed was missing ("you didnt even ask me what i do"). Dates come last: a plan with an
 * owner and no date is still a plan, and a plan with a date and no owner is a wish.
 */
const WORST_FIRST: GapKind[] = [
  'measure-cannot-be-verified',
  'target-has-no-measure',
  'number-has-no-baseline',
  'nobody-said-who-they-are',
  'plan-has-no-owner',
  'plan-has-no-date',
];

const shorten = (t: string, n = 80) => (t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`);

/**
 * The holes in what we have, worst first.
 *
 * Pure. No model, no prompt, no network. Everything that challenges somebody reads from this, so
 * this is the only place a requirement is ever decided.
 */
export function whatIsMissing(state: WhatWeHave): Gap[] {
  const out: Gap[] = [];

  for (const c of state.claims) {
    if (c.kind === 'TARGET') {
      if (!c.measure) {
        out.push({
          kind: 'target-has-no-measure', claimId: c.id, about: shorten(c.said),
          because: 'there is nothing named that would go up or down, so nobody can tell whether it happened',
        });
      } else if (!c.verification) {
        out.push({
          kind: 'measure-cannot-be-verified', claimId: c.id, about: shorten(c.said),
          because: `nothing says where the ${c.measure} figure would come from`,
        });
      }
      /* A number is a change only against a starting point. "Up 30%" with no before is a wish. */
      if (c.number && !c.baseline) {
        out.push({
          kind: 'number-has-no-baseline', claimId: c.id, about: shorten(c.said),
          because: `${c.number} is a change, and nothing says what it is a change from`,
        });
      }
    }
    if (c.kind === 'PLAN') {
      if (!c.owner) {
        out.push({
          kind: 'plan-has-no-owner', claimId: c.id, about: shorten(c.said),
          because: 'nobody is named as doing it',
        });
      }
      if (!c.date) {
        out.push({
          kind: 'plan-has-no-date', claimId: c.id, about: shorten(c.said),
          because: 'there is no date on it',
        });
      }
    }
  }

  /*
   * AND WHO WE ARE TALKING TO, WHICH THE PRODUCT NEVER ASKED.
   *
   * Not raised on the very first turn - somebody who has said one thing has not withheld anything
   * yet - and never once somebody has said what they do.
   */
  const nameless = !state.who?.role && !state.who?.organisation;
  if (nameless && state.answers >= 2) {
    out.push({
      kind: 'nobody-said-who-they-are', claimId: null, about: '',
      because: 'nothing on the record says what this person does or who they do it for',
    });
  }

  return out.sort((a, b) => WORST_FIRST.indexOf(a.kind) - WORST_FIRST.indexOf(b.kind));
}

/** The one worth raising next, or null where there is nothing missing that matters. */
export function theGapWorthRaising(state: WhatWeHave): Gap | null {
  return whatIsMissing(state)[0] ?? null;
}

/**
 * MERGING A TURN INTO WHAT WE ALREADY HAVE.
 *
 * A later answer usually FILLS a field rather than making a new claim: "increase their incomes by
 * 30%" then "sales records" is one target with a verification, not two claims. Matched on id where
 * the extractor gives one it has seen, and otherwise appended.
 *
 * Fields are only ever filled in, never overwritten with nothing - a turn that does not mention the
 * date must not erase the date.
 */
export function withThisTurn(state: WhatWeHave, said: Claim[], wasARemark: boolean): WhatWeHave {
  const claims = state.claims.map((c) => ({ ...c }));
  for (const incoming of said) {
    const at = claims.findIndex((c) => c.id === incoming.id);
    if (at === -1) {
      claims.push({ ...incoming });
      continue;
    }
    const before = claims[at];
    /* A sharpen carries no words and no kind - see the two arrays in noteWhatTheySaid - so those
       fall through to what is already held rather than blanking it. */
    claims[at] = {
      ...before,
      /*
       * THE FIRST WORDS THEY USED FOR IT ARE THE CLAIM, AND THEY ARE NOT OVERWRITTEN.
       *
       * My first version let the newest words win, on the theory that a restated claim is a
       * sharpened one. Proven wrong on a live replay of her own five answers: the extractor kept
       * reusing one id, so the claim's words walked from "run interventions to impact 30k women
       * farmers" to "getting data from the women before and after the intervention" while the
       * measure and number from the earlier turns stayed attached. One claim, three subjects, and
       * the 30% target gone.
       *
       * A later turn adds FIELDS. It never renames the thing. If they are talking about something
       * else, that is a different claim and it needs a different id - which the extractor is now
       * told explicitly.
       */
      kind: incoming.kind ?? before.kind,
      measure: incoming.measure ?? before.measure ?? null,
      number: incoming.number ?? before.number ?? null,
      baseline: incoming.baseline ?? before.baseline ?? null,
      verification: incoming.verification ?? before.verification ?? null,
      owner: incoming.owner ?? before.owner ?? null,
      date: incoming.date ?? before.date ?? null,
      place: incoming.place ?? before.place ?? null,
    };
  }
  return {
    ...state,
    claims,
    remarks: state.remarks + (wasARemark ? 1 : 0),
    answers: state.answers + (wasARemark ? 0 : 1),
  };
}

/* ------------------------------------------------------------------------------------------------
 * WHAT THE CONVERSATION IS TOLD ABOUT IT
 * ---------------------------------------------------------------------------------------------- */

/** How each hole is put to somebody, in the words the turn should use. */
const HOW_TO_RAISE: Record<GapKind, (g: Gap) => string> = {
  'measure-cannot-be-verified': (g) =>
    `They have named something to hit but nothing that would show it: ${g.because}. Ask where that figure would come from - whose records, which system, who reads it - and if the honest answer is that nobody collects it, say so plainly rather than moving on.`,
  'target-has-no-measure': (g) =>
    `They have named a goal with nothing in it that goes up or down: ${g.because}. Ask what they would look at to know it had happened.`,
  'number-has-no-baseline': (g) =>
    `They have given a change with no starting point: ${g.because}. Ask what it is now. A change nobody can measure from is not a target, and at the end of this it will not be claimable.`,
  'nobody-said-who-they-are': () =>
    'Nothing on the record says what this person does or who they do it for, and everything else they say has to be read against it. Ask, in one short question, before anything else.',
  'plan-has-no-owner': (g) =>
    `They have described something being done with nobody named as doing it: ${g.because}. Ask who.`,
  'plan-has-no-date': (g) =>
    `They have described something being done with no date on it: ${g.because}. Ask by when.`,
};

/**
 * THE ONE THING WORTH ASKING ABOUT NEXT, AND WHY.
 *
 * This is what replaces "ask the next item on the brief". The brief is still the floor - where
 * nothing is missing from what they have said, the conversation goes back to it - but where
 * something IS missing, the hole is more useful than the next unasked heading. Measured on a
 * hundred real conversations, the old arrangement asked about volumes 62 times and about how people
 * vet each other 15 times, on a check-in whose strongest finding was that nobody can vet anybody.
 *
 * It never overrides what somebody just said: the rule below says answer them first. It decides
 * what to ASK, not what to ignore.
 */
export function whatToAskAbout(state: WhatWeHave | null | undefined): string {
  if (!state) return '';
  const gap = theGapWorthRaising(state);
  if (!gap) return '';
  const quoted = gap.about ? ` Their words for it: "${gap.about}".` : '';
  return [
    'THE MOST USEFUL THING MISSING FROM WHAT THEY HAVE SAID:',
    `${HOW_TO_RAISE[gap.kind](gap)}${quoted}`,
    '',
    'Answer whatever they just said first. Then this, unless they have raised something that matters more - in which case follow that and this will still be here next turn.',
    'Ask it as one question. Do not stack it with anything else.',
  ].join('\n');
}
