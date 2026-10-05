import { theAnchorScenarioIsOn } from '../admin/what-is-hidden-at-release';
import { STARTED_FROM_THE_ANCHOR } from './the-anchor-weekly-check-in';
import type { TheIdeaOfferInTheCheckIn, TheIdeasFromYourTeam } from '../entry/the-anchor-served-shapes';

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
const isTheYes = (m: string) => /^\s*(yes|yeah|yep|sure|ok|okay)\b/i.test(m) || squash(m) === squash(YES_CAPTURE_IT);
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
    const stored = deps.prompts?.getActive ? await deps.prompts.getActive(IDEA_SPOTTING_KEY).catch(() => null) : null;
    const read = await deps.anthropic.extract<{ isAConcreteIdea?: boolean; idea?: string }>(
      stored?.content ?? THE_IDEA_SPOTTING_PROMPT,
      [{ role: 'user', content: a.message }],
      THE_IDEA_SCHEMA,
      { fast: true },
    ).catch(() => null);
    if (!read?.isAConcreteIdea) return {};
    const idea = theirOwnIdea(a.message, read.idea);
    if (!idea) return {};
    await deps.prisma.workItem.create({ data: { groundId: a.groundId, kind: 'idea-offered', name: idea, ownerParticipantId: a.participantId, fields: { promptVersionId: stored?.id ?? null } } });
    return { ideaOffer: theOffer(idea), promptVersionId: stored?.id ?? null };
  } catch {
    return {};
  }
}

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
      return { id: i.id, title: i.name, raisedBy: `Raised by ${who}.`, similarNeedsSentence: null };
    }),
    whenThereAreNone: NO_IDEA_CAPTURED_YET,
  };
}
