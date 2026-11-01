/**
 * ASK UNDERSTANDS WHAT PEOPLE MEAN WITH THE MODEL; FIXED RULES KEEP ONLY WHAT GETS APPROVED OR WRITTEN (Hafsah, 27 October 2026; fix
 * plan, pattern 2).
 *
 * In the quarter test, Brian wrote in Ask "I have raised two fee notes this month." and Peter "It says 4 of my check-ins were specific
 * out of 6, but it should be 4 out of 14", and both read "I cannot answer that one yet": the router matched text patterns, and anything
 * it had no pattern for fell through. Now, when the rules place nothing, or the message reads as a correction, the model reads the
 * message with the person's own record and says what it is: a question, a correction, or an update. The model never chooses a lane
 * that writes, approves or sends anything (leave, spending, hours, decisions, to-dos, notes): those are reached only by the rules and
 * the person's own yes, so nobody can talk it into one.
 *
 * NO MENU OF LANES (Hafsah, 1 November 2026). The model also picked one of 26 lanes that only read, and that lane's own narrow lookup
 * then answered: "When is the Kasarani filing due?" went to what is due from the asker ("Nothing is due."), and "Tell me everything
 * Brian told you" to a list of what Ask can do. Every one of those answers was wrong on the assessment test, and both right ones came
 * from the model reading the record. A question no rule places is now answered from the record and the documents, by the model, through
 * the one reader of the assessments (a-question-is-answered-from-the-documents.ts).
 */

export type WhatTheyMean = 'question' | 'correction' | 'update' | 'greeting' | 'other';

export interface TheMessageUnderstood {
  kind: WhatTheyMean;
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

For about, give the person, deal, client, matter or topic it is about, in a few of their own words, or leave it empty.`;

export const UNDERSTAND_SCHEMA = {
  name: 'what_they_mean',
  description: 'What the message is, and what it is about.',
  input_schema: {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: ['question', 'correction', 'update', 'greeting', 'other'] },
      about: { type: 'string' },
    },
    required: ['kind'],
  },
};

/** What the model said, made safe: an unknown kind is "other", and whatever else it says is not read. */
export function whatTheModelSaid(raw: any): TheMessageUnderstood | null {
  if (!raw || typeof raw !== 'object') return null;
  const kinds: WhatTheyMean[] = ['question', 'correction', 'update', 'greeting', 'other'];
  const kind = kinds.includes(raw.kind) ? (raw.kind as WhatTheyMean) : 'other';
  const about = typeof raw.about === 'string' && raw.about.trim() ? raw.about.trim().slice(0, 120) : null;
  return { kind, about };
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
