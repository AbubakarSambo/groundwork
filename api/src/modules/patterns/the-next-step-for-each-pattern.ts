/**
 * LAYER 3: THE NEXT STEP FOR EACH PATTERN (Hafsah's brief of 31 October 2026, part 4).
 *
 * For each pattern that holds (patterns-across-the-assessments.ts), the fitting next step, one at a time, like the coaching
 * staircase (CoachingState): for the person a coaching question, then a clear expectation; for the lead a conversation, a
 * deadline, a plan, and firing only when there are grounds. For a strength, praise from the lead. Whether a step worked is
 * read from the next assessment: the pattern still seen there means it did not, and only then does it move to the next step.
 *
 * SMALL STEPS HAPPEN ON THEIR OWN: a coaching question and a clear expectation for the person, and a suggestion to praise.
 * Every other step (a conversation, a deadline, a plan, firing) is the lead's decision, and waits for her; nothing here ever
 * moves past a step that waits for the lead. Nothing is a label on a person: each step says what to do about a behaviour.
 *
 * Internal: kept on the newest assessment, read by nothing a person is served.
 */
import type { APatternAcrossAssessments, APatternKey } from './patterns-across-the-assessments';

export type AStep =
  | 'a coaching question'
  | 'a clear expectation'
  | 'praise'
  | 'a conversation'
  | 'a deadline'
  | 'a plan'
  | 'firing, when there are grounds';

/** Who acts, and whether the step needs the lead's decision. */
export const THE_STEPS: Record<AStep, { forWhom: 'the person' | 'the lead'; theLeadDecides: boolean }> = {
  'a coaching question': { forWhom: 'the person', theLeadDecides: false },
  'a clear expectation': { forWhom: 'the person', theLeadDecides: false },
  praise: { forWhom: 'the lead', theLeadDecides: false },
  'a conversation': { forWhom: 'the lead', theLeadDecides: true },
  'a deadline': { forWhom: 'the lead', theLeadDecides: true },
  'a plan': { forWhom: 'the lead', theLeadDecides: true },
  'firing, when there are grounds': { forWhom: 'the lead', theLeadDecides: true },
};

export const THE_LADDER_FOR_WORK: AStep[] = ['a coaching question', 'a clear expectation', 'a conversation', 'a deadline', 'a plan', 'firing, when there are grounds'];
export const THE_LADDER_FOR_A_STRENGTH: AStep[] = ['praise'];
/* The lead's bias is about the lead herself: it is put to her as a question and an expectation, never escalated past that. */
export const THE_LADDER_FOR_THE_LEAD: AStep[] = ['a coaching question', 'a clear expectation'];
/* Too much on, a role that differs and effort away from the priorities are about the work given, never grounds for firing:
 * they stop at a conversation with the lead. */
export const THE_LADDER_FOR_THE_LOAD: AStep[] = ['a coaching question', 'a conversation'];
export const THE_LADDER_FOR_THE_ROLE: AStep[] = ['a coaching question', 'a clear expectation', 'a conversation'];

/** What each step says, by pattern, in plain sentences. The words describe the behaviour, never the person. */
const THE_QUESTION: Record<APatternKey, string> = {
  'role-differs-from-given': 'Which parts of your work this week are part of your role, and which have you taken on for somebody else?',
  'focus-away-from-the-priorities': 'Which of the team\'s priorities did your work move this week, and what will you put first next week?',
  'slipping-promises': 'Which of the things you said you would do since last time is still open, and what day will you finish it?',
  'claims-rarely-proved': 'For the work you called done this week, what can you share that shows it, such as a photo, a slip or a link?',
  'quiet-excellence': 'What helped you keep your promises this week, so the team can learn from it?',
  overload: 'What is on your plate this week, and what could wait or go to somebody else?',
  ownership: 'What did you try before you raised it, and what will you try next?',
  'the-leads-bias': 'What has this person done since last time, going by their own check-ins and proof?',
};
const THE_EXPECTATION: Record<APatternKey, string> = {
  'role-differs-from-given': 'Say in each check-in which work is part of your role, and raise the rest with your lead.',
  'focus-away-from-the-priorities': 'Spend most of your week on the team\'s priorities, and say in each check-in which one each piece of work serves.',
  'slipping-promises': 'Promise only what you can finish, and say early when a date will move.',
  'claims-rarely-proved': 'Add the photo, slip or link when you say something is done.',
  'quiet-excellence': 'Keep doing what you are doing.',
  overload: 'Say when you have too much on, and agree with your lead what can wait.',
  ownership: 'Keep saying what you tried before you raise a blocker.',
  'the-leads-bias': 'Read each person\'s own check-ins and proof before you judge their work.',
};

