import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from './the-anchor-weekly-check-in';
import type { TheIdeaOfferInTheCheckIn, TheIdeasFromYourTeam } from '../entry/the-anchor-served-shapes';
import { whatItSaysTheySaid } from './a-promise-they-never-made';

/**
 * IDEAS FROM THE TEAM (anchor piece 19; section 18; decisions 96 item 10 and 105 item 5).
 *
 * When a person in an anchor check-in says something that is a concrete idea, Groundwork says it back in the spec's
 * words, "That sounds like a concrete idea. Want me to capture it for the team?", and only their yes captures it.
 * "Not now", or simply carrying on, leaves nothing behind. A captured idea is seen by everyone in that check-in, with
 * "Raised by <name>".
 *
 * WHERE IT IS KEPT. No idea table exists, so an idea is a work item of kind `idea` on its check-in, and the offer
 * waiting for a yes is one of kind `idea-offered`. Neither kind belongs to any kind of work's record sections
 * (the-kind-of-work.ts filters by kind), so neither ever shows as a deal, a ticket or a task. No migration.
 *
 * WHO SPOTS IT. A small model call, after the person's turn, with its own prompt under its own stored key
 * (`anchor_idea_spotting`, read through `getActive` with the text below as the fallback). The idea it returns must be
 * the person's own words, found in what they wrote; anything else is not offered. Only for a check-in started from
 * the anchor link, only while the anchor switch is on, so no other check-in calls the model for this.
 */
export const IDEA_SPOTTING_KEY = 'anchor_idea_spotting';

export const THE_IDEA_SPOTTING_PROMPT = [
  'You are reading one message a person wrote in their weekly check-in with their team.',
  '',
  'Say whether it holds a CONCRETE IDEA: a specific thing the team could do, try, change or build, that the person is putting forward. A complaint, a report of what happened, a question, a feeling, or a vague wish ("we should communicate better") is not one. "We could send the price list to every shop on Monday so they can reorder without calling" is one.',
  '',
  'These are not ideas: what the person works on, what they are responsible for, what success looks like to them, a goal or a target, who they depend on, a description of a problem, or what they think their lead worries about. An idea is something new that the person proposes, and it usually sounds like "we could", "we should", "what if", "maybe we", "it would help if" or "I suggest". If it only describes how things are or what the person wants to be true, it is not an idea.',
  '',
  'Copy the idea exactly from the message, as one sentence or part of one, in the person\'s own words. Never rewrite it, shorten it with your own words, or add to it. Say it holds none when it holds none, or when you are not sure. An idea offered to the team that is not one is worse than one missed.',
].join('\n');

export const THE_IDEA_SCHEMA = {
  name: 'emit_an_idea',
  description: 'Whether the message holds a concrete idea, and the idea in the person\'s own words.',
  input_schema: {
    type: 'object',
    properties: {
      isAConcreteIdea: { type: 'boolean' },
      idea: { type: 'string', description: 'The idea, copied exactly from the message. Empty when there is none.' },
    },
    required: ['isAConcreteIdea'],
  },
};

export const THE_IDEA_QUESTION = 'That sounds like a concrete idea. Want me to capture it for the team?';
export const WHO_WILL_SEE_IT = 'If you say yes, everyone in this check-in will see it, with your name.';
export const YES_CAPTURE_IT = 'Yes, capture it';
export const NOT_NOW = 'Not now';
export const IT_IS_CAPTURED = 'I have captured it for the team. Everyone in this check-in will see it, with your name.';
export const NO_IDEA_CAPTURED_YET = 'No idea from your team has been captured yet.';

const squash = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase();
/*
 * ONLY THE BUTTON'S OWN ANSWER CAPTURES (review of piece 19). A free-text yes is about something else as often as not:
 * "Yes, I sent the deck to Naivas" answers the check-in's question, not the offer. So only the exact answer the screen
 * sends for the offer, "Yes, capture it", captures; anything else leaves nothing behind.
 */
const isTheYes = (m: string) => squash(m).replace(/[.!]+$/, '') === squash(YES_CAPTURE_IT);
const isTheNo = (m: string) => /^\s*(not now|no\b|nope)/i.test(m);

