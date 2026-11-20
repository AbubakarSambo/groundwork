import { LANGUAGES_WE_CONVERSE_IN } from './a-whatsapp-message-is-routed';

/**
 * THE LANGUAGE A PERSON IS ANSWERED IN IS THE LANGUAGE OF THEIR OWN WORDS, READ BY THE MODEL EVERY TIME (WhatsApp test, 20 November 2026, C1).
 *
 * Chidi wrote, in English, "closed kilele 450k on tues, still chasing naivas PO". A word list (plainly-english.ts) found only two of its nine
 * words among the commonest English ones, so one model call read the single message on its own, answered Swahili, and the answer was stored on
 * him. Every turn after that carried "THIS PERSON WRITES IN SWAHILI. Ask and answer in Swahili", so the reply came in Swahili, and "on tues"
 * came back as "Juma" (Jumanne, Tuesday, cut short), which reads as the teammate Juma closing the deal. The word list, the one-time read and
 * the stored language are gone. The conversation model, which reads every message whole, is told on every turn to answer in the language of
 * the person's latest message; names and short forms belong to no language. Nothing is stored, so nothing can go stale.
 */
export const WRITE_IN_THEIR_LANGUAGE = [
  'WRITE IN THE LANGUAGE OF THEIR LATEST MESSAGE.',
  'Work it out from their own words, never from the names in them: shop, customer, person and place names, and short forms such as PO, 450k or tues, belong to no language.',
  'If they write in English, answer in English. If they write in another language, answer in it, and follow them if they switch.',
  'Keep every name, number, day and place exactly as they wrote it. Never translate a day, and never put a name in that they did not say.',
].join(' ');

type Extract = (system: string, messages: { role: 'user'; content: string }[], tool: any, opts?: any) => Promise<{ language?: string } | null>;

/**
 * The language of everything a person wrote in one check-in, taken together, for a message sent to them afterwards (their report on the phone).
 * Read by the model from all their words at once, never from one short message. English when they wrote English, when the model is unsure,
 * or when it cannot be asked.
 */
export async function theLanguageTheyWroteIn(extract: Extract | undefined, theirWords: string[]): Promise<string> {
  const all = theirWords.map((w) => (w ?? '').trim()).filter(Boolean).join('\n');
  if (!all || typeof extract !== 'function') return 'en';
  const read = await extract(
    'Say which language these messages are written in, taken together. Names of shops, customers, people and places, and short forms (PO, 450k, tues), belong to no language. Answer with the ISO 639-1 code only (en, ha, sw, yo, ig, fr, pt, ar, am, es). Unsure: en.',
    [{ role: 'user', content: all.slice(0, 4000) }],
    { name: 'language_of', description: 'The language of the messages', input_schema: { type: 'object', properties: { language: { type: 'string' } }, required: ['language'] } },
    { thinkingBudget: 128 },
  ).catch(() => null);
  const code = String(read?.language ?? 'en').toLowerCase().slice(0, 2);
  return LANGUAGES_WE_CONVERSE_IN[code] ? code : 'en';
}
