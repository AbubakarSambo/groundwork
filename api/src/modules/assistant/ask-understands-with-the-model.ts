/**
 * ASK UNDERSTANDS WHAT PEOPLE MEAN WITH THE MODEL; FIXED RULES KEEP ONLY WHAT GETS APPROVED OR WRITTEN (Hafsah, 27 October 2026; fix
 * plan, pattern 2).
 *
 * In the quarter test, Brian wrote in Ask "I have raised two fee notes this month." and Peter "It says 4 of my check-ins were specific
 * out of 6, but it should be 4 out of 14", and both read "I cannot answer that one yet": the router matched text patterns, and anything
 * it had no pattern for fell through. Now, when the rules place nothing, or the message reads as a correction, the model reads the
 * message with the person's own record and says what it is: a question for one of the lanes that only read, a correction, or an
 * update. The model never chooses a lane that writes, approves or sends anything (leave, spending, hours, decisions, to-dos, notes):
 * those are reached only by the rules and the person's own yes, so nobody can talk it into one.
 */

/** The lanes the model may send a message to. Each only reads; none writes, approves, parks or sends anything. */
export const LANES_THAT_ONLY_READ = {
  what_you_can_see: 'what Groundwork can see about them',
  what_am_i_on: 'which check-ins they are in',
  who_is: 'who a named person is and what they do',
  what_did_i_commit_to: 'what they said they would do',
  my_to_dos: 'their own to-do list',
  what_is_due: 'what is due from them and when',
  how_we_work: 'a rule, policy or way of working in the organisation',
  what_did_i_say: 'what they said before about something',
  what_did_they_say: 'what a colleague said in a check-in they share',
  what_next: 'what to do next',
  how_am_i_doing: 'how they are doing',
  how_is_the_team: 'how the team they lead is doing',
  who_has_not_checked_in: 'who has not checked in yet, for a lead',
  where_am_i_needed: 'where they are needed or waited on',
  what_is_stuck: 'what is stuck or blocked',
  where_am_i_up_to: 'where they are up to',
  what_should_we_talk_about: 'what to talk about with someone',
  what_came_of_it: 'what came of something said before',
  company_priorities: 'what the company is working on',
  is_the_strategy_moving: 'whether the company’s direction is moving',
  what_my_check_in_is_for: 'what their check-in is for',
  when_is_my_next_check_in: 'when their next check-in is',
  who_approves: 'who approves leave or spending',
  who_is_away: 'who is away',
  your_requests: 'their own leave and spending requests',
  what_can_you_do: 'what Ask can help with',
} as const;
export type ALaneThatOnlyReads = keyof typeof LANES_THAT_ONLY_READ;

export type WhatTheyMean = 'question' | 'correction' | 'update' | 'greeting' | 'other';

export interface TheMessageUnderstood {
  kind: WhatTheyMean;
  /** For a question one of the lanes answers: that lane. Never a lane that writes. */
  lane: ALaneThatOnlyReads | null;
  /** What it is about, in a few of their words: a person, a deal, a matter, a policy. */
  about: string | null;
}

export const UNDERSTAND_PROMPT_KEY = 'ask.understand-the-message';
export const UNDERSTAND_PROMPT = `You read one message somebody typed into Ask Groundwork, a work assistant, and say what they mean. You do not answer it.

Say which kind it is:
- question: they want to know something.
- correction: they say something Groundwork showed them is wrong, or give the true figure or fact instead ("that's not right", "I sent it on Monday", "it should be 4 out of 14", "I have raised two fee notes this month", "she is excellent with clients").
- update: they tell Groundwork something new about their work that is not a correction.
- greeting: hello, thanks, or similar, with nothing else.
- other: anything else.

For a question, pick the one lane below that answers it, or none. Pick a lane only when it clearly fits. Never invent a lane.
For about, give the person, deal, client, matter or topic it is about, in a few of their own words, or leave it empty.

The lanes:
${Object.entries(LANES_THAT_ONLY_READ).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;

export const UNDERSTAND_SCHEMA = {
  name: 'what_they_mean',
  description: 'What the message is, and for a question the lane that answers it.',
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['question', 'correction', 'update', 'greeting', 'other'] },
      lane: { type: 'string', enum: [...Object.keys(LANES_THAT_ONLY_READ), 'none'] },
      about: { type: 'string' },
    },
    required: ['kind', 'lane'],
  },
};

/** What the model said, made safe: an unknown kind is "other", and a lane outside the read-only list is none. */
export function whatTheModelSaid(raw: any): TheMessageUnderstood | null {
  if (!raw || typeof raw !== 'object') return null;
  const kinds: WhatTheyMean[] = ['question', 'correction', 'update', 'greeting', 'other'];
  const kind = kinds.includes(raw.kind) ? (raw.kind as WhatTheyMean) : 'other';
  const lane = typeof raw.lane === 'string' && Object.prototype.hasOwnProperty.call(LANES_THAT_ONLY_READ, raw.lane) ? (raw.lane as ALaneThatOnlyReads) : null;
  const about = typeof raw.about === 'string' && raw.about.trim() ? raw.about.trim().slice(0, 120) : null;
  return { kind, lane: kind === 'question' ? lane : null, about };
}

export async function understandTheMessage(
  engine: { extract: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> },
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  message: string,
): Promise<TheMessageUnderstood | null> {
  const version = await prompts?.getActive(UNDERSTAND_PROMPT_KEY).catch(() => null);
  const raw = await engine.extract(version?.content ?? UNDERSTAND_PROMPT, [{ role: 'user', content: String(message ?? '').slice(0, 2000) }], UNDERSTAND_SCHEMA, { fast: true }).catch(() => null);
  return whatTheModelSaid(raw);
}
