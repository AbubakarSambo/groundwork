/**
 * WHAT THIS SESSION HAS ALREADY COVERED, READ OFF THE CONVERSATION ITSELF.
 *
 * The owed list and the scenario spine are proved from RECORD ENTRIES, and record entries are
 * extracted when a check-in completes. So for the whole of a live session, everything the person
 * has just answered still reads as owed, and the block that says "still to cover" says the same
 * thing on turn nine that it said on turn one. Read across two adversarial runs (20 Sep 2026):
 * "repeated question" was the judge's commonest fault, 35 times; "questionnaire feel" 22; the
 * convener of a discovery session was asked what was stopping her three times, and a borrower who
 * said "I don't focus on a weekly number" was asked for the weekly number again.
 *
 * This reads the turns of the session in hand and says, for each thing owed or each line of the
 * spine, whether it has been asked, whether it was answered, whether the answer carried anything
 * specific, and whether the person declined it. Nothing here is a model call. The same words that
 * decide whether two questions are the same question (asked-twice-and-told-no-twice) decide whether
 * a turn asked about a thing, so the two guards cannot disagree.
 */
import { asksTheSameThingAgain } from './asked-twice-and-told-no-twice';
import { runIntake } from './intake';

export interface ATurnInSession {
  role: 'AI' | 'PERSON';
  content: string;
}

export interface AThingToCover {
  id: string;
  what: string;
}

export type CoverState = 'not-asked' | 'asked-not-answered' | 'answered' | 'answered-vaguely' | 'declined';

export interface HowItWasCovered {
  state: CoverState;
  /** How many turns asked about it. */
  askedTimes: number;
  /** The person's answer, where there was one, so the block can quote it back instead of asking again. */
  answer: string | null;
}

/**
 * "I don't track that", "how would I know", "not something I look at": a refusal is an answer, and it
 * is the one answer the next question must not ignore. Bounded to the shapes that were badgered live.
 */
const DECLINES =
  /\b(i (do not|don't|dont) (know|have|track|focus|count|look at|keep|measure|need to|want to|see why|deal with)|how would i know|not something i|not my (job|target|call|problem|department)|(that|this) is (finance|somebody else|someone else)'?s? (job|call|problem)|we (do not|don't|dont) (share|track|have)|no idea|i (can't|cannot) (say|tell|give)|not (going|able) to (say|share|give)|i('d| would) rather not|leave it there|move on|you('d| would) have to ask|i haven'?t asked|too early|i (cannot|can't) say when|when i can|i('m| am) not sure (of|what|which|exactly)|it varies|nothing (is )?(getting in|in) the way|nothing is (stopping|blocking)|(do not|don't|dont) have (those|that|them|it|the (numbers|figures|breakdown)) (broken down|in front of me|to hand|on hand|right now|with me|here)|they know their (goals|targets|numbers))\b|^\s*nothing[.!]?\s*$/i;

/** Did this turn decline the thing asked? Exported so the reply guard and the block agree on what a decline is. */
export const theyDeclined = (turn: string): boolean => DECLINES.test(turn ?? '');

/**
 * What the model is told when they declined and it asked again anyway. Names what happened; the words
 * of the next turn are the model's.
 */
/** The line the model gets when it asks again about a thing this person has already answered this session. */
export const theyAlreadyAnsweredThat = (what: string, answer: string): string =>
  `THEY HAVE ALREADY ANSWERED THIS, THIS SESSION. You asked about ${what} and they said: "${answer.slice(0, 240)}". Your reply asks for it again. Do not. Build on what they said, or move to something else this check-in is for. Never ask for the same thing twice in one session when they have answered it.`;

export const THEY_DECLINED_IT = `They said no to that: they do not have it, do not track it or will not give it. Your reply asked for it again in other words. A no is an answer. Say in one short sentence that it goes down as they put it. Then move to something else this check-in is for. Never ask for the same thing again in any form. Never explain why you wanted it.`;

/** A short reply that is not an answer to anything: "ok", "yes", "fine". */
const AN_ACK = /^\s*(ok(ay)?|yes|yeah|yep|no|fine|sure|good|noted|right|alright)[\s.!,]*$/i;

/*
 * THE SAME THING, ASKED IN THE WORDS PEOPLE USE. "What do you need from others to move forward?" is the
 * owed item "what they need from other people", and the word test did not see it (others, not other),
 * so the close was held on the very thing that had just been asked and answered (smoke run 7, 21 Sep
 * 2026). Each owed thing has the ways it is asked in a conversation, and either test counts.
 */
