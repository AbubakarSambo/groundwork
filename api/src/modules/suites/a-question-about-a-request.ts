import { askName } from '../assistant/ask-name';
import { saidAsADate } from './a-request-is-recorded';

/**
 * A QUESTION ABOUT A LEAVE REQUEST, AND A REASON FOR A DECLINE, IN THE WORDS EACH READER READS
 * (decision 85, item 1; build step 7 of docs/suites-against-the-workflow-model.md).
 *
 * The person who decides a request may approve it, decline it, or ask the person who made it a
 * question. A question leaves the request waiting. The person is told in the app (under their own
 * leave and on Today), on WhatsApp, and in Ask Groundwork the next time they write there, and they
 * answer in the app or in Ask Groundwork. A decline may carry a reason, which the person is told.
 *
 * Both the question and the answer are the words each of them wrote, and are read only by the
 * people who already read the request: the person who asked for the leave, whoever decides it, an
 * admin and a lead of the person's team. The reader is "you"; everybody else is named.
 */

/** The parked proposals in Ask Groundwork: a question waiting for the person's answer, and that answer said back. */
export const LEAVE_QUESTION_KIND = 'leave_question';
export const LEAVE_ANSWER_KIND = 'leave_answer';

export const LONGEST = 1000;

export const QUESTION_REFUSED = {
  emptyQuestion: 'Write the question first.',
  tooLong: 'Keep it under 1,000 characters.',
  notYours: 'Only the person who decides this request can ask about it.',
  notWaiting: 'This request has already been decided.',
  onlyThePerson: 'Only the person who asked for this leave can answer a question about it.',
  onlyThePersonWhoAskedToSpend: 'Only the person who asked to spend this can answer a question about it.',
  nothingToAnswer: 'There is no question waiting for your answer on this request.',
  emptyAnswer: 'Write your answer first.',
};

const capital = (x: string) => `${x.charAt(0).toUpperCase()}${x.slice(1)}`;

/** “Who will cover the milestone?” with the closing mark inside the quotes, as the prototype writes them. */
export function inQuotes(words: string): string {
  const w = (words ?? '').trim().replace(/\s+/g, ' ');
  return `“${w}${/[.?!…]$/.test(w) ? '' : '.'}”`;
}

export interface AQuestion {
  id: string;
  askedById: string;
  toUserId: string;
  question: string;
  answer: string | null;
  askedAt: Date;
  answeredAt: Date | null;
}

/**
 * One question and its answer, for one reader. `names` gives first names by sign-in.
 *   Wairimu, who asked: "You asked Aisha on 5 October, “Who will cover the Project X milestone?”"
 *                       "Aisha answered on 6 October, “Brian will cover it.”" or "Aisha has not answered yet."
 *   Aisha:              "Wairimu asked you on 5 October, “...”" and "You answered on 6 October, “...”", or
 *                       "You have not answered yet. You can answer it here or in Ask Coamana." (the organisation's own Ask name)
 *   Anybody else:       "Wairimu asked Aisha on 5 October, “...”" and "Aisha answered on 6 October, “...”"
 */
export function aQuestionSaid(q: AQuestion, names: Map<string, string>, readerUserId: string, ask: string = askName(null)): string[] {
  const who = (id: string) => (id === readerUserId ? 'you' : names.get(id) || 'somebody');
  const by = who(q.askedById);
  const to = who(q.toUserId);
  const out = [`${capital(by)} asked ${to} on ${saidAsADate(q.askedAt)}, ${inQuotes(q.question)}`];
  if (q.answer != null && q.answeredAt) out.push(`${capital(to)} answered on ${saidAsADate(q.answeredAt)}, ${inQuotes(q.answer)}`);
  else out.push(to === 'you' ? `You have not answered yet. You can answer it here or in ${ask}.` : `${capital(to)} has not answered yet.`);
  return out;
}

/** The reason given with a decline: "Wairimu said, “Sales is two short that week.”" or "You said, ...". */
export function aReasonSaid(decider: string, reason: string): string {
  return `${capital(decider)} said, ${inQuotes(reason)}`;
}

