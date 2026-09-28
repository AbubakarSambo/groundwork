/**
 * SUGGESTED ANSWERS UNDER EACH QUESTION.
 *
 * Task 2.6, week 5 of the weekly plan; point 6 of docs/conversation-standard.md: "two to four short
 * ones the person might give. They are a help, never a limit." Screens request 7a asked for them as
 * `suggestedAnswers` on the opening, on each reply, on the stream's `done` event and on each AI turn
 * of the transcript, so they survive a reload. When WhatsApp is switched on, the same list is what
 * its quick-reply buttons carry.
 *
 * WHAT THEY ARE BUILT FROM: the question, and this person's own last answer in this check-in.
 * Nothing else - not the record, not anybody else's words, not the lead's. A suggestion is a way in
 * for somebody who does not know how to start, and it must never become a way of telling them what
 * the answer is, or of showing them something about anyone else.
 *
 * WHAT THEY MUST NOT DO: lead them. So one is always the honest "not yet" or "I don't know" kind of
 * answer, and none of them is a question, a claim about a number the person did not give, or a name
 * the question did not already hold.
 */

export const SUGGESTED_ANSWERS_PROMPT = `You write suggested answers for one question in a work check-in. The person may tap one to start their reply, then change it. They are a help, never a limit.

Write two to four short answers this person might give, in the first person, as they would say them out loud.
- Each is one short, plain sentence, at most twelve words. People with basic English must understand it.
- Make them different from each other: at least one says things went well or moved, at least one says it did not move or is stuck, and one is the honest "Not yet" or "I don't know" kind of answer.
- Never invent a number, a date, an amount or a name. Where the answer would need one, leave a gap they fill in themselves, written as "..." (for example "We have sold ... so far.").
- Never use a name that is not already in the question.
- Never write a question.
- No work jargon.`;

export const SUGGESTED_ANSWERS_TOOL = {
  name: 'suggested_answers',
  description: 'Two to four short answers the person might give to this question.',
  input_schema: {
    type: 'object',
    properties: {
      answers: { type: 'array', items: { type: 'string' }, description: 'Two to four short first-person answers.' },
    },
    required: ['answers'],
  },
};

/** Whether this turn asks something at all. A closing turn or a statement gets no suggestions. */
export const endsWithAQuestion = (text: string | null | undefined): boolean => /\?\s*["”’']?\s*$/.test((text ?? '').trim());

/** The last question in a turn, which is the one they are answering. */
export function theQuestionIn(text: string): string {
  const sentences = (text ?? '').trim().split(/(?<=[.!?])\s+/);
  return (sentences.reverse().find((s) => s.trim().endsWith('?')) ?? '').trim();
}

const NAME = /\b[A-Z][a-z]+\b/g;
const NUMBER = /\d/;
const NOT_A_NAME = /^(?:I|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/;

/** What the model wrote, cleaned and checked. Anything that breaks a rule is dropped, not repaired. */
export function suggestionsThatHold(raw: unknown, question: string): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const namesInTheQuestion = new Set((question.match(NAME) ?? []).map((n) => n.toLowerCase()));
  const out: string[] = [];
  for (const item of list) {
    const s = String(item ?? '').replace(/\s+/g, ' ').trim();
    if (!s || s.endsWith('?')) continue;
    if (s.split(' ').length > 14) continue;
    if (NUMBER.test(s) && !NUMBER.test(question)) continue;
    /* A capitalised word that does not start a sentence is a name, unless the question already held it. */
    const later = s.split(/(?<=[.!?])\s+/).flatMap((sentence) => (sentence.match(NAME) ?? []).filter((w, i) => !(i === 0 && sentence.startsWith(w))));
    if (later.some((w) => !NOT_A_NAME.test(w) && !namesInTheQuestion.has(w.toLowerCase()))) continue;
    if (out.some((o) => o.toLowerCase() === s.toLowerCase())) continue;
    out.push(s);
    if (out.length === 4) break;
  }
  return out.length >= 2 ? out : [];
}

/** The model call, kept small and fast. Empty on any failure: a missing suggestion is never an error. */
export async function suggestAnswers(
  llm: { extract: <T>(system: string, history: { role: 'user' | 'assistant'; content: string }[], tool: any, options?: any) => Promise<T | null> },
  turnText: string,
  theirLastAnswer?: string | null,
): Promise<string[]> {
  if (!endsWithAQuestion(turnText)) return [];
  const question = theQuestionIn(turnText);
  if (!question) return [];
  const input = `The question:\n${question}${theirLastAnswer?.trim() ? `\n\nWhat this person said just before it, for how they talk:\n${theirLastAnswer.trim().slice(0, 400)}` : ''}`;
  try {
    const got = await llm.extract<{ answers: string[] }>(SUGGESTED_ANSWERS_PROMPT, [{ role: 'user', content: input }], SUGGESTED_ANSWERS_TOOL, { fast: true });
    return suggestionsThatHold(got?.answers, question);
  } catch {
    return [];
  }
}
