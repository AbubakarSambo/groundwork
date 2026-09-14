import { RoleFunction, ROLE_MAPS } from './role-maps';

/**
 * WHAT KIND OF WORK IS THIS, WHEN THE KEYWORDS FIND NOTHING.
 *
 * `detectFunction` counts regex hits across ten keyword lists. Run over every account on record it
 * reads a function for 4 people out of the 298 who have said anything at all: 294 score ZERO on all
 * ten lists, which is not a tuning problem - it is that nobody writes the way the lists expect.
 *
 * Three real accounts, none of which scored a single hit:
 *
 *   "I have to decide who stays." / "Lola depends on whether I fix the list."
 *   "The delivery has drifted." / "every time I ask I get a different reason"
 *   "I hired Amara as Head of Customer Support." / "I am still chairing the triage meeting"
 *
 * A person reads all three as management in a second. The matcher reads nothing, so 92% of people
 * have no job on record, so the role map never loads, so nobody is read in the terms of their own
 * work. The keyword list stays as the fast path - it is free, it is deterministic, and when it
 * fires it is usually right. This is what happens when it does not fire.
 *
 * THE THIRD ACCOUNT IS ALSO THE WARNING. It is full of triage, escalations and a support queue, and
 * the person is the MANAGER of the person who owns them. A matcher would call that support. Reading
 * whose work it is, rather than which words appear, is the whole reason this needs a reader.
 *
 * CONFIDENT ONLY WHEN IT IS OBVIOUS. The comments on the matcher were bought with a real incident -
 * an entire software team classified as sales at 0.78 and read against "named buyers with budget
 * and authority" - and the lesson holds here: a lens becomes a label the moment it is confidently
 * wrong. So the model reports how sure it is and only `clear` reaches the coaching floor. Anything
 * less lands below it, which hedges the probes as provisional and leaves the coach reading the
 * account rather than the job - which is a real answer now, not a silence.
 */

export type Certainty = 'clear' | 'probable' | 'cannot_tell';

export interface JobRead {
  fn: RoleFunction;
  confidence: number;
  basis: string;
}

/**
 * `clear` sits just above MIN_COACHING_CONFIDENCE and nowhere near certain. `probable` sits just
 * below it on purpose: the read is kept, the probes hedge, and the coach falls to the account
 * floor. `cannot_tell` is a correct answer and must stay cheap to give.
 */
export function howSureIsThat(certainty: string | null | undefined): number | null {
  switch (certainty) {
    case 'clear': return 0.6;
    case 'probable': return 0.45;
    default: return null;
  }
}

const EVERY_FUNCTION = Object.keys(ROLE_MAPS) as RoleFunction[];

/**
 * Turn what came back into a read, or nothing.
 *
 * A BASIS IS NOT OPTIONAL. Everywhere else in this product a read without its reason is refused,
 * because a reason is what lets a person disagree with it - and this one decides which yardstick
 * somebody is held to for the rest of the run. An unknown function is dropped rather than coerced:
 * a value nothing can render is worse than a null that everything already handles.
 */
export function theJobTheyDescribed(raw: {
  fn?: string | null;
  certainty?: string | null;
  basis?: string | null;
} | null): JobRead | null {
  if (!raw) return null;
  const fn = (raw.fn ?? '').trim().toUpperCase() as RoleFunction;
  if (!EVERY_FUNCTION.includes(fn)) return null;
  const confidence = howSureIsThat(raw.certainty);
  if (confidence == null) return null;
  const basis = (raw.basis ?? '').trim();
  if (!basis) return null;
  return { fn, confidence, basis: `Read from the account: ${basis}` };
}

export const WHAT_KIND_OF_WORK_PROMPT = `You are reading one person's own account of their work, taken from their check-ins. Decide what KIND of work it is.

The options, and nothing else:
${EVERY_FUNCTION.map((f) => `- ${f}: ${ROLE_MAPS[f].label}`).join('\n')}

READ WHOSE WORK IT IS, NOT WHICH WORDS APPEAR. Somebody who writes about a support queue may be running it or may be the manager of the person who runs it. A manager describing their team's delivery is management, not engineering. The question is what THIS person does, not what their team does.

HOW SURE YOU ARE IS PART OF THE ANSWER, and it is the important part.
- "clear" means somebody reading this account would say the same thing without hesitating.
- "probable" means it leans that way and a reasonable person could read it differently.
- "cannot_tell" means the account is about a situation rather than about their work, or it could be two or three of these equally. This is a correct and common answer. Give it freely.

Say what in the account shows it, in one short sentence, referring to what they described doing. Never quote them at length and never characterise the person - this decides which questions they get asked, not what anybody thinks of them.

If you cannot tell, say cannot_tell. Forcing a bucket puts somebody in the wrong one for the rest of the check-in, and being read against the wrong kind of work is worse than being read against none.`;

export const WHAT_KIND_OF_WORK_SCHEMA = {
  name: 'what_kind_of_work',
  description: 'The kind of work this person does, read from their own account, with how sure that is.',
  input_schema: {
    type: 'object',
    properties: {
      fn: {
        type: 'string',
        enum: EVERY_FUNCTION,
        description: 'The kind of work, or omit entirely when you cannot tell.',
      },
      certainty: { type: 'string', enum: ['clear', 'probable', 'cannot_tell'] },
      basis: { type: 'string', description: 'One short sentence naming what in the account shows it.' },
    },
    required: ['certainty'],
  },
} as const;
