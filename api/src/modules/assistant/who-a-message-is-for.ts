/**
 * WHO A MESSAGE IS FOR, ON EVERY CHANNEL: THE CHECK-IN, OR ASK (Batch S round 2, T2; the channel tests of 20 November 2026).
 *
 * On WhatsApp an open check-in took every message: "what can u do" was answered "What did you mean by 'what can you do?'", and
 * "whats stuck" opened the check-in. Each channel decided by its own state. One resolver decides now, in this order:
 *
 *   1. Ask is waiting for this person's answer (a proposal said back in the last fifteen minutes): the message is Ask's.
 *   2. Otherwise the model reads the message beside the check-in's last question, and says whether it answers the check-in or asks
 *      Ask for something else. A message it cannot read stays with the check-in, as before.
 *
 * It only decides where the words go. Nothing is written by it, and what Ask then does still waits for a yes.
 */

export type ItIsFor = 'the_check_in' | 'ask';

export const WHO_IS_IT_FOR_PROMPT_KEY = 'channels.who-a-message-is-for';

export const WHO_IS_IT_FOR_PROMPT = `Somebody's work assistant, Groundwork, is waiting on an answer from them: a check-in's question, or a question it asked while setting something up. They send one message. Say who the message is for.

- the_check_in: it answers the question waiting, or talks about it: their work, an update, a number, a name, a question about what was asked, being busy, asking to stop, finish or carry on.
- ask: it asks the assistant for something else, even with spelling mistakes: what it can do, what is next or stuck, who is off, their leave, spending or hours, a request waiting for their approval, a report, the company's documents, or how to do something in Groundwork.

Anything about the same thing that is waiting, the same report, request, file or set-up, is the_check_in: carrying on with it, adding to it, changing it, or asking to see it ("show me the outline first and add a section", "send it to me"). Only a different thing is ask.

When it could be either, it is the_check_in.

Say stops as true only when they ask to stop, cancel or leave what is waiting, without answering it ("cancel", "stop the goal draft", "forget it, not now").`;

export const WHO_IS_IT_FOR_SCHEMA = {
  name: 'who_it_is_for',
  description: 'Whether the message is for the open check-in or for the assistant.',
  input_schema: { type: 'object', properties: { for: { type: 'string', enum: ['the_check_in', 'ask'] }, stops: { type: 'boolean', description: 'True only when they ask to stop or leave what is waiting, without answering it.' } }, required: ['for'] },
};

type Engine = { extract?: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> } | null | undefined;
type Prompts = { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined;

/** The model's reading of one message beside the question waiting. Null with no model or no words. */
async function theReading(engine: Engine, prompts: Prompts, message: string, waiting: string | null | undefined): Promise<{ for?: string; stops?: boolean } | null> {
  if (typeof engine?.extract !== 'function' || !String(message ?? '').trim()) return null;
  const version = await prompts?.getActive(WHO_IS_IT_FOR_PROMPT_KEY).catch(() => null);
  /* The end of what was said, where the question is: a set-up's opening puts three paragraphs before it, and the first 400 characters cut the question off. */
  const content = `${waiting ? `The question waiting: "${String(waiting).slice(-400)}"\n` : ''}Their message: ${String(message).slice(0, 1500)}`;
  return engine.extract(version?.content ?? WHO_IS_IT_FOR_PROMPT, [{ role: 'user', content }], WHO_IS_IT_FOR_SCHEMA, { fast: true }).catch(() => null);
}

export async function whoTheMessageIsFor(engine: Engine, prompts: Prompts, input: { message: string; askIsWaiting: boolean; theCheckInAsked?: string | null }): Promise<ItIsFor> {
  if (input.askIsWaiting) return 'ask';
  return (await theReading(engine, prompts, input.message, input.theCheckInAsked))?.for === 'ask' ? 'ask' : 'the_check_in';
}

/**
 * WHAT THEY DO WITH A STEP THAT IS WAITING (release test of 21 November 2026, Ask #20 and #68). An objective draft asked "Why that number?" and
 * took every message after it: "how is Chidi doing", "cancel" and "show me the outline" were each read "That is a word, not a reason". The
 * same reading decides here: they answer it, they leave it, or they ask for something else. With no model, they answer it, as before.
 */
export async function whatTheyDoWithTheStep(
  engine: Engine, prompts: Prompts, input: { message: string; waiting: string | null },
  /** What it is when the model gives no reading: an answer, as before, unless the caller knows the rules placed it elsewhere. */
  unread: 'answers' | 'something_else' = 'answers',
): Promise<'answers' | 'stops' | 'something_else'> {
  const read = await theReading(engine, prompts, input.message, input.waiting);
  if (!read) return unread;
  if (read.stops === true) return 'stops';
  return read.for === 'ask' ? 'something_else' : 'answers';
}
