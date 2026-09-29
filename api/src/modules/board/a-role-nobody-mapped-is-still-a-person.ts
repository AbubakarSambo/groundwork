import { UniversalMode, UNIVERSAL_PROBES } from './role-maps';

/**
 * COACHING SOMEBODY WHOSE JOB WE NEVER WORKED OUT.
 *
 * The coach exits before it reads a word of the transcript when there is no role map, or when the
 * function is held below the confidence floor. Both of those exits are RIGHT about the role: a map
 * chosen from a guess coaches somebody out of the wrong one, which is worse than not coaching them.
 *
 * They are wrong about the person. 477 people are on record and 32 of them clear that gate, so 93%
 * of everybody could never be coached about anything at all - not because nothing was noticed, but
 * because nothing was ever looked at. The role gate was doing the job of a whole-person gate.
 *
 * THE FLOOR ALREADY EXISTED AND NOTHING COACHED FROM IT. `UniversalMode` is described in its own
 * header as read from the shape of what somebody said rather than from their job, and it is
 * already in the chat as probes. What it has never had is the pair - what was noticed and what the
 * same thing looks like going right - which is what a coaching step is made of.
 *
 * SO THIS IS DELIBERATELY WEAKER THAN A ROLE MAP, AND SAYS SO.
 *
 * A role map knows what good looks like for this kind of work. This does not, and must never
 * pretend to: every line below is about the ACCOUNT - what was said, how specific it was, whether
 * anything was carried through - and not about the work itself, because the work is the part we
 * cannot read without knowing the job. That is the honest half, and it is worth having: "you named
 * three things and none of them had a date" is true and useful whoever you are.
 *
 * TWO MODES ARE ABSENT ON PURPOSE. AVOIDANCE and DIFFUSION are declared in the enum and never
 * emitted by anything, and inventing a coaching pair for a mode nothing detects would put a step in
 * front of somebody that no evidence can ever support.
 */

export interface UniversalSignal {
  /** What was noticed, about the account rather than about the person. Never a label. */
  noticed: string;
  /** The same thing going right. The destination, so the coach knows what it coaches toward. */
  lookingLike: string;
  /** The ordinary question that opens it, reused from the probes already in the chat. */
  probe: string;
}

/**
 * Ordered, because the index is what the model returns and the order is what it indexes into. New
 * entries go on the END; inserting one in the middle re-points every stored step at a different
 * behaviour.
 */
export const UNIVERSAL_ORDER: UniversalMode[] = [
  UniversalMode.VAGUENESS,
  UniversalMode.NON_COMMITMENT,
  UniversalMode.ILLEGIBILITY,
  UniversalMode.INVISIBILITY,
  UniversalMode.UNDER_PERSISTENCE,
];

/**
 * PLAIN SENTENCES, AFTER THESE WERE READ BACK AS YODA.
 *
 * Her word for them, and she is right. Every line here opened on a long subordinate clause, put an
 * abstract noun where a person should be, and buried the point at the end:
 *
 *   "The things you named did not come with a date, a number or a name attached, so there is
 *    nothing in them anybody could check later."
 *   "When a thing stalls, what you tried next is part of the account - including when the answer is
 *    that you decided to leave it."
 *
 * Nobody speaks like that, and these are the lines MOST people get: 93% of people on record have no
 * confident role map, so this floor is their coaching, not the role maps.
 *
 * THE SHAPE EACH ONE TAKES NOW. `noticed` is a flat statement about what is missing, subject first.
 * `lookingLike` is an instruction you could follow tomorrow, verb first. Both short enough to read
 * once. Nothing here is softened: what it says is what it said.
 */
const SIGNALS: Record<string, Omit<UniversalSignal, 'probe'>> = {
  [UniversalMode.VAGUENESS]: {
    noticed: 'Nothing you named has a date, a number or a name on it, so nobody can check any of it later.',
    lookingLike: 'Put one detail on each thing you name, so somebody else can tell whether it happened.',
  },
  [UniversalMode.NON_COMMITMENT]: {
    noticed: 'You said several things were being considered. You did not say that any of them had been decided.',
    lookingLike: 'Decide the ones that are yours to decide. For the rest, say whose they are and by when.',
  },
  [UniversalMode.ILLEGIBILITY]: {
    noticed: 'You said what you did. You did not say what changed because of it, so nobody can tell what is different now.',
    lookingLike: 'After each thing you did, say what somebody else can do now that they could not before.',
  },
  [UniversalMode.INVISIBILITY]: {
    noticed: 'What went well, and the trouble you stopped, are missing from what you said. The only record of them is somebody else mentioning it.',
    lookingLike: 'Say what worked and what you stopped, in your own words, instead of waiting for somebody to notice.',
  },
  [UniversalMode.UNDER_PERSISTENCE]: {
    noticed: 'Something you were waiting on went quiet, and you did not say what you did about it.',
    lookingLike: 'When something stalls, say what you tried next. Saying you left it is an answer.',
  },
};

/** The behaviours, in order, for a prompt that asks the model to pick one by index. */
export function theBehavioursAnybodyCanBeRead(): string[] {
  return UNIVERSAL_ORDER.map((m) => SIGNALS[m].noticed);
}

/**
 * One behaviour by index, with its pair and its reason.
 *
 * BOTH OR NEITHER, the same rule the role map holds. Handing somebody the failure half alone is
 * the label this product refuses to produce. And a read with no reason is an accusation, so an
 * empty reason returns null rather than a step nobody can answer.
 */
export function universalSignalRead(index: number, reason: string): (UniversalSignal & { mode: UniversalMode; reason: string }) | null {
  if (!Number.isInteger(index) || index < 0 || index >= UNIVERSAL_ORDER.length) return null;
  const said = (reason ?? '').trim();
  if (!said) return null;
  const mode = UNIVERSAL_ORDER[index];
  const sig = SIGNALS[mode];
  if (!sig?.noticed?.trim() || !sig?.lookingLike?.trim()) return null;
  return { mode, noticed: sig.noticed, lookingLike: sig.lookingLike, probe: UNIVERSAL_PROBES[mode], reason: said };
}

/**
 * WHAT THE PERSON IS TOLD ABOUT WHERE THIS CAME FROM.
 *
 * A step read off the account rather than off the job has to say so, or it reads as a judgement on
 * work nobody understood. It is also the honest prompt to fix the underlying thing: if the role is
 * wrong or unknown, saying what it is makes everything else better.
 */
export const READ_FROM_THE_ACCOUNT_NOT_THE_ROLE =
  'This comes from what you wrote, not from your job, because nobody has settled yet what kind of work this is. It is about how what you said reads, not about the work.';