/** The idea, only if it is the person's own words, found in what they wrote. */
export function theirOwnIdea(message: string, idea: string | null | undefined): string | null {
  const said = String(idea ?? '').trim().replace(/^["'“‘]|["'”’]$/g, '').replace(/[.!?]+$/, '');
  if (said.split(/\s+/).length < 4 || said.length > 240) return null;
  return squash(message).includes(squash(said)) ? said : null;
}

export function theOffer(idea: string): TheIdeaOfferInTheCheckIn {
  return { idea, question: THE_IDEA_QUESTION, whoWillSeeIt: WHO_WILL_SEE_IT, yes: YES_CAPTURE_IT, no: NOT_NOW };
}

export interface IdeaDeps {
  prisma: any;
  anthropic: { extract: <T>(system: string, history: { role: string; content: string }[], tool: any, options?: any) => Promise<T | null> };
  prompts?: { getActive?: (key: string) => Promise<{ id: string; content: string }> };
}

/**
 * THE READING THAT SPOTS AN IDEA, ON ITS OWN: the idea in what the person just wrote, in their own words, with the stored version that read it, or null.
 * Used after their turn, and by the team baseline's close, which waits for the offer rather than say goodbye over an idea.
 */
export async function aNewIdeaIn(deps: IdeaDeps, message: string): Promise<{ idea: string; stored: { id: string; content: string } | null } | null> {
  const stored = deps.prompts?.getActive ? await deps.prompts.getActive(IDEA_SPOTTING_KEY).catch(() => null) : null;
  const read = await deps.anthropic.extract<{ isAConcreteIdea?: boolean; idea?: string }>(
    stored?.content ?? THE_IDEA_SPOTTING_PROMPT,
    [{ role: 'user', content: message }],
    THE_IDEA_SCHEMA,
    { fast: true },
  ).catch(() => null);
  if (!read?.isAConcreteIdea) return null;
  const idea = theirOwnIdea(message, read.idea);
  return idea ? { idea, stored } : null;
}

/**
 * After the person's turn: their yes captures the offer that was waiting, their no or anything else leaves nothing
 * behind, and a new message may bring a new offer. Never throws; the check-in never fails over an idea.
 */
export async function afterTheirTurn(
  deps: IdeaDeps,
  a: { groundId: string; startedFrom?: string | null; participantId: string | null; message: string; sessionComplete?: boolean },
): Promise<{ ideaOffer?: TheIdeaOfferInTheCheckIn; sayFirst?: string; promptVersionId?: string | null }> {
  try {
    if (a.startedFrom !== STARTED_FROM_THE_ANCHOR || !a.participantId) return {};
    if (!(await theAnchorScenarioIsOn(deps.prisma))) return {};
    const waiting = ((await deps.prisma.workItem?.findMany?.({ where: { groundId: a.groundId, kind: 'idea-offered', ownerParticipantId: a.participantId } })?.catch?.(() => [])) ?? []) as any[];
    if (waiting.length) {
      if (isTheYes(a.message)) {
        await deps.prisma.workItem.update({ where: { id: waiting[0].id }, data: { kind: 'idea' } });
        for (const w of waiting.slice(1)) await deps.prisma.workItem.delete({ where: { id: w.id } }).catch(() => undefined);
        return { sayFirst: IT_IS_CAPTURED };
      }
      /* "Not now", or carrying on: nothing is kept. */
      for (const w of waiting) await deps.prisma.workItem.delete({ where: { id: w.id } }).catch(() => undefined);
      if (isTheNo(a.message)) return {};
    }
    if (a.sessionComplete) return {};
    const spotted = await aNewIdeaIn(deps, a.message);
    if (!spotted) return {};
    const { idea, stored } = spotted;
    await deps.prisma.workItem.create({ data: { groundId: a.groundId, kind: 'idea-offered', name: idea, ownerParticipantId: a.participantId, fields: { promptVersionId: stored?.id ?? null } } });
    return { ideaOffer: theOffer(idea), promptVersionId: stored?.id ?? null };
  } catch {
    return {};
  }
}

/** The idea as a title: its own words, with a capital letter to start. The stored words are never changed. */
export const aTitle = (t: string): string => {
  const x = (t ?? '').trim();
  return x ? x[0].toUpperCase() + x.slice(1) : x;
};

/**
 * "Ideas from your team", for a reader in that check-in (decision 96 item 10): every captured idea, "Raised by <name>",
 * and "Raised by you." for the reader's own. `nameOf` is the board's own naming for this reader.
 */
export function theIdeasFromYourTeam(
  ideas: { id: string; name: string; ownerParticipantId: string | null }[],
  readerParticipantId: string | null,
  nameOf: (participantId: string) => string | null,
): TheIdeasFromYourTeam {
  return {
    heading: 'Ideas from your team',
    ideas: ideas.map((i) => {
      const who = i.ownerParticipantId && i.ownerParticipantId === readerParticipantId ? 'you' : (i.ownerParticipantId ? nameOf(i.ownerParticipantId) : null) ?? 'a colleague';
      return { id: i.id, title: aTitle(i.name), raisedBy: `Raised by ${who}.`, similarNeedsSentence: null };
    }),
    whenThereAreNone: NO_IDEA_CAPTURED_YET,
  };
}

/*
 * AN IDEA IS NEVER READ BACK AS A PROMISE (review of piece 19). Sunday offered "we could send the updated price list to
 * every shop on Monday morning", said yes to "Yes, capture it", and the reply went on "You said you will send the updated
 * price list to every shop on Monday morning." The net for commitments let it stand, because "we could" reads as
 * somebody committing. An idea is something the team might do, owned by nobody, so a sentence that reads it back as
 * theirs to do is cut. It stands only where they also said, in their own words and apart from the idea, that they
 * will do it ("I will send it", "I'll do it on Monday").
 */
const A_READ_BACK = /\b(?:you(?:'ll| will| would| are going to|'re going to| shall| plan to| intend to)|(?:committed|promised|agreed|planned|intended)\s+to|that you (?:will|would|are going to))\s+(?:also\s+|then\s+|definitely\s+|still\s+)?(?:be\s+)?([a-z][a-z'-]+)/i;
const I_WILL = /\b(?:I(?:'ll| will| shall| am going to|'m going to)|I(?:'m| am) (?:sending|doing|taking|going))\b/i;
const NOTHING_WORDS = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'they', 'their', 'them', 'have', 'been', 'will', 'would', 'could', 'should', 'about', 'said', 'also', 'into', 'then', 'what', 'when', 'some', 'more', 'every', 'each']);
const stem = (w: string) => w.toLowerCase().replace(/(?:ing|ed|es|s|e)$/, '').replace(/(.)\1$/, '$1');
const carriersOf = (t: string) => (t.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter((w) => !NOTHING_WORDS.has(w)).map(stem);

function itRestatesTheIdea(sentence: string, idea: string, verb: string): boolean {
  const ideaWords = new Set(carriersOf(idea));
  if (!ideaWords.has(verb)) return false;
  const shared = new Set(carriersOf(sentence).filter((w) => ideaWords.has(w)));
  return shared.size >= 3;
}

/** The sentences of a reply that read one of this person's ideas back to them as a promise of theirs. */
export function anIdeaReadBackAsAPromise(reply: string, theirIdeas: string[], theirWords: string[]): string[] {
  const ideas = theirIdeas.map((i) => String(i ?? '').trim()).filter(Boolean);
  if (!ideas.length || !reply) return [];
  /* Their own "I will", with the idea taken out of what they wrote, so the idea itself never counts as their promise. */
  const theirOwnPromises = theirWords
    .map((w) => ideas.reduce((t, i) => t.split(new RegExp(i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig')).join(' '), String(w ?? '')))
    .flatMap((w) => w.split(/(?<=[.!?])\s+|\n+/))
    .filter((c) => I_WILL.test(c));
  const out: string[] = [];
  for (const sentence of whatItSaysTheySaid(reply)) {
    const m = A_READ_BACK.exec(sentence) ?? /^(?:so |and )?you(?:'ll)?\s+(?:will\s+)?([a-z][a-z'-]+)/i.exec(sentence);
    if (!m) continue;
    const verb = stem(m[1]);
    if (!ideas.some((i) => itRestatesTheIdea(sentence, i, verb))) continue;
    if (theirOwnPromises.some((c) => carriersOf(c).includes(verb))) continue;
    out.push(sentence);
  }
  return out;
}

/*
 * ONCE IT IS CAPTURED, NOTHING ASKS WHAT TO CAPTURE (release walk, 5 October). After "Yes, capture it" the reply said
 * "I have captured it for the team." and the model's own turn went on "Capture what, specifically?". The idea is
 * already captured, in their words, so a sentence of the model's that asks about capturing is taken off. Read-side
 * and narrow: only on the turn that captured, and only sentences about capturing.
 */
/* And how Groundwork feels about it: "I'm glad you found this helpful" was said after a capture, to somebody who had said nothing of the kind. */
const ASKS_ABOUT_CAPTURING = /\bcaptur(?:e|ed|es|ing)\b/i;
/** A sentence that is nothing but the feeling, and never one that asks something. */
const ONLY_THE_FEELING = /^\s*(?:I(?:'m| am)|we(?:'re| are)) (?:so )?(?:glad|pleased|happy|delighted)\b[^?]*[.!]\s*$/i;
const THE_FEELING_ABOUT_WHAT_THEY_SAID = /\b(?:to hear|that you raised|you raised|you told|you said|you mentioned)\b/i;
export function withoutAskingWhatToCapture(reply: string): { text: string; cut: string[] } {
  const cut: string[] = [];
  const paragraphs = String(reply ?? '').split(/\n{2,}/).map((p) => {
    const sentences = p.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g) ?? [p];
    return sentences.filter((x) => {
      const hit = ASKS_ABOUT_CAPTURING.test(x) || (ONLY_THE_FEELING.test(x) && !THE_FEELING_ABOUT_WHAT_THEY_SAID.test(x));
      if (hit) cut.push(x.trim());
      return !hit;
    }).join('').trim();
  });
  return { text: paragraphs.filter(Boolean).join('\n\n'), cut };
}