export function whatTheStepSays(step: AStep, p: Pick<APatternAcrossAssessments, 'key' | 'saying'>): string {
  switch (step) {
    case 'a coaching question': return THE_QUESTION[p.key];
    case 'a clear expectation': return THE_EXPECTATION[p.key];
    case 'praise': return `Thank them for this. ${p.saying}`;
    case 'a conversation': return `Talk with them about it. ${p.saying}`;
    case 'a deadline': return 'Agree a day by which this changes, and check it in their next check-in.';
    case 'a plan': return 'Agree a written plan with them: what changes, by when, and how you will both know.';
    case 'firing, when there are grounds': return 'The steps before this have not worked. Whether to end their work with the team is your decision, with the record in front of you.';
  }
}

export interface AnIntervention {
  /** The pattern it answers, and who it is about. */
  key: APatternKey;
  participantId: string;
  aboutWhom?: string;
  ladder: 'work' | 'strength' | 'the lead' | 'the load' | 'the role';
  rung: number;
  step: AStep;
  forWhom: 'the person' | 'the lead';
  theLeadDecides: boolean;
  says: string;
  /** What it rests on: the pattern, and the check-ins and words it was seen in. */
  because: string;
  /** Where it stands: open and happening on its own, waiting for the lead, worked, or at the end of its ladder. */
  state: 'open' | 'waiting for the lead' | 'worked' | 'ended';
  startedIn: { checkInId: string; sessionNumber: number };
  /** Each later assessment's reading of whether it worked. */
  followedUp: { checkInId: string; sessionNumber: number; worked: boolean }[];
}

function theLadder(p: APatternAcrossAssessments): { name: AnIntervention['ladder']; steps: AStep[] } {
  if (p.key === 'the-leads-bias') return { name: 'the lead', steps: THE_LADDER_FOR_THE_LEAD };
  if (p.kind === 'strength') return { name: 'strength', steps: THE_LADDER_FOR_A_STRENGTH };
  if (p.kind === 'too much on') return { name: 'the load', steps: THE_LADDER_FOR_THE_LOAD };
  if (p.key === 'role-differs-from-given' || p.key === 'focus-away-from-the-priorities') return { name: 'the role', steps: THE_LADDER_FOR_THE_ROLE };
  return { name: 'work', steps: THE_LADDER_FOR_WORK };
}

function atRung(p: APatternAcrossAssessments, rung: number, startedIn: AnIntervention['startedIn'], followedUp: AnIntervention['followedUp']): AnIntervention {
  const ladder = theLadder(p);
  const step = ladder.steps[Math.min(rung, ladder.steps.length - 1)];
  /* The lead's bias is put to the lead, never to the person it is about. */
  const how = p.key === 'the-leads-bias' ? { forWhom: 'the lead' as const, theLeadDecides: false } : THE_STEPS[step];
  return {
    key: p.key, participantId: p.participantId, ...(p.aboutWhom ? { aboutWhom: p.aboutWhom } : {}), ladder: ladder.name, rung, step,
    forWhom: how.forWhom, theLeadDecides: how.theLeadDecides, says: whatTheStepSays(step, p),
    because: `${p.saying} ${theInstancesAsSentences(p)}`,
    state: how.theLeadDecides ? 'waiting for the lead' : 'open', startedIn, followedUp,
  };
}

