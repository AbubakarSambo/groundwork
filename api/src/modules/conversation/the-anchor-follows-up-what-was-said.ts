/**
 * THE ANCHOR'S WEEKLY CHECK-IN FOLLOWS UP WHAT THEY JUST SAID BEFORE IT ASKS FOR ANYTHING ON ITS OWN LIST (final check of the anchor, 8 October).
 *
 * In the weekly check-in a column the lead's set-up asked for was put to the person as "THE THING THIS TURN IS FOR", whatever they had just said.
 * Now, when their latest answer names something in the way of their work, something they will do, or a duty, one fast read finds it and the turn
 * is about that; the lead's fields stay behind it as a checklist. The conversation stays model-led: this finds what was said and hands it over as
 * context. It does not pick the words of the question.
 *
 * Used only for a person on the lead's team in an anchor check-in, from their second session. Every other check-in is unchanged.
 */
import { theFollowUpFrom, whatTheyJustSaidComesFirst, type WhatToFollowUp } from './the-baseline-so-far';

export const THE_WEEKLY_FOLLOW_UP_SYSTEM = `You are reading a conversation between Groundwork and a person on a lead's team. Look only at the person's LATEST answer.

Say whether it names one of these, and only when Groundwork has not already asked about it in the question just before:
- blocker: something in the way of their work, or something they told somebody about that nobody acted on.
- promise: something they say they will do or have agreed to do.
- duty: something they say is their job, or is not their job but they thought somebody else did it.

Give kind, and about: three to eight plain words naming what it is about, in the person's own terms. Leave followUp out when the latest answer names none of these, or when the question just before it was already about this. Never guess at what they did not say.`;

export const THE_WEEKLY_FOLLOW_UP_TOOL = {
  name: 'what_to_follow_up',
  description: 'What the latest answer names that Groundwork should ask about first, if anything.',
  input_schema: {
    type: 'object' as const,
    properties: {
      followUp: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['blocker', 'promise', 'duty'] },
          about: { type: 'string', description: 'Three to eight plain words naming what it is about.' },
        },
        required: ['kind', 'about'],
      },
    },
  },
};

/** Read last on the turn that follows it up. It stands in for "your question is the offer" and "ask one question" only when it is a blocker or a duty. */
export const THE_WEEKLY_FOLLOW_UP_REMINDER = `# For this person, this turn

What they have just said comes first, as the part above says. Where the rule above about offering to write down what they will do applies, that offer is your question. Otherwise your one question is about what they have just said. Do not ask what they will do and by when, and do not link it to the wider aim in this turn.`;

/**
 * IN AN ANCHOR CHECK-IN, WHAT A PERSON NAMES IN PASSING COUNTS AS GIVEN. Added to the read of each answer for a person on the lead's team and
 * nobody else. A blocker they describe, a promise they make or a duty they say is theirs (or is not theirs, and was left undone) fills the field
 * that asks for it, even when they said it answering something else. Without this, Kofi's broken fridge did not count as what makes his work hard
 * and the next question asked for it.
 */
export const THE_ANCHOR_GIVES_IT_PASSING_WEIGHT = 'IN THIS CONVERSATION, SOMETHING NAMED IN PASSING COUNTS AS GIVEN. A blocker they describe, a promise they make, or a duty they say is theirs (or say they thought was somebody else\'s) gives the field that asks for it, even when they said it while answering something else.';

export async function whatToFollowUpInTheWeekly(
  anthropic: { extract: (system: string, history: any[], tool: any, opts?: any) => Promise<any> } | undefined,
  turns: { role: 'AI' | 'PERSON'; content: string }[],
  warn?: (m: string) => void,
): Promise<WhatToFollowUp | null> {
  if (!anthropic?.extract || !turns.some((t) => t.role === 'PERSON' && t.content.trim())) return null;
  const history = turns.map((t) => ({ role: t.role === 'AI' ? 'assistant' as const : 'user' as const, content: t.content }));
  while (history.length && history[history.length - 1].role === 'assistant') history.pop();
  if (!history.length) return null;
  try {
    return theFollowUpFrom(await anthropic.extract(THE_WEEKLY_FOLLOW_UP_SYSTEM, history, THE_WEEKLY_FOLLOW_UP_TOOL, { fast: true }));
  } catch (err: any) {
    warn?.(`The weekly check-in could not read what to follow up: ${err?.message}`);
    return null;
  }
}

export { whatTheyJustSaidComesFirst };
