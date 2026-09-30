/**
 * COUNTING THE THREE SIGNALS, FROM WHAT THE RECORD ALREADY HOLDS (week 8b, decision 55).
 *
 * Pure: rows in, counts out. The rows passed in carry no person, no name and no words on purpose, and
 * the counts that come out carry none either: nobody reads another person's answers through a count.
 *
 *   was it right          a pattern: the lead's mark (right / wrong / not sure), and whether the
 *                         person answered. A coaching step: its recorded outcome. A probe: how specific
 *                         the answer to that session was.
 *   did the conversation  a pattern: the lead's "we talked about it". A step: it was asked about in the
 *   happen                next check-in, which is when its outcome gets recorded.
 *   did things change     a pattern: after the talk, it was not seen again in a later period. A step:
 *                         the outcome (done or did more).
 */
export type Kind = 'PATTERN' | 'COACHING_STEP' | 'PROBE';

export interface Counts {
  judged: number;
  goodCount: number;
  badCount: number;
  unsureCount: number;
  answeredCount: number;
  talkDue: number;
  talkHappened: number;
  changeJudged: number;
  changedCount: number;
}

export const emptyCounts = (): Counts => ({ judged: 0, goodCount: 0, badCount: 0, unsureCount: 0, answeredCount: 0, talkDue: 0, talkHappened: 0, changeJudged: 0, changedCount: 0 });

export interface PatternFact {
  code: string;
  leadMark: 'RIGHT' | 'WRONG' | 'NOT_SURE' | null;
  personAnswered: boolean;
  /** The lead could have had the conversation: it had reached them. */
  reachedTheLead: boolean;
  talkedAbout: boolean;
  /** The period the pattern had reached when the lead said they talked. */
  talkedAboutAtPeriod: number | null;
  /** The latest period the pattern was seen in. */
  lastSeenPeriod: number | null;
  /** The latest period of check-ins completed for that person, to know a later period really exists. */
  latestPeriodCompleted: number | null;
}

export interface StepFact {
  step: string;
  outcome: 'done' | 'not done' | 'did more' | 'sideways' | null;
}

export interface ProbeFact {
  sources: string[];
  specificity: 'managed' | 'vague' | 'directional' | 'specific' | null;
}

export type Tally = Map<string, Counts>; // key: `${kind}\u0000${key}`
const k = (kind: Kind, key: string) => `${kind}\u0000${key}`;
export const splitTallyKey = (s: string): { kind: Kind; key: string } => {
  const [kind, key] = s.split('\u0000');
  return { kind: kind as Kind, key };
};
const at = (t: Tally, kind: Kind, key: string): Counts => {
  const id = k(kind, key);
  let c = t.get(id);
  if (!c) t.set(id, (c = emptyCounts()));
  return c;
};

export function countPatterns(facts: PatternFact[], into: Tally = new Map()): Tally {
  for (const f of facts) {
    const c = at(into, 'PATTERN', f.code);
    if (f.leadMark) {
      c.judged++;
      if (f.leadMark === 'RIGHT') c.goodCount++;
      else if (f.leadMark === 'WRONG') c.badCount++;
      else c.unsureCount++;
    }
    if (f.personAnswered) c.answeredCount++;
    if (f.reachedTheLead) {
      c.talkDue++;
      if (f.talkedAbout) c.talkHappened++;
    }
    if (f.talkedAbout && f.talkedAboutAtPeriod != null && f.latestPeriodCompleted != null && f.latestPeriodCompleted > f.talkedAboutAtPeriod) {
      c.changeJudged++;
      if ((f.lastSeenPeriod ?? 0) <= f.talkedAboutAtPeriod) c.changedCount++;
    }
  }
  return into;
}

export function countSteps(facts: StepFact[], into: Tally = new Map()): Tally {
  for (const f of facts) {
    if (!f.step?.trim()) continue;
    const c = at(into, 'COACHING_STEP', f.step.trim());
    // Not asked about yet: the conversation has not happened, and nothing else is known.
    c.talkDue++;
    if (!f.outcome) continue;
    c.talkHappened++;
    c.judged++;
    c.changeJudged++;
    if (f.outcome === 'done' || f.outcome === 'did more') {
      c.goodCount++;
      c.changedCount++;
    } else if (f.outcome === 'not done') c.badCount++;
    else c.unsureCount++;
  }
  return into;
}

export function countProbes(facts: ProbeFact[], into: Tally = new Map()): Tally {
  for (const f of facts) {
    if (!f.specificity) continue;
    for (const source of new Set(f.sources)) {
      const c = at(into, 'PROBE', source);
      c.judged++;
      if (f.specificity === 'specific') c.goodCount++;
      else if (f.specificity === 'directional') c.unsureCount++;
      else c.badCount++;
    }
  }
  return into;
}

export function addCounts(a: Counts, b: Counts): Counts {
  return {
    judged: a.judged + b.judged, goodCount: a.goodCount + b.goodCount, badCount: a.badCount + b.badCount,
    unsureCount: a.unsureCount + b.unsureCount, answeredCount: a.answeredCount + b.answeredCount,
    talkDue: a.talkDue + b.talkDue, talkHappened: a.talkHappened + b.talkHappened,
    changeJudged: a.changeJudged + b.changeJudged, changedCount: a.changedCount + b.changedCount,
  };
}

/** The keys a check-in's questions came from, made from what the plan was given. Never anybody's words. */
export function probeSourcesOffered(w: { scenario: string | null; detectedFunction: string | null; roleHasNeutralQuestions: boolean; patternCodesWithAQuestion: string[] }): string[] {
  const out: string[] = [];
  if (w.scenario) out.push(`situation:${w.scenario}`);
  if (w.detectedFunction && w.roleHasNeutralQuestions) out.push(`role:${w.detectedFunction}`);
  for (const c of w.patternCodesWithAQuestion) out.push(`pattern:${c}`);
  return out;
}