/** Plain text, trimmed, or null when there is nothing in it. Refuses what is too long. */
export function wordsGiven(x: unknown): string | null | 'too long' {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  if (!t) return null;
  return t.length > LONGEST ? 'too long' : t;
}

// ---------------------------------------------- Ask Groundwork ----------------------------------------------

/** The person wrote their answer: it is said back before it goes. */
export function anAnswerSaidBack(asker: string, leave: string, question: string, answer: string): string {
  return `${capital(asker)} asked you about your ${leave}, ${inQuotes(question)} I will send ${asker} your answer as you wrote it, ${inQuotes(answer)} Shall I send it?`;
}

/** Which request a question is about, for the sentences that follow: leave by default, or a request to spend (build step 9). */
export type QuestionSuite = 'leave' | 'spend';

export const anAnswerSent = (asker: string, suite: QuestionSuite = 'leave') =>
  `I have sent your answer to ${asker}. Your ${suite === 'spend' ? 'request to spend' : 'leave request'} is still waiting for ${asker} to decide.`;

export const anAnswerNotSent = (asker: string, suite: QuestionSuite = 'leave') =>
  `I have not sent it. ${capital(asker)}’s question is still waiting for your answer, so write your answer here when you are ready, or answer it under your ${suite === 'spend' ? 'requests to spend' : 'leave'}.`;

export const NO_QUESTION_WAITING = 'There is no question about your leave waiting for your answer now, so I have not sent anything.';
export const NO_SPEND_QUESTION_WAITING = 'There is no question about your request to spend waiting for your answer now, so I have not sent anything.';
export const noQuestionWaiting = (suite: QuestionSuite = 'leave') => (suite === 'spend' ? NO_SPEND_QUESTION_WAITING : NO_QUESTION_WAITING);

// ---------------------------------------------- WhatsApp ----------------------------------------------

/** A question waiting for the person's answer, as the WhatsApp router needs it. */
export interface AQuestionWaiting {
  /** The question's id (`SuiteQuestion`). */
  id: string;
  suite: 'leave' | 'spend';
  /** The request's id. */
  ref: string;
  /** Who asked it, by first name. */
  askedBy: string;
  /** What it is about, for the middle of a sentence: "your leave", "your request to spend". */
  about: string;
}

const whoseName = (n: string) => (/s$/i.test(n.trim()) ? `${n.trim()}'` : `${n.trim()}'s`);

/**
 * Asked once on WhatsApp, when the person replies during an open check-in while a question about
 * their own request waits for them: "Is this your answer to Wairimu's question about your leave?"
 */
export const isThisYourAnswer = (q: { askedBy: string; about: string }) =>
  `Is this your answer to ${q.askedBy?.trim() ? whoseName(q.askedBy) : 'the'} question about ${q.about}?`;
export const YES_OR_NO_TO_AN_ANSWER = (q: { askedBy: string; about: string }) => `Please reply yes or no. ${isThisYourAnswer(q)}`;
/** After the yes, on WhatsApp: the check-in is still open. */
export const BACK_TO_THE_CHECK_IN = 'Your check-in is still open, so carry on with it whenever you are ready.';

// ---------------------------------------------- Today ----------------------------------------------

/** "Wairimu asked you a question about your leave from Monday 12 October to Friday 16 October." */
export const aQuestionOnToday = (asker: string, leave: string) => `${capital(asker)} asked you a question about your ${leave}.`;

// ------------------------------------- a reason given in Ask Groundwork -------------------------------------

/** "decline Aisha's leave because Sales is two short that week": the reason, or null. */
export function aReasonIn(message: string): string | null {
  const m = /\bbecause\s+(.+)$/i.exec((message ?? '').trim());
  const r = m?.[1]?.trim().replace(/[.!]+$/, '').trim();
  return r ? r.slice(0, LONGEST) : null;
}

/**
 * The approver's decline said back with the reason they gave: "You are declining Aisha's leave from
 * ..., and I will tell Aisha your reason, “Sales is two short that week.” Is that right?"
 */
export function aDeclineWithAReasonSaidBack(thing: string, firstName: string, reason: string): string {
  return `You are declining ${thing}, and I will tell ${firstName || 'them'} your reason, ${inQuotes(reason)} Is that right?`;
}
