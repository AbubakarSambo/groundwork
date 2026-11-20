/**
 * "WHAT CAN YOU HELP ME WITH?" IS ANSWERED WITH WHAT THIS READER CAN ACTUALLY DO HERE, READ FROM THE ONE GUIDE.
 *
 * The answer is a short list in plain sentences, each with an example, cut for this reader from `THE_GUIDE` in
 * what-the-assistant-can-do.ts, their own role's things first. That guide is also the first-open list and the "How do I...?" answers,
 * so the three cannot disagree (Batch S, group S5). The same words go to the web, WhatsApp and email: nothing here knows the channel.
 * Nothing about anybody else is read, and nothing is written.
 */
import { quotedThenEnding } from './a-quote-takes-no-second-mark';
import { HOW_MANY_ARE_OFFERED, TheReader, whatFitsThisReader } from './what-the-assistant-can-do';

/** Whole-message patterns, the fast way in. Any other words reach the same answer through the model's reading (ask-understands-with-the-model.ts). */
export const WHAT_YOU_CAN_HELP_WITH_PATTERNS: RegExp[] = [
  /^\s*(?:please\s+)?help(?:\s+me|\s+please)?\s*[?!.]*\s*$/i,
  /^\s*(?:hi|hello|hey)?[\s,]*(?:what|how)\s+(?:can|could|do)\s+(?:you|u)\s+(?:help(?:\s+(?:me|us))?(?:\s+(?:with|do))?|do(?:\s+for\s+(?:me|us))?)\s*[?!.]*\s*$/i,
  /^\s*(?:what|how)\s+can\s+(?:i|we)\s+(?:ask|use|say\s+to|talk\s+to)\s+(?:you|this|it|groundwork)(?:\s+(?:for|about))?\s*[?!.]*\s*$/i,
  /^\s*(?:what|which)\s+(?:things|questions|stuff)\s+can\s+(?:i|we)\s+ask(?:\s+(?:you|here))?\s*[?!.]*\s*$/i,
  /^\s*(?:can|could)\s+you\s+help(?:\s+me)?\s*[?!.]*\s*$/i,
  /^\s*how\s+(?:do|does)\s+(?:i|we)\s+(?:use|work)\s+(?:this|you|it|ask\s+groundwork)\s*[?!.]*\s*$/i,
  /^\s*what\s+(?:are\s+you|is\s+this)(?:\s+for)?\s*[?!.]*\s*$/i,
  /^\s*what\s+(?:are\s+)?(?:your|the)\s+(?:options|abilities|capabilities)\s*[?!.]*\s*$/i,
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const HOW_DO_I_CAN_BE_ASKED = 'You can also ask me how to do anything in Groundwork, for example "How do I change my phone number?". I will tell you where it is on screen, and do it for you when I can.';

export function whatYouCanAskSaid(r: TheReader): string {
  const out: string[] = ['Here is what I can help you with.'];
  const waiting = r.waitingForYou ?? 0;
  if (waiting > 0) out.push(`${plural(waiting, 'request waits', 'requests wait')} for you to approve. Ask me what is waiting for you to approve, or tell me to approve or decline one.`);
  for (const g of whatFitsThisReader(r).slice(0, HOW_MANY_ARE_OFFERED)) {
    out.push(`You can ${g.does}. For example, say ${quotedThenEnding(g.example)}`);
  }
  out.push(HOW_DO_I_CAN_BE_ASKED);
  return out.join('\n\n');
}
