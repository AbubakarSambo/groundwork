import { parseAskAPerson } from '../assistant/a-line-or-a-note-typed-in-chat';

/**
 * A SHORT SENTENCE THAT ASKS A NAMED PERSON SOMETHING IS A QUESTION FOR THAT PERSON, IN THE OLD SETUP CHAT TOO (6 October 2026).
 *
 * "Ask Miriam which accounts actually have a buying process" was read by the old chat as a goal or a target for Miriam, and a yes
 * to that made it something she was expected to do. Ask Groundwork's own lane has read it the right way since request 92 (point 11):
 * it works out the exact sentence, says it back, and keeps it as a question for her next check-in only on a yes. This is that same
 * reading, by the same rule (`parseAskAPerson`), for the old chat.
 *
 * ONLY A SHORT SENTENCE: one line, under 400 characters. Anything longer is a paste and is read as a paste, exactly as before, so a
 * paste that happens to begin with "Ask Miriam ..." is not caught here. Nothing else the old chat does is changed.
 */
export const THE_LONGEST_SHORT_SENTENCE = 400;

export function aShortQuestionForAPerson(message: string | null | undefined): { name: string; leadWords: string } | null {
  const raw = (message ?? '').trim();
  if (!raw || raw.length >= THE_LONGEST_SHORT_SENTENCE || /\n/.test(raw)) return null;
  return parseAskAPerson(raw);
}

/** The sentence said back, in the same words Ask Groundwork uses. */
export const askedBackToTheLead = (who: string, exactQuestion: string) =>
  `Groundwork will ask ${who}, word for word, "${exactQuestion}" in ${who.split(/\s+/)[0]}'s next check-in. Shall I send it?`;

/** The exact question the lead was just shown, taken back out of the last thing said to them, so a yes keeps what they read. */
export function theQuestionTheyWereShown(history: { role: string; content: string }[] | undefined, who: string): string | null {
  const last = [...(history ?? [])].reverse().find((h) => h.role === 'assistant')?.content ?? '';
  const m = new RegExp(`^Groundwork will ask ${who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, word for word, "([\\s\\S]{3,400})" in .{1,60}'s next check-in\\. Shall I send it\\?$`).exec(last.trim());
  return m ? m[1] : null;
}
