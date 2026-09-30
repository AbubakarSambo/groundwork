/**
 * THE ROLE INTERVIEW (request 25, the role map, U.17).
 *
 * An admin sends it to a person. The person then answers four questions about their job in Ask
 * Groundwork, one at a time: what they own, what they decide, who they depend on, and who depends on
 * them. Everything is said back in plain sentences and only a yes writes one row. Nobody is rated by
 * it, it is about the job, and it is never read into a check-in's report.
 *
 * NO MODEL WORDS ANY OF THIS. The questions and the say-back are fixed sentences below, and what the
 * person typed is kept word for word, so there is no prompt and no prompt version to record. The
 * conversation stays in code because nothing here needs reading between the lines.
 */

export const ROLE_INTERVIEW_KIND = 'role_interview';
export const ROLE_INTERVIEW_CONFIRM_KIND = 'role_interview_confirm';

export type TheFourAnswers = { owns: string; decides: string; dependsOn: string; dependedOnBy: string };
export type TheFourKeys = keyof TheFourAnswers;

export const THE_FOUR: { key: TheFourKeys; asks: (role: string) => string }[] = [
  { key: 'owns', asks: (role) => `What do you own in your job as ${role}? Tell me in your own words, for example "the sales target and the sales team".` },
  { key: 'decides', asks: () => 'What do you decide yourself, without asking anybody first?' },
  { key: 'dependsOn', asks: () => 'Who do you depend on to do your job?' },
  { key: 'dependedOnBy', asks: () => 'And who depends on you to do theirs?' },
];

export const INTERVIEW_INVITATION = (role: string) =>
  `Your admin has asked you four short questions about your job as ${role}, so that the role map can show what the job owns. It is about the job and not about you, and nobody is marked on it. Say "start" when you are ready, or "not now" if you would rather not.`;

export interface InterviewPayload {
  roleName: string;
  /** How many of the four have been answered. Zero means it has not been started. */
  answered: number;
  /** They said "start". */
  started?: boolean;
  /** The reminder that it is waiting has been said once. */
  reminded?: boolean;
  answers: Partial<TheFourAnswers>;
  sentByUserId?: string | null;
}

export interface ConfirmPayload { roleName: string; answers: TheFourAnswers }

const START = /^(?:start|begin|ready|i'?m ready|let'?s go|go ahead|yes|yep|yeah|ok|okay|sure|y)\b[.!]?$/i;
const NOT_NOW = /^(?:not now|no|nope|nah|stop|cancel|skip|no thanks|later)\b[.!]?$/i;
export const theyWantToBegin = (m: string) => START.test((m ?? '').trim());
export const theyWantToStop = (m: string) => NOT_NOW.test((m ?? '').trim());

/** The longest answer kept. A longer one is asked again, in full, rather than cut. */
export const LONGEST_ANSWER = 1000;

export const tidy = (m: string) => (m ?? '').trim().replace(/\s+/g, ' ');

/** "I own the sales target" reads back as "the sales target", so "You own ..." stays a sentence. */
const LEAD_INS: Record<TheFourKeys, RegExp> = {
  owns: /^(?:i\s+(?:own|am responsible for|look after|run)|you\s+own)\s+/i,
  decides: /^(?:i\s+(?:decide|decide on|choose|approve)|you\s+decide)\s+/i,
  dependsOn: /^(?:i\s+(?:depend on|rely on|wait for|need)|you\s+depend on)\s+/i,
  dependedOnBy: /^(?:(?:they|people|the)\s+)?(?:depend|rely|wait)s?\s+on\s+me\s*[:,-]?\s*/i,
};

const withoutEndStop = (s: string) => s.replace(/[.!?;,\s]+$/, '');

export const forTheSayBack = (key: TheFourKeys, typed: string): string => {
  const t = withoutEndStop(tidy(typed));
  if (key === 'dependedOnBy') {
    const m = /^(.*?)\s+(?:depends?|rel(?:y|ies)|waits?)\s+on\s+me$/i.exec(t);
    if (m && m[1]) return m[1];
  }
  return withoutEndStop(t.replace(LEAD_INS[key], '')) || t;
};

/* Words that start a sentence and are never a name. Only these lose their capital in the say-back. */
const PLAIN_FIRST_WORDS = new Set(['the', 'a', 'an', 'my', 'our', 'your', 'their', 'his', 'her', 'its', 'what', 'who', 'whom', 'which', 'when', 'where', 'how', 'all', 'any', 'every', 'each', 'some', 'no', 'nobody', 'everyone', 'everybody', 'anyone', 'people', 'customers', 'new', 'other', 'both', 'whatever', 'whoever', 'this', 'that', 'these', 'those', 'one', 'it', 'we', 'they', 'he', 'she']);

/** Only the first letter of the answer may change, and only when its word is a plain one and not a name. */
const inTheMiddleOfASentence = (t: string) => {
  const first = /^[A-Z][a-z']*\b/.exec(t)?.[0];
  return first && PLAIN_FIRST_WORDS.has(first.toLowerCase()) ? `${t[0].toLowerCase()}${t.slice(1)}` : t;
};

const quoted = (t: string) => `"${inTheMiddleOfASentence(t).replace(/["\u201c\u201d]/g, "'")}"`;

/**
 * All four said back in one plain paragraph, then the question. The person's words are quoted and not
 * reworded, so their own "I" and "my" sit inside quotation marks and not inside a sentence about "you".
 */
export function sayItBack(a: TheFourAnswers): string {
  const s = (k: TheFourKeys) => quoted(forTheSayBack(k, a[k]));
  return `You said you own ${s('owns')}, you decide ${s('decides')}, you depend on ${s('dependsOn')}, and ${s('dependedOnBy')} depend on you. Shall I save this for the role map?`;
}

export const SAVED = (role: string) => `I have saved this for the role map. It shows what the ${role} job owns. It is about the job and not about you.`;
export const LEFT = 'I have left it as it was. Nothing was saved. If you would like to go through the questions again, say "start".';
export const NOT_NOW_SAID = 'That is fine. I have not saved anything. Say "start" any time you want to go through the four questions.';
export const TOO_LONG = `That is a long answer. Could you say it again in fewer than ${LONGEST_ANSWER} characters? I keep your words exactly as you write them.`;
export const EMPTY = 'I did not catch an answer there. Could you say it again in a sentence or two?';
