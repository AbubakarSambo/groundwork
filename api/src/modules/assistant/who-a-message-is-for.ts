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

When it could be either, it is the_check_in.`;

export const WHO_IS_IT_FOR_SCHEMA = {
  name: 'who_it_is_for',
  description: 'Whether the message is for the open check-in or for the assistant.',
  input_schema: { type: 'object', properties: { for: { type: 'string', enum: ['the_check_in', 'ask'] } }, required: ['for'] },
};

export async function whoTheMessageIsFor(
  engine: { extract?: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> } | null | undefined,
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  input: { message: string; askIsWaiting: boolean; theCheckInAsked?: string | null },
): Promise<ItIsFor> {
  if (input.askIsWaiting) return 'ask';
  if (typeof engine?.extract !== 'function' || !String(input.message ?? '').trim()) return 'the_check_in';
  const version = await prompts?.getActive(WHO_IS_IT_FOR_PROMPT_KEY).catch(() => null);
  /* The end of what was said, where the question is: a set-up's opening puts three paragraphs before it, and the first 400 characters cut the question off. */
  const content = `${input.theCheckInAsked ? `The question waiting: "${String(input.theCheckInAsked).slice(-400)}"\n` : ''}Their message: ${String(input.message).slice(0, 1500)}`;
  const raw = await engine.extract(version?.content ?? WHO_IS_IT_FOR_PROMPT, [{ role: 'user', content }], WHO_IS_IT_FOR_SCHEMA, { fast: true }).catch(() => null);
  return raw?.for === 'ask' ? 'ask' : 'the_check_in';
}
