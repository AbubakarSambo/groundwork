/**
 * WHAT IS TRUE FOR THIS PERSON, ASSEMBLED ONCE.
 *
 * Every lane fetched its own facts, so what the assistant knew depended on
 * which question you asked. It could tell you your target and not what the
 * company had written down about that same work, because those live in
 * different lanes and only one runs per question.
 *
 * The cost showed up as duplication before it showed up as a wrong answer:
 * "what check-ins are waiting for this person" was written three times in one
 * day — in the API, in a lane, and in the panel — and the three had already
 * drifted. The first returned an empty list to somebody with a session in front
 * of them, because it matched on the account and the other two also matched on
 * the address an invitation went to.
 *
 * THREE RULES, AND THEY ARE THE WHOLE FILE.
 *
 *   1. EVERY FACT SAYS WHERE IT CAME FROM. An assistant that cannot cite is one
 *      nobody can check, and the first time it is wrong about somebody's target
 *      the question is always "where did you get that".
 *
 *   2. IT IS BOUNDED, AND THE BOUND IS ONE NUMBER. Assembling everything makes
 *      answers worse as an organisation grows, and the failure is silent.
 *
 *   3. NOTHING FROM ANYBODY ELSE'S PRIVATE ACCOUNT. Not by instruction in a
 *      prompt — by never selecting it. What a person said in their own check-in
 *      is theirs until a round is released, and a wall that depends on a model
 *      behaving is not a wall.
 */

/** How many of any one kind. One number, in one place, so the bound cannot drift per lane. */
export const MOST_OF_EACH = 20;

/** Said in the words a person reads, because it is shown to them. */
export type Source =
  | 'your organisation records'
  | 'what your organisation has written down'
  | 'this check-in'
  | 'a released report'
  | 'you told me';

export interface Fact<T> {
  value: T;
  from: Source;
}

export interface AnObjective {
  title: string;
  measure: string | null;
  target: string | null;
  dueDate: Date | null;
  justification: string | null;
  approach: string | null;
  /** True when they own it, false when they are a contributor on somebody else's. */
  theirs: boolean;
}

export interface ACommitment {
  text: string;
  dueSaid: string | null;
  state: string;
}

export interface ASession {
  checkInId: string | null;
  groundId: string;
  label: string;
  /** Which of the three states it is in. They need different things done about them. */
  standing: 'waiting on you to start' | 'open to you' | 'invitation not accepted';
  /**
   * A check-in about one person (a performance plan, a probation, a review): there is nobody else's
   * answer to release theirs with, so nothing may say it is "released with everybody else's".
   */
  aboutOnePerson?: boolean;
}

export interface ADecision {
  key: string;
  title: string;
}

export interface WhatIsTrue {
  person: { externalId: string; displayName: string | null };
  objectives: Fact<AnObjective[]>;
  commitments: Fact<ACommitment[]>;
  sessions: Fact<ASession[]>;
  /** Titles only. The body is fetched against the question, because that is what retrieval is for. */
  decisions: Fact<ADecision[]>;
  /** What was left out, so a bounded answer never silently pretends to be a whole one. */
  trimmed: string[];
}

export interface RawMaterial {
  person: { externalId: string; displayName: string | null };
  objectives: AnObjective[];
  commitments: ACommitment[];
  sessions: ASession[];
  decisions: ADecision[];
}

/**
 * The assembly. Pure, so the rules above can be read and tested without a
 * database — and so that adding a fact means adding it here rather than in
 * whichever lane happened to need it first.
 */
export function whatIsTrueFor(raw: RawMaterial): WhatIsTrue {
  const trimmed: string[] = [];

  const bound = <T>(rows: T[], what: string): T[] => {
    if (rows.length <= MOST_OF_EACH) return rows;
    trimmed.push(`${rows.length - MOST_OF_EACH} more ${what}`);
    return rows.slice(0, MOST_OF_EACH);
  };

  return {
    person: raw.person,
    objectives: { value: bound(raw.objectives, 'objectives'), from: 'your organisation records' },
    commitments: { value: bound(raw.commitments, 'commitments'), from: 'you told me' },
    sessions: { value: bound(raw.sessions, 'check-ins'), from: 'this check-in' },
    decisions: {
      value: bound(raw.decisions, 'things written down'),
      from: 'what your organisation has written down',
    },
    trimmed,
  };
}

/**
 * What is worth saying about all of it at once.
 *
 * Not a summary of the facts — a reading of what their SHAPE means, which is
 * the thing no single lane could see because no single lane had all of it.
 */
export function whatTheShapeOfItSays(truth: WhatIsTrue): string[] {
  const said: string[] = [];
  const objectives = truth.objectives.value;
  const commitments = truth.commitments.value;

  const owned = objectives.filter((o) => o.theirs);
  if (owned.length > 0 && commitments.length === 0) {
    said.push(
      'You own work here and have not told me you would do anything about it. The objective is the intention; the commitments are the week.',
    );
  }

  if (owned.length > 0 && owned.every((o) => !o.justification && !o.approach)) {
    said.push(
      'None of your objectives records why its number is the number or how it is meant to move. That is usually a planning tool that never asked.',
    );
  }

  if (truth.decisions.value.length === 0) {
    said.push(
      'Your organisation has written nothing down here, so I can answer what is happening and not why it was decided.',
    );
  }

  if (truth.trimmed.length > 0) {
    /* A bounded answer that does not say it is bounded is a whole answer that
       happens to be wrong. */
    said.push(`I am not showing everything: ${truth.trimmed.join(', ')}.`);
  }

  return said;
}
