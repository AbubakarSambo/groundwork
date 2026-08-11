/**
 * ONE STEP AT A TIME, AND ONLY WHEN THE RECORD EARNED IT. (G42)
 *
 * The coaching tables have been in the database since the migration that added
 * them and nothing has ever written a row. Deliberate at the time - schema before
 * behaviour - but it means every wall test written for coaching proves the absence
 * of a leak in a feature that has never produced a single row.
 *
 * This is the state machine. It is pure: it takes what the last session showed
 * and returns the one step to offer next, so it can be tested against a run of
 * sessions rather than against a mock of a service.
 *
 * THE THREE RULES THAT MAKE THIS COACHING RATHER THAN NAGGING.
 *
 *   ONE STEP. Never a list. A list is a performance review with bullet points, and
 *   somebody handed five things does none of them.
 *
 *   THE STEP IS SOMETHING TO DO, in this person's own function, this week, and
 *   small enough to actually happen. "Get to the person with budget and authority"
 *   is a step. "Be more commercially assertive" is a verdict wearing a step's
 *   clothes.
 *
 *   TWO MISSES AND IT CHANGES, rather than repeating. A step not managed twice is
 *   information about the STEP - too big, wrong moment, or not actually theirs to
 *   do - and repeating it a third time is the product blaming somebody for its own
 *   bad guess.
 *
 * AND THE ONE IT MUST NEVER DO. Nothing here ever accumulates into a judgement.
 * The history exists so the coach can shrink a step, not so anybody can count
 * failures - which is why there is no score in this file, no streak, and no
 * function that returns how somebody is doing. See
 * coaching-can-never-justify-a-firing.spec.ts, which has been guarding a feature
 * that did not exist yet.
 */

export type StepOutcome =
  /** They did it. */
  | 'done'
  /** They did not, and said so or said nothing. */
  | 'not done'
  /** They went further than the step. */
  | 'did more'
  /** They did something else that addressed the same thing. */
  | 'sideways';

export interface StepRecord {
  step: string;
  givenAtSession: number;
  outcome: StepOutcome | null;
}

export interface CoachingStateShape {
  currentStep: string | null;
  stepGivenAt: number | null;
  staircase: string | null;
  staircasePosition: number;
  history: StepRecord[];
}

export const EMPTY: CoachingStateShape = {
  currentStep: null,
  stepGivenAt: null,
  staircase: null,
  staircasePosition: 0,
  history: [],
};

/**
 * What the next move is.
 *
 * "wait" is a real answer and the most common one: a session with nothing new in
 * it does not get a coaching step, because a step offered on no evidence is a
 * guess the person has to carry.
 */
export type NextMove =
  | { move: 'offer'; step: string; because: string }
  | { move: 'ask about the last one'; step: string }
  | { move: 'shrink'; step: string; because: string }
  | { move: 'wait'; because: string };

export interface SessionRead {
  /** The behaviour the signal read noticed, if any. */
  noticed: string | null;
  /** What it looks like going right - the destination, and the step's wording. */
  lookingLike: string | null;
  /** Why it was noticed. Without this there is no step, ever. */
  reason: string | null;
  /** The session that just completed. */
  sessionNumber: number;
  /** Whether this session had anything checkable in it at all. */
  hadSubstance: boolean;
}

/**
 * How many times a step may be offered before it changes.
 *
 * Two. The first miss is a week; the second is a pattern in the STEP.
 */
export const MISSES_BEFORE_IT_CHANGES = 2;

export function nextMove(state: CoachingStateShape, read: SessionRead): NextMove {
  // A step with no reason is an accusation, and a step on an empty session is a
  // guess. Both produce nothing, which is the correct output.
  if (!read.reason?.trim()) {
    return { move: 'wait', because: 'nothing in this session gave a reason to offer a step.' };
  }
  if (!read.hadSubstance) {
    return { move: 'wait', because: 'this session had nothing checkable in it, so there is nothing to coach from.' };
  }

  // A step is outstanding. Ask what happened before offering anything new -
  // offering a second step while the first is unanswered is how a list forms.
  if (state.currentStep && !lastOutcome(state)) {
    return { move: 'ask about the last one', step: state.currentStep };
  }

  const missed = consecutiveMisses(state);
  if (missed >= MISSES_BEFORE_IT_CHANGES && state.currentStep) {
    return {
      move: 'shrink',
      step: state.currentStep,
      because: 'this has not happened twice, which is usually the step being too big or not actually theirs to do.',
    };
  }

  if (!read.lookingLike) {
    return { move: 'wait', because: 'there is no paired destination for what was noticed, so there is nothing to walk toward.' };
  }

  return { move: 'offer', step: read.lookingLike, because: read.reason.trim() };
}

