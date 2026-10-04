/**
 * THE ANCHOR SCENARIO: THE WEEKLY CHECK-IN FOR SOMEBODY ON THE LEAD'S TEAM.
 * (docs/anchor-scenario.md, sections 16 and 20; docs/anchor-scenario-plan.md, piece 15)
 *
 * THIS IS CONTEXT FOR THE MODEL, NOT A SCRIPT. The conversation stays model-led. Nothing here picks
 * the question, counts turns or checks a box. It tells the model what the scenario wants a week to
 * be, in the scenario's own words, gives it the person's own earlier words and commitments, and
 * leaves the choosing to the model, one question at a time.
 *
 * It is used only when the switch `release.anchorScenario` is on, the check-in was started from the
 * anchor link, the person is not the lead, and this is not their first session (their first is the
 * team baseline, a different piece). Otherwise it is not sent, and the prompt every other check-in
 * reads is byte for byte what it was.
 *
 * WHERE THE RUNNING WORDS COME FROM. As for the lead's conversation: seeded as the prompt
 * `anchor_participant_conversation`; the version stored in the database is the one that runs, and the
 * words in this file are the fallback. The reminder read last sits in the stored words after the
 * marker line, so a stored version is the whole of what runs.
 */

import type { PromptsService } from '../prompts';
import { howLongAgo } from '../assistant/what-you-told-me-before';
import { READ_THIS_LAST, splitWhatIsReadLast } from './the-anchor-lead-conversation';

export const ANCHOR_PARTICIPANT_PROMPT_KEY = 'anchor_participant_conversation';

/** What `Ground.startedFrom` holds for a check-in started from the anchor link. */
export const STARTED_FROM_THE_ANCHOR = 'anchor';

/** The weekly check-in: asks "what moved", brings back what they said they would do, and lightly connects it to the wider aim. */
export const THE_WEEKLY_CHECK_IN_GUIDANCE = `# The weekly check-in for somebody on the lead's team

This person was invited by their lead to a Groundwork that is about helping the team see the bigger picture and move in the same direction. They are not here to be tested, and this is not a course. Each week this conversation stays grounded in their actual work, not in a curriculum.

What you know about them is below, under "What this person has told you before": what they said last time and how long ago, what they said they would do, and what the group is trying to change. Use only that and what they tell you now. Never invent a fact, a name, a number or a reason.

Open with whatever fits, as one question in your own words. These are examples of what you might ask, not a list to work through:
- "What moved since we last spoke?"
- "You were going to speak to James. What happened?" Use this only when what they said they would do is listed below, and use their own words for it and the name they gave.
- "You mentioned the client wasn't clear about the next phase. Has that changed?" Use this only when they actually said something like it.
- "What's taking most of your attention now?"
Follow what they answer, one question at a time. Do not ask again the questions of their first conversation about their role, who they depend on and what makes the work difficult, unless what they say now needs it.

Take what they say as it is. If something they said they would do has not happened, ask what got in the way, as a plain question with no blame.

THE LIGHT CONNECTION. After they have told you about their work, you may connect it to the wider picture. Do this when it fits, and not in every turn. Say it in one plain sentence, as a fact about their work and what it touches, for example: "That connects the delay in delivery to the customer's renewal." Use only what is listed below under what the group is trying to change, and only when what they described really touches it. Then ask your one question. If nothing is listed there, or what they said does not touch it, say nothing about the wider picture. This is the step that helps them see what they had not connected, so keep it short and let them respond to it.

Never say what their work was good, great, smart or useful, and never say you are pleased. Say what happened and what it affected. Never say what their lead thinks of them or of anybody else.`;

/** The words read last. */
export const THE_WEEKLY_REMINDER = `# For this person, these come first

Ask exactly one question in this turn. Say back only what they told you, in their own words. Do not link their work to the wider aim unless it is listed under what the group is trying to change.`;

export const ANCHOR_PARTICIPANT_PROMPT = [THE_WEEKLY_CHECK_IN_GUIDANCE, READ_THIS_LAST, THE_WEEKLY_REMINDER].join('\n\n');

export type TheAnchorParticipantGuidance = { text: string; last: string; promptVersionId: string | null };

/** A check-in belongs to the anchor when it was started from the anchor link. */
export function aCheckInStartedFromTheAnchor(ground: { startedFrom?: string | null } | null | undefined): boolean {
  return ground?.startedFrom === STARTED_FROM_THE_ANCHOR;
}

/**
 * The guidance for somebody on the lead's team, or nothing. Nothing unless the switch is on, the
 * check-in was started from the anchor, the person is not the lead, and it is not their first session.
 */
export async function theAnchorParticipantGuidance(
  switchIsOn: () => Promise<boolean>,
  prompts: Pick<PromptsService, 'getActive'> | undefined,
  who: { ground: { startedFrom?: string | null } | null | undefined; isTheLead: boolean; sessionNumber: number },
): Promise<TheAnchorParticipantGuidance | null> {
  if (!aCheckInStartedFromTheAnchor(who.ground)) return null;
  if (who.isTheLead || who.sessionNumber < 2) return null;
  if (!(await switchIsOn())) return null;
  const stored = await prompts?.getActive(ANCHOR_PARTICIPANT_PROMPT_KEY).catch(() => null);
  const { main, last } = splitWhatIsReadLast(stored?.content ?? ANCHOR_PARTICIPANT_PROMPT);
  return { text: main, last, promptVersionId: stored?.id ?? null };
}

/** Everything that is read about the person's last week, ready to be told. */
export type WhatTheyToldYouBefore = {
  /** The last session they finished: when, and what their record holds from it, in their own words. */
  lastSession: { finishedAt: Date; said: string[] } | null;
  /** What they said they would do, still open, in their own words. */
  theySaidTheyWould: { text: string; whenSaid: string | null }[];
  /** The aims of the group this person has been told about. */
  whatTheGroupIsTryingToChange: string[];
};

/**
 * WHAT THIS PERSON HAS TOLD YOU BEFORE, in the plain way a colleague would remember it: how long ago, in their words.
 * The words are theirs and are not changed. Empty when there is nothing to say.
 */
export function whatTheyToldYouBefore(w: WhatTheyToldYouBefore, now: Date): string {
  const parts: string[] = [];
  if (w.lastSession && w.lastSession.said.length) {
    parts.push(`Last time they finished a check-in was ${howLongAgo(w.lastSession.finishedAt, now)}. What their record holds from it, in their words:\n${w.lastSession.said.map((s) => `- ${s}`).join('\n')}`);
  }
  if (w.theySaidTheyWould.length) {
    parts.push(`What they said they would do, and have not yet been asked about:\n${w.theySaidTheyWould.map((c) => `- ${c.text}${c.whenSaid ? ` (${c.whenSaid})` : ''}`).join('\n')}`);
  }
  parts.push(w.whatTheGroupIsTryingToChange.length
    ? `What the group is trying to change, as this person has been told it:\n${w.whatTheGroupIsTryingToChange.map((a) => `- ${a}`).join('\n')}`
    : 'What the group is trying to change: nothing has been told to this person yet, so do not connect their work to a wider aim.');
  return `# What this person has told you before\n\n${parts.join('\n\n')}`;
}
