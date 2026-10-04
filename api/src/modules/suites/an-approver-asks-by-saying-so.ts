import { inQuotes, wordsGiven, LONGEST } from './a-question-about-a-request';
import type { AWaitingRequest } from './a-request-in-words';

/**
 * AN APPROVER ASKS A QUESTION ABOUT A REQUEST BY SAYING SO, ON WHATSAPP OR IN ASK GROUNDWORK.
 *
 * The notice an approver gets on WhatsApp says "Reply here to approve or decline it", and a question
 * could only be asked in the app. It can now be asked the way approving and declining are: the
 * approver writes it, Groundwork says it back word for word, and it goes to the person only on a
 * yes, through the same code the app's box uses (`askAQuestion`), which checks again that this
 * reader is the one who decides, tells the person on their phone and in the app, and leaves the
 * request waiting.
 *
 * Only two shapes are taken, so a question to somebody in a check-in is never read as this:
 *   "question for Amina about her leave: who will cover the milestone?"  (or just "question: ...")
 *   "ask Amina about her leave, who will cover the milestone?"
 */
export interface AQuestionAskedAboutARequest {
  /** The first name said, or null when the reply did not say. */
  name: string | null;
  /** The kind said, or null. */
  kind: 'leave' | 'spend' | 'hours' | null;
  question: string;
}

const KIND = '(leave|time\\s+off|holiday|days?\\s+off|spending|spend|expenses?|money|hours|time\\s*sheets?)';
const kindOf = (w: string | undefined): AQuestionAskedAboutARequest['kind'] => {
  if (!w) return null;
  if (/leave|time|holiday|days/i.test(w) && !/sheet/i.test(w)) return 'leave';
  if (/hours|sheet/i.test(w)) return 'hours';
  return 'spend';
};

const SHAPES: RegExp[] = [
  new RegExp(`^\\s*question(?:\\s+for\\s+([A-Z][\\p{L}'’-]*))?(?:\\s+(?:about|on)\\s+(?:(?:her|his|their|the|[A-Z][\\p{L}'’-]*(?:'s|’s)?)\\s+)?${KIND})?\\s*[:\\-]\\s*(.+)$`, 'isu'),
  new RegExp(`^\\s*ask\\s+([A-Z][\\p{L}'’-]*)\\s+(?:a\\s+question\\s+)?(?:about|on)\\s+(?:(?:her|his|their|the|[A-Z][\\p{L}'’-]*(?:'s|’s)?)\\s+)?${KIND}\\s*[:,\\-]\\s*(.+)$`, 'isu'),
];

export function aQuestionAskedAboutARequest(message: string): AQuestionAskedAboutARequest | null {
  const m = (message ?? '').trim();
  if (!m || m.length > LONGEST + 120) return null;
  for (const shape of SHAPES) {
    const hit = shape.exec(m);
    if (!hit) continue;
    const asked = wordsGiven(hit[3]);
    if (!asked) return null;
    return { name: hit[1] ?? null, kind: kindOf(hit[2]), question: asked === 'too long' ? m.slice(0, LONGEST + 1) : asked };
  }
  return null;
}

export const WHICH_REQUEST_TO_ASK_ABOUT = (rs: AWaitingRequest[]) => {
  const things = rs.map((r) => r.thing);
  const list = rs.length === 2 ? `One is ${things[0]}, and the other is ${things[1]}.` : `They are ${things.slice(0, -1).join(', ')} and ${things[things.length - 1]}.`;
  return `More than one request is waiting for you. ${list} Which one is your question about? You can write, for example, "question for ${rs[0].firstName || 'Amina'} about ${rs[0].kind === 'spend' ? 'spending' : rs[0].kind}: ..." with your question after the colon.`;
};
export const NOTHING_TO_ASK_ABOUT = 'Nothing is waiting for you to decide right now, so there is no request to ask a question about.';
export const HOURS_TAKE_NO_QUESTION = (firstName: string) =>
  `Groundwork cannot send a question about hours. If something in ${firstName ? `${firstName}'s` : 'their'} hours needs explaining, please ask ${firstName || 'them'} directly.`;

/** "You are asking Amina, “Who will cover the milestone?” It is about Amina's leave from .... I will send it as you wrote it, and the request stays waiting for you. Shall I send it?" */
export const aQuestionSaidBack = (r: AWaitingRequest, question: string) =>
  `You are asking ${r.firstName || 'them'}, ${inQuotes(question)} It is about ${r.thing}. I will send it as you wrote it, and the request stays waiting for you. Shall I send it?`;
export const aQuestionSent = (r: AWaitingRequest) =>
  `I have sent your question to ${r.firstName || 'them'}. The request is still waiting for you to decide.`;
export const aQuestionNotSent = (r: AWaitingRequest) => `I have not sent it. ${r.firstName || 'They'} ${r.firstName ? 'has' : 'have'} not been asked anything, and the request is still waiting for you.`;