/** Each instance as a plain sentence: the day, and their words. */
export function theInstancesAsSentences(p: Pick<APatternAcrossAssessments, 'instances'>): string {
  return p.instances.map((i) => `${i.on ? `On ${theDay(i.on)}` : `In check-in ${i.sessionNumber}`}, ${i.words[0] ? `the words were "${i.words[0].replace(/^"+|"+$/g, '')}"` : `it was about ${i.item}`}.`).join(' ');
}
const theDay = (on: string) => new Date(`${on.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

const sameOne = (a: { key: string; participantId: string; aboutWhom?: string }, b: { key: string; participantId: string; aboutWhom?: string }) =>
  a.key === b.key && a.participantId === b.participantId && (a.aboutWhom ?? '') === (b.aboutWhom ?? '');

/**
 * THE INTERVENTIONS AFTER THIS ASSESSMENT, from the ones carried on the previous assessment and the patterns now.
 *   - An open step whose pattern is not seen in this assessment worked, and is closed.
 *   - An open step whose pattern is seen again did not work: it moves one rung up. A strength's praise is given once.
 *   - A step waiting for the lead stays where it is: only the lead moves it.
 *   - A pattern that holds, and is seen in this assessment, with no step yet starts at the bottom of its ladder.
 */
export function theInterventionsAfter(
  carried: AnIntervention[],
  patterns: APatternAcrossAssessments[],
  now: { checkInId: string; sessionNumber: number },
): AnIntervention[] {
  const out: AnIntervention[] = [];
  /* A pattern is seen now when this check-in added an instance to it. The lead's bias rests on her setup words and the person's
     whole record, so it is seen for as long as it holds. */
  const isNow = (p: APatternAcrossAssessments) => p.key === 'the-leads-bias' || p.instances.some((x) => x.checkInId === now.checkInId);
  const seenNow = (i: { key: string; participantId: string; aboutWhom?: string }) => patterns.find((p) => sameOne(p, i) && isNow(p));
  for (const i of carried) {
    if (i.state === 'worked' || i.state === 'ended' || i.startedIn.checkInId === now.checkInId) { out.push(i); continue; }
    if (i.state === 'waiting for the lead') { out.push(i); continue; }
    const p = seenNow(i);
    if (!p) { out.push({ ...i, state: 'worked', followedUp: [...i.followedUp, { ...now, worked: true }] }); continue; }
    const followedUp = [...i.followedUp, { ...now, worked: false }];
    const steps = theLadder(p).steps;
    if (i.rung + 1 >= steps.length) { out.push({ ...i, state: 'ended', followedUp }); continue; }
    out.push(atRung(p, i.rung + 1, i.startedIn, followedUp));
  }
  for (const p of patterns) {
    /* Only a pattern that holds and is seen in this very assessment: one that has stopped needs nothing new. */
    if (p.state !== 'holds' || !isNow(p)) continue;
    if (out.some((i) => sameOne(i, p) && (i.state === 'open' || i.state === 'waiting for the lead'))) continue;
    if (out.some((i) => sameOne(i, p) && i.startedIn.checkInId === now.checkInId)) continue;
    /* A strength already praised is not praised again for the same pattern. */
    if (p.kind === 'strength' && out.some((i) => sameOne(i, p))) continue;
    out.push(atRung(p, 0, now, []));
  }
  return out;
}

/**
 * THE SMALL STEP FOR THE PERSON, FROM THIS CHECK-IN'S ASSESSMENT, AS THE COACH OFFERS IT (observeForCoaching, CoachingState's one
 * writer). Only a step for the person that happens on its own, open, and started or moved on in this very check-in; a step the
 * lead decides is never returned. Null when there is none.
 */
export function theSmallStepForThePerson(interventions: unknown, checkInId: string, participantId?: string): { key: string; step: AStep; noticed: string; lookingLike: string; reason: string } | null {
  const steps = (Array.isArray(interventions) ? interventions : []) as AnIntervention[];
  const now = steps.find((i) => i.forWhom === 'the person' && !i.theLeadDecides && i.state === 'open' && (!participantId || i.participantId === participantId)
    && (i.startedIn?.checkInId === checkInId || i.followedUp?.[i.followedUp.length - 1]?.checkInId === checkInId));
  if (!now) return null;
  return { key: now.key, step: now.step, noticed: now.says, lookingLike: now.says, reason: now.says };
}
