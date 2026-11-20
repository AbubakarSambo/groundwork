/**
 * WHAT A LEAD SAYS THAT IS TRUE OF THE WHOLE COMPANY, AND HOW IT IS OFFERED BACK (week 20).
 *
 * "Every quote over 1 million needs Amina's sign-off" is not about one check-in. Said to the setup
 * conversation it is kept on that check-in and forgotten by the next one. The lead can now be asked
 * whether to keep it for the organisation, and only a yes keeps it (decision 12).
 *
 * THIS FILE IS THE RULES, WITH NO DATABASE AND NO MODEL, so that they can be tested on their own:
 *
 *   1. ONLY THE LEAD'S OWN WORDS. The offer is made from what the lead typed in the setup
 *      conversation, and the words offered must be found, as typed, in what they typed. A model
 *      that tidies a sentence into one the lead never wrote is refused here.
 *   2. NEVER A PRIVATE NOTE. A remark the lead asked to keep private ("keep this between us"), and
 *      anything that judges a person on the check-in, is never offered. The lead's private notes
 *      have their own road and it never comes here.
 *   3. NEVER A PARTICIPANT'S WORDS. The setup conversation is the lead's alone; nothing said in
 *      anybody's check-in is ever offered from there.
 *   4. A SAY-BACK THAT ENDS IN A QUESTION, in the lead's words, so the yes is to something they read.
 */

export const MEMORY_KINDS = ['rule', 'definition', 'principle', 'owner', 'client'] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

/** What each kind is called to the lead, after "as". */
const AS_A: Record<MemoryKind, string> = {
  rule: 'a rule',
  definition: 'a definition',
  principle: 'a principle',
  owner: 'who owns something',
  client: 'something about a client',
};

/**
 * A CHEAP GATE BEFORE THE MODEL IS ASKED. Most turns of the setup conversation are about this
 * check-in (how long, how often, what good looks like) and there is no reason to spend a model call
 * on them. A sentence that can be company-wide has a must, an every, a never, a rule, a meaning, a
 * name for an owner, or a client. It only decides whether to ask; what is kept is decided by the
 * model's reading, the guards below, and the lead's yes.
 */
const SOUNDS_COMPANY_WIDE = new RegExp([
  '\\b(?:every|always|never|must|needs?|need to|has to|have to|only|all)\\b',
  '\\b(?:rule|policy|principle|standard|definition|defin(?:e|ed)|we call|we count|counts? as|means)\\b',
  '\\b(?:sign[- ]?off|approval|approves?|approved by|owns?|owner|responsible|sits? with|reports? to)\\b',
  '\\b(?:client|customer|account)\\b',
].join('|'), 'i');

export function soundsCompanyWide(said: string | null | undefined): boolean {
  const t = (said ?? '').trim();
  return t.length >= 25 && SOUNDS_COMPANY_WIDE.test(t);
}

