/**
 * "WHAT CAN YOU HELP ME WITH?" IS ANSWERED WITH WHAT THIS READER CAN ACTUALLY DO HERE.
 *
 * The most ordinary first question anybody puts to a helper used to get "I cannot answer that one
 * yet. Here is what I can do with "help"." The answer is now a short list in plain sentences, built
 * from what the router offers THIS reader: the check-ins they are in or run, the suites switched on
 * for them, and what waits for them to approve. Nothing about anybody else is read, and nothing is
 * written.
 */

/** Whole-message patterns only, so "help me think through the Q4 target" still goes to its own lane. */
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

export interface WhatYouCanAskFacts {
  /** Check-ins that are still running which this reader is in. */
  checkInsYouAreIn: number;
  /** Of those, the ones this reader runs. */
  checkInsYouRun: number;
  leaveIsOn: boolean;
  spendingIsOn: boolean;
  hoursAreOn: boolean;
  /** Requests that wait for this reader to approve. */
  waitingForYou: number;
}

/** Adding to a check-in through Ask is said back first (docs/ask-definition.md, decision 100). */
export const CONTEXT_FOR_A_CHECK_IN = 'You can also add context or a document to one of your check-ins. I will say it back to you first, and it only goes in once you say yes. Once it is in, the people in that check-in can read it.';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function whatYouCanAskSaid(f: WhatYouCanAskFacts): string {
  const out: string[] = ['Here is what you can ask me.'];

  if (f.checkInsYouAreIn > 0) {
    out.push(`You are in ${plural(f.checkInsYouAreIn, 'check-in', 'check-ins')} right now, so you can ask me what you have said in them, what to do next, and how you are doing.`);
  } else {
    out.push('You are not in a check-in right now, so for the moment you can ask me about your own list and how things work here.');
  }
  if (f.checkInsYouRun > 0) {
    out.push(`You run ${plural(f.checkInsYouRun, 'check-in', 'check-ins')}, so you can also ask who needs you this week, what is stuck, and what to talk about next.`);
  }

  const suites = [f.leaveIsOn && 'leave', f.spendingIsOn && 'spending', f.hoursAreOn && 'hours'].filter(Boolean) as string[];
  if (suites.length) {
    const named = suites.length === 1 ? suites[0] : `${suites.slice(0, -1).join(', ')} and ${suites[suites.length - 1]}`;
    out.push(`${named.charAt(0).toUpperCase()}${named.slice(1)} ${suites.length === 1 ? 'is' : 'are'} switched on for you, so you can ask for them by saying what you need, ask where a request of yours stands, and ask who approves it.`);
  } else {
    out.push('Leave, spending and hours are not switched on for you, so there is nothing to ask for there yet.');
  }
  if (f.waitingForYou > 0) {
    out.push(`${plural(f.waitingForYou, 'request waits', 'requests wait')} for you to approve. Ask me what is waiting for you to approve, or tell me to approve or decline one.`);
  }

  out.push('You can also ask me what is due, who is off next week, and how things are done here, and you can tell me to add something to your to-do list.');
  out.push(CONTEXT_FOR_A_CHECK_IN);
  out.push('Whatever you ask me stays between you and me.');
  return out.join('\n\n');
}
