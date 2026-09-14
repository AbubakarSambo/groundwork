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

const SIGNALS: Record<string, Omit<UniversalSignal, 'probe'>> = {
  [UniversalMode.VAGUENESS]: {
    noticed: 'The things you named did not come with a date, a number or a name attached, so there is nothing in them anybody could check later.',
    lookingLike: 'Each thing you name carries the one detail that would let somebody else tell whether it happened.',
  },
  [UniversalMode.NON_COMMITMENT]: {
    noticed: 'Several things were described as being considered or looked at, and none of them was described as decided.',
    lookingLike: 'The ones that are yours to call get called, and the ones that are not get named as somebody else’s with a date on them.',
  },
  [UniversalMode.ILLEGIBILITY]: {
    noticed: 'What you did came through, and what changed because of it did not - so somebody reading this cannot tell what is different now.',
    lookingLike: 'Each thing you did is followed by what somebody else can do now that they could not before.',
  },
  [UniversalMode.INVISIBILITY]: {
    noticed: 'The work that went right and the trouble you headed off are not in your own account, so the only record of them is somebody else happening to mention it.',
    lookingLike: 'What worked, and what you prevented, are in your account in your own words rather than waiting to be noticed.',
  },
  [UniversalMode.UNDER_PERSISTENCE]: {
    noticed: 'Something you were waiting on went quiet and the account moves on without saying what you did about it.',
    lookingLike: 'When a thing stalls, what you tried next is part of the account - including when the answer is that you decided to leave it.',
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
  'This is read from your account rather than from your role, because what kind of work this is has not been settled yet. It is about how the record reads, not about the work itself.';