const ALSO_ASKED_AS: [RegExp, RegExp][] = [
  [/need from (?:other people|another team)|needs support|where somebody needs to act/i, /\b(?:need|want|require)(?:ing)? (?:anything |something |more |help )?from (?:others|other people|anyone|anybody|someone|the team|another team|finance|management|your (?:manager|lead|team))|\bwhat (?:support|help) (?:do|would) you need|\bneed (?:anything|any help|any support|support)\b|\bwho (?:owns|could|can|should) (?:the unblock|help|unblock|step in)|\banything blocking\b/i],
  [/part of the plan that is (?:theirs|yours) to do|what they are working on|what should happen next|what they mean to do first/i, /\b(?:what|which) (?:is|are|would be) (?:the |your )?(?:next|first) (?:action|step|thing|move)|\bwhat will you do\b|\bwhat (?:are|will) you (?:be )?(?:doing|working on|taking|going to do)|\bby when\b|\byour (?:own )?part\b|\bwhat (?:do you|will you) do (?:first|next|about)/i],
  [/how they are making their number/i, /\b(?:on credit|cash sales|credit sales|what terms|payment terms|kind of sales|how (?:much|many) of (?:that|those|your sales|it)|breakdown|percentage of your sales|split between|mix of)\b/i],
  [/off track|getting in the way|still open or unresolved|what is not on track/i, /\b(?:off track|not on track|behind|in the way|getting in the way|blocking|blocker|stuck|challenge|unfinished|still open|unresolved|slowing)\b/i],
  [/what has moved since|happened since/i, /\b(?:since (?:last time|then|we last|the last)|what has (?:moved|changed|happened)|where (?:are you|do things stand|are things) (?:now|today|against))\b/i],
  [/what was achieved|where it actually landed/i, /\b(?:where did (?:things|it) (?:land|end up|actually land)|what (?:was|did you) achieve|final (?:number|figure|paid)|land(?:ed)? against|where do things stand today)\b/i],
  [/what is clear and what is not|how they see it/i, /\b(?:what is (?:not )?clear|unclear|what (?:do|don't|do not) you understand|make sense to you|confus|what is missing)/i],
  [/understood they were meant to do|what they are answerable for/i, /\b(?:what did you understand|your understanding of|understand (?:your|the) role|meant to do|expected of you|what (?:is|was) the (?:role|job) (?:for|there to do)|in your own words, before|what are you (?:looking|trying|aiming) to (?:achieve|do|deliver)|what are you (?:answerable|responsible) for|what is (?:your|the) target)\b/i],
  [/what this is trying to achieve|the main goal|the goals or targets/i, /\b(?:trying to achieve|aiming (?:for|at|to)|what (?:is|are) (?:the|your) (?:goal|target|aim|objective)|what would (?:success|done) look like|what is the number)\b/i],
];

/* THE JOB, LEARNED IN A FIRST CHECK-IN (decision 129): how each of its things is asked in a conversation. */
ALSO_ASKED_AS.push(
  [/what their job is called/i, /\b(?:what is your (?:job|role)(?: title)?(?: called)?|what do you do (?:here|for work|at \w+)|your job title|what is your role|what do you call your (?:job|role))\b/i],
  [/responsible for in their job/i, /\b(?:responsible for|you own|in charge of|accountable for|what does your (?:job|role) (?:cover|involve|include)|what (?:is|are) (?:your|the) main (?:responsibilit|part)|what is your job (?:made of|about))/i],
  [/what doing well looks like in their job/i, /\b(?:doing (?:it |this |the job |your job |your role )?well|good looks like|what does (?:a )?good|how (?:will|would|do) you know (?:you(?:'| a)re|it is|that you(?:'| a)re) (?:doing|going) well|success (?:in|for) your (?:job|role))\b/i],
  [/who they depend on in their job/i, /\b(?:depend(?:s|ing)? on|rely on|relies on|who (?:do )?you (?:need|wait for|count on)|who needs you|who (?:waits|is waiting) for you|who counts on you)\b/i],
  [/usually gets in their way in their job/i, /\b(?:gets? in your way|in your way|gets? in the way|what (?:usually )?(?:slows|blocks|holds) you|most often (?:slows|stops|blocks))\b/i],
);

export function askedAbout(thing: AThingToCover, aiTurn: string): boolean {
  if (asksTheSameThingAgain(thing.what, aiTurn)) return true;
  return ALSO_ASKED_AS.some(([what, asked]) => what.test(thing.what) && asked.test(aiTurn ?? ''));
}

function readTheAnswer(answer: string | undefined): { state: CoverState; answer: string | null } {
  const a = (answer ?? '').trim();
  if (!a || AN_ACK.test(a)) return { state: 'asked-not-answered', answer: null };
  if (DECLINES.test(a)) return { state: 'declined', answer: a };
  const words = a.split(/\s+/).length;
  if (runIntake(a).checkable) return { state: 'answered', answer: a };
  return { state: words >= 5 ? 'answered-vaguely' : 'asked-not-answered', answer: words >= 5 ? a : null };
}

/**
 * For each thing, the strongest state the session has reached with it. Answered beats vague beats
 * declined beats asked; a decline after an answer is still a decline for what comes next, so it wins
 * over vague. Not-asked only when no AI turn came near it.
 */
export function whatThisSessionHasCovered(things: AThingToCover[], turns: ATurnInSession[]): Map<string, HowItWasCovered> {
  const out = new Map<string, HowItWasCovered>();
  for (const thing of things) {
    let askedTimes = 0;
    let best: HowItWasCovered = { state: 'not-asked', askedTimes: 0, answer: null };
    const rank: Record<CoverState, number> = { 'not-asked': 0, 'asked-not-answered': 1, 'answered-vaguely': 2, declined: 3, answered: 4 };
    for (let i = 0; i < turns.length; i++) {
      const t = turns[i];
      if (t.role !== 'AI' || !askedAbout(thing, t.content ?? '')) continue;
      askedTimes += 1;
      const next = turns.slice(i + 1).find((x) => x.role === 'PERSON');
      const read = readTheAnswer(next?.content);
      if (rank[read.state] >= rank[best.state]) best = { state: read.state, askedTimes, answer: read.answer ?? best.answer };
    }
    out.set(thing.id, { ...best, askedTimes });
  }
  return out;
}

const shortly = (s: string, max = 140): string => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t;
};

/**
 * THE BLOCK, SPLIT BY WHAT HAPPENED. Facts, in the product's words; the model writes the question.
 *
 * Four lists, and the last three exist so that the first one stops growing back. A thing answered
 * this session is quoted so the model can build on it instead of asking for it. A thing answered
 * without a specific may be asked for once more, for the specific, and then left. A thing declined
 * or asked twice is left, full stop: it goes to the report as open, not into a third question.
 */
export function sayWhatHasBeenCovered(things: AThingToCover[], covered: Map<string, HowItWasCovered>): {
  notAsked: AThingToCover[];
  answered: { thing: AThingToCover; answer: string }[];
  vague: { thing: AThingToCover; answer: string }[];
  leave: { thing: AThingToCover; why: 'declined' | 'asked twice'; answer?: string | null }[];
  block: string;
} {
  const notAsked: AThingToCover[] = [];
  const answered: { thing: AThingToCover; answer: string }[] = [];
  const vague: { thing: AThingToCover; answer: string }[] = [];
  const leave: { thing: AThingToCover; why: 'declined' | 'asked twice'; answer?: string | null }[] = [];
  for (const thing of things) {
    const c = covered.get(thing.id) ?? { state: 'not-asked' as CoverState, askedTimes: 0, answer: null };
    if (c.state === 'declined') leave.push({ thing, why: 'declined', answer: c.answer });
    else if (c.state === 'answered') answered.push({ thing, answer: c.answer ?? '' });
    else if (c.askedTimes >= 2) leave.push({ thing, why: 'asked twice', answer: c.answer });
    else if (c.state === 'answered-vaguely') vague.push({ thing, answer: c.answer ?? '' });
    else if (c.state === 'asked-not-answered' && c.askedTimes >= 1) vague.push({ thing, answer: '' });
    else notAsked.push(thing);
  }
  const lines: string[] = [];
  if (answered.length) {
    lines.push(
      'ALREADY ANSWERED THIS SESSION - build on these, never ask for them again:',
      ...answered.map(({ thing, answer }) => `- ${thing.what}: they said "${shortly(answer)}"`),
    );
  }
  if (vague.length) {
    lines.push(
      'ASKED ONCE, ANSWERED WITHOUT ANYTHING SPECIFIC - you may ask ONCE more, for the specific version (a number, a name, a date), and then leave it whatever comes back:',
      ...vague.map(({ thing, answer }) => `- ${thing.what}${answer ? `: they said "${shortly(answer)}"` : ''}`),
    );
  }
  if (leave.length) {
    lines.push(
      'LEAVE THESE. They were declined or have been asked twice. Do not ask again in any wording; they go to the report as open:',
      ...leave.map(({ thing, why }) => `- ${thing.what} (${why})`),
    );
  }
  return { notAsked, answered, vague, leave, block: lines.join('\n') };
}

/**
 * THE SPINE LINES IN A PACK: the quoted questions, in order, under a heading that names the spine.
 * Packs write them as `"What are you trying to expand ... ?"`, one per line.
 */
export function theSpineLinesIn(pack: string): AThingToCover[] {
  const lines = (pack ?? '').split('\n');
  const start = lines.findIndex((l) => /^THE SPINE\b/i.test(l.trim()));
  if (start < 0) return [];
  const out: AThingToCover[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^"(.+\?)"\s*$/.exec(lines[i].trim());
    if (!m) {
      if (out.length) break;
      continue;
    }
    out.push({ id: `spine-${out.length + 1}`, what: m[1] });
  }
  return out;
}

/**
 * WHERE THE SPINE IS, as a block. The pack says "skip any they have already answered"; the model
 * could not see which, so it started from the top. This says which.
 */
export function whereTheSpineIs(pack: string, turns: ATurnInSession[]): string {
  const spine = theSpineLinesIn(pack);
  if (!spine.length || !turns.some((t) => t.role === 'AI')) return '';
  const covered = whatThisSessionHasCovered(spine, turns);
  const { notAsked, block } = sayWhatHasBeenCovered(spine, covered);
  const next = notAsked[0];
  return [
    'WHERE THE SPINE IS THIS SESSION.',
    block,
    next
      ? `NEXT ON THE SPINE, when the current thread is done: "${next.what}"${notAsked.length > 1 ? ` (then ${notAsked.length - 1} more)` : ' (the last one)'}.`
      : 'THE SPINE IS DONE. Nothing on it is left to ask; close when the current thread is done.',
  ].filter(Boolean).join('\n');
}
