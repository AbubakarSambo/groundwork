/**
 * AN INTERVIEW, AFTER SETUP, NOT A LONGER SETUP. (G21, G22)
 *
 * Setup is where somebody decides whether this is worth their evening, so setup
 * stays light. The depth arrives once the ground exists and they are invested,
 * and it arrives as an interview: it drives, it follows up, and it decides when it
 * has enough, the way a check-in already does and a form never can.
 *
 * THE STOP CONDITION IS THE WHOLE ENGINEERING PROBLEM. An interview with no stop
 * condition is a form that nags. Ask once, accept a vague answer, move on, and say
 * plainly what is still unfilled rather than returning to it. A lead who gave a
 * thin answer to question three gave the answer they had; asking again produces a
 * better-sounding one, not a truer one.
 *
 * G22 IS THE HIGHEST-VALUE SINGLE QUESTION ON THE WHOLE LIST, and one of the
 * smallest things to build.
 *
 *   "I would keep him if he owns a client end to end by month three."
 *
 * Recorded in week one, before anything has happened, that is the standard the
 * week-twelve decision gets measured against. She set it before she knew the
 * answer, so it cannot be accused of having moved - which is the protection it
 * offers the person being decided about, not the person deciding.
 *
 * AND THE REASON IT MUST BE FROZEN. A standard that can be edited in week eleven
 * is not a standard, it is a description of the outcome. Same argument as the
 * baseline, and the same refusal to carry an updatedAt.
 */

export type TopicId =
  | 'what good looks like'
  | 'what would change your mind'
  | 'what has to be true'
  | 'what happens after'
  | 'what you are unsure about';

export interface Topic {
  id: TopicId;
  question: string;
  /** Whether a thin answer is acceptable. It nearly always is. */
  thinIsFine: boolean;
}

export const TOPICS: Topic[] = [
  {
    id: 'what good looks like',
    question: 'What would you want to be able to say about this work when the ground closes?',
    thinIsFine: true,
  },
  {
    id: 'what would change your mind',
    // G22. Asked plainly, and asked before anything has happened.
    question: 'What would have to happen for you to change your mind about how this is going? Both directions - what would reassure you, and what would worry you.',
    // The one place a vague answer is worth pushing on ONCE, because a vague
    // standard is the thing this question exists to prevent.
    thinIsFine: false,
  },
  {
    id: 'what has to be true',
    question: 'What has to be true for this to work that is nobody here\'s doing?',
    thinIsFine: true,
  },
  {
    id: 'what happens after',
    question: 'What happens after the report? A conversation, a decision, or nothing in particular are all real answers.',
    thinIsFine: true,
  },
  {
    id: 'what you are unsure about',
    question: 'What are you least sure about in how you have set this up?',
    thinIsFine: true,
  },
];

export interface InterviewState {
  asked: TopicId[];
  /** Topics answered thinly, which is a state, not a failure. */
  thin: TopicId[];
  /** Follow-ups spent, counted per topic, because this is where nagging starts. */
  followUps: Partial<Record<TopicId, number>>;
}

/**
 * What to do next: another topic, one follow-up, or stop.
 *
 * The follow-up budget is one, and only on the topic where vagueness defeats the
 * point. Everywhere else a thin answer is recorded as thin and the interview moves
 * on, because the alternative is a product that makes people justify themselves to
 * a chat box before their team has said a word.
 */
export function nextMove(state: InterviewState):
  | { move: 'ask'; topic: Topic }
  | { move: 'follow up'; topic: Topic; prompt: string }
  | { move: 'stop'; unfilled: TopicId[] } {
  const lastThin = state.thin[state.thin.length - 1];
  if (lastThin) {
    const topic = TOPICS.find((t) => t.id === lastThin)!;
    const spent = state.followUps[lastThin] ?? 0;
    if (!topic.thinIsFine && spent < 1) {
      return {
        move: 'follow up',
        topic,
        prompt: 'Can you put a specific on that? Not a target to hold anybody to, just the thing that would actually shift your view - so that in twelve weeks it is your standard being read and not somebody\'s memory of it.',
      };
    }
  }

  const next = TOPICS.find((t) => !state.asked.includes(t.id));
  if (next) return { move: 'ask', topic: next };

  return { move: 'stop', unfilled: state.thin };
}

/**
 * What the interview says at the end, including what it did not get.
 *
 * Said plainly and once. "Three things are still open" read as a state of the
 * ground is useful; the same fact delivered as a prompt to go back and fix it is
 * the nagging this is built to avoid.
 */
export function closingLine(unfilled: TopicId[]): string {
  if (!unfilled.length) return 'That is everything worth asking before people start checking in.';
  const list = unfilled.map((u) => `"${u}"`).join(', ');
  return `That is enough to start. ${unfilled.length === 1 ? 'One thing is' : `${unfilled.length} things are`} still thin here (${list}), which the report will say rather than guess at. You can add to it whenever, or leave it.`;
}

/**
 * G22's answer, once given, is frozen.
 *
 * Deliberately carries no updatedAt, for the same reason the baseline does not: a
 * standard that can be edited in week eleven is a description of the outcome, and
 * the protection it offers is precisely that it was set before anybody knew.
 */
export interface ChangeMyMind {
  wouldReassure: string;
  wouldWorry: string;
  setAtSession: number;
}

export const A_STANDARD_SET_AFTERWARDS_IS_NOT_A_STANDARD =
  'This was recorded before anything happened, and cannot be edited. That is what makes it worth reading against.';

/**
 * Whether the record has anything to say about a stated standard yet.
 *
 * Returns the honest three-way rather than a yes or no, because "nothing in the
 * record speaks to this" is the answer that most often matters at a decision, and
 * it is the one a boolean cannot express.
 */
export function standardAgainstRecord(
  standard: string,
  entriesTouchingIt: number,
): { state: 'not touched' | 'partly' | 'covered'; line: string } {
  if (entriesTouchingIt === 0) {
    return {
      state: 'not touched',
      line: `Nothing in the record speaks to this either way. It was the stated standard, and twelve weeks of accounts did not reach it - which is worth knowing before it is used to decide anything.`,
    };
  }
  if (entriesTouchingIt < 3) {
    return {
      state: 'partly',
      line: `${entriesTouchingIt} thing${entriesTouchingIt === 1 ? '' : 's'} in the record bear${entriesTouchingIt === 1 ? 's' : ''} on this. Read ${entriesTouchingIt === 1 ? 'it' : 'them'}, rather than the summary of them.`,
    };
  }
  return {
    state: 'covered',
    line: `${entriesTouchingIt} things in the record bear on this, from more than one session.`,
  };
}