/** The lead asked for it to stay between them and Groundwork. Nothing in that message is offered. */
const ASKED_TO_KEEP_PRIVATE = /\b(?:private|in confidence|confidential|between us|between you and me|don'?t tell|do not tell|not to be shared|keep (?:this|it) (?:to yourself|quiet|secret)|off the record|only for me|just for me)\b/i;

/** Words that judge or worry about a person. A sentence naming someone on the check-in with one of them is a note about that person. */
const ABOUT_HOW_A_PERSON_IS_DOING = /\b(?:struggl\w*|difficult|late|lazy|weak|poor(?:ly)?|under-?perform\w*|missed|missing|not meeting|worried|concern(?:ed|s)?|conflict|quit|resign\w*|leave|leaving|attitude|unreliable|disappoint\w*|problem with)\b/i;

export interface Heard {
  kind?: string | null;
  /** The sentence, exactly as the lead typed it. */
  text?: string | null;
}

export interface Keepable { kind: MemoryKind; text: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * WHICH OF WHAT THE MODEL READ MAY BE OFFERED. Everything else is dropped without a word.
 * `people` are the first and full names of everyone on the check-in.
 */
export function keepable(heard: Heard[] | null | undefined, leadSaid: string, people: string[] = []): Keepable[] {
  if (ASKED_TO_KEEP_PRIVATE.test(leadSaid)) return [];
  const said = norm(leadSaid);
  const names = people.map((p) => norm(p)).filter((p) => p.length >= 2);
  const out: Keepable[] = [];
  for (const h of heard ?? []) {
    const kind = (h?.kind ?? '').toLowerCase() as MemoryKind;
    const text = (h?.text ?? '').trim();
    if (!MEMORY_KINDS.includes(kind) || !text) continue;
    if (text.length > 300 || text.split(/\s+/).length < 4) continue;
    /* Rule 1: their words, as typed. Not a tidier sentence. */
    if (!said.includes(norm(text))) continue;
    /* Rule 2: a sentence that names someone on this check-in and judges them is a note, not a rule. */
    const namesSomeone = names.some((n) => ` ${norm(text)} `.includes(` ${n} `) || norm(text).split(' ').includes(n));
    if (namesSomeone && ABOUT_HOW_A_PERSON_IS_DOING.test(text)) continue;
    if (out.some((o) => norm(o.text) === norm(text))) continue;
    out.push({ kind, text });
  }
  return out.slice(0, 1);
}

/** Where it came from, as the company page reads it: "Picked up from your check-in on 22 September". */
export function sourceLineOn(day: string): string {
  return `Picked up from your check-in on ${day}`;
}

/** The one question the lead answers. Their words are between quotation marks and are never reworded. */
export function shallIKeep(k: Keepable, ask: string = 'Ask Groundwork'): string {
  return `Shall I keep "${k.text.replace(/[.!?]+$/, '')}" as ${AS_A[k.kind]} for the whole organisation, so later check-ins and ${ask} can use it?`;
}

/** After the yes. */
export function iHaveKept(k: { kind: string; text: string }, ask: string = 'Ask Groundwork'): string {
  const as = AS_A[(k.kind as MemoryKind)] ?? 'something to remember';
  return `I have kept "${k.text.replace(/[.!?]+$/, '')}" as ${as} for the whole organisation. Later check-ins and ${ask} can now use it. You can see it on the Desk.`;
}

/** After the no. Nothing was kept, and it is said. */
export const NOT_KEPT = 'I have not kept that for the organisation. It stays only on this check-in.';
/** After a no to the answer as well: it is on this check-in no more than it is on the organisation. */
export const NOT_KEPT_ANYWHERE = 'I have not kept that for the organisation either. Nothing was changed.';

/**
 * Whether the rule offered for the whole organisation is the same words as the answer just refused
 * (reviewer, 14 October). The rule is the first quoted part of the offer; the answer is what was said.
 */
export function theRuleIsTheAnswerRefused(offerSay: string, refused: string): boolean {
  const quoted = /["“]([^"”]{3,})["”]/.exec(offerSay ?? '')?.[1];
  const said = /["“]([^"”]{3,})["”]/.exec(refused ?? '')?.[1] ?? refused ?? '';
  const plain = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!quoted || !plain(said)) return false;
  return plain(said) === plain(quoted) || plain(said).includes(plain(quoted)) && plain(quoted).length >= plain(said).length * 0.6;
}

/** When the yes arrives and there is nothing waiting for it any more. */
export const NOTHING_WAITING = 'There is nothing waiting to be kept for the organisation. Say it again and I will ask.';

export const MEMORY_PROMPT = [
  'Read ONLY what the lead just typed. Find sentences that are true of the whole company and not only of this',
  'check-in: a rule (for example who must approve something), a definition of a word the company uses, a',
  'principle, who owns something, or a fact or rule about a client. For each, give its kind and the sentence',
  'EXACTLY as the lead typed it, without changing or shortening a word.',
  'Never include anything about how a named person is doing, what the lead thinks of someone, a target for one',
  'person, how long or how often this check-in runs, or what doing well looks like for this check-in.',
  'If you are not sure a sentence is true of the whole company, leave it out. Returning nothing is correct.',
].join(' ');

export const MEMORY_TOOL = {
  name: 'company_wide_things',
  description: 'Sentences the lead typed that are true of the whole company.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: [...MEMORY_KINDS], description: 'What the sentence is.' },
            text: { type: 'string', description: 'The sentence exactly as the lead typed it.' },
          },
          required: ['kind', 'text'],
        },
      },
    },
  },
};

/**
 * WHAT A SESSION OR AN ANSWER IS GIVEN. Context, never somebody's account: it does not say who
 * said it, it is not to be quoted back to anyone, and it does not say it was asked of them.
 */
export function whatTheOrganisationKeepsBlock(kept: { kind: string; text: string }[]): string {
  if (!kept.length) return '';
  return [
    'WHAT THIS ORGANISATION HAS ASKED US TO KEEP IN MIND.',
    '',
    'Its lead confirmed each of these as true of the whole company. Use them only to understand what people',
    'are describing. Do not quote them to anybody, do not say who said them or where they came from, and',
    'never treat one as something this person said or as their account. If what this person says differs',
    'from one of these, do not correct them. Ask what happens in their own words.',
    '',
    ...kept.map((k) => `- (${k.kind}) ${k.text.trim()}`),
  ].join('\n');
}