/** The outcome of the step currently outstanding, or null if nobody has said. */
export function lastOutcome(state: CoachingStateShape): StepOutcome | null {
  const last = state.history[state.history.length - 1];
  if (!last || last.step !== state.currentStep) return null;
  return last.outcome;
}

/**
 * How many times in a row the most recent step was not managed.
 *
 * "Sideways" and "did more" both break the run, because both are somebody
 * engaging with it - and counting either as a miss would be the product marking
 * somebody down for solving the problem its own way.
 */
export function consecutiveMisses(state: CoachingStateShape): number {
  let n = 0;
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (state.history[i].outcome === 'not done') n++;
    else break;
  }
  return n;
}

/**
 * The state after a step has been offered.
 *
 * The outcome starts null on purpose: nobody has answered yet, and a default of
 * anything else would put a fact in the record that nobody said.
 */
export function afterOffering(
  state: CoachingStateShape,
  step: string,
  sessionNumber: number,
  staircase?: string | null,
): CoachingStateShape {
  return {
    currentStep: step,
    stepGivenAt: sessionNumber,
    staircase: staircase ?? state.staircase,
    staircasePosition: state.staircasePosition,
    history: [...state.history, { step, givenAtSession: sessionNumber, outcome: null }],
  };
}

/**
 * The state after the person said what happened.
 *
 * Moving UP the staircase on 'done' and on 'did more' is the whole mechanic:
 * progress is the step getting harder, not the count getting higher. 'Sideways'
 * holds position - they addressed it, differently, and the next step should still
 * build on where they are.
 */
export function afterOutcome(state: CoachingStateShape, outcome: StepOutcome): CoachingStateShape {
  const history = [...state.history];
  const last = history[history.length - 1];
  if (last && last.outcome === null) history[history.length - 1] = { ...last, outcome };

  const advance = outcome === 'done' || outcome === 'did more' ? 1 : 0;
  return {
    ...state,
    // A step that was managed is finished. Leaving it as current is how a person
    // gets asked about the same thing in week nine.
    currentStep: outcome === 'not done' ? state.currentStep : null,
    staircasePosition: state.staircasePosition + advance,
    history,
  };
}

/**
 * The block that reaches the model, or nothing.
 *
 * Written as instructions about HOW to raise it rather than as a script, because a
 * scripted coaching line lands as a form letter and this has to sound like the
 * rest of the conversation. And it says the thing that keeps it inside the
 * guardrail: offer it, do not require it.
 */
export function coachingBlockFor(move: NextMove): string | null {
  switch (move.move) {
    case 'wait':
      return null;
    case 'ask about the last one':
      return `# Last session's step\n\nLast time they were offered one thing to try: "${move.step}". Early in this session, ask what happened with it, in one sentence, as a question and not a check. "Nothing happened" and "I did something else instead" are both complete answers - take either and move on. Do not offer a new step in this session until they have answered.`;
    case 'shrink':
      return `# The step is not landing\n\n"${move.step}" has not happened twice. That is information about the step rather than about them: it is probably too big, badly timed, or not actually theirs to do. Ask what would make it possible, and if there is a smaller version of it, offer that instead. Do not repeat the original.`;
    case 'offer':
      return `# One thing to try\n\nIf a natural moment comes, offer exactly ONE thing to try before the next session: "${move.step}". Say what you noticed that prompted it - ${move.because} - so it does not arrive as a judgement. Offer it, do not require it, and never offer a second one. If no natural moment comes, say nothing.`;
  }
}
