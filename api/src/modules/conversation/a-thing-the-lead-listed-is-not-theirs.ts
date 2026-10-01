/**
 * "WE'RE HERE TO TALK ABOUT WHAT HAS HAPPENED WITH YOUR GRINDING MACHINE." SHE HAD A FREEZER.
 *
 * Read in the 1 October review, the loans scenario: three borrowers were each told they had received the
 * wrong asset. The lead's brief lists what the programme gave out ("a grinding machine, a freezer, a
 * tricycle, a borehole pump"). A borrower's own session is not handed the lead's words about them, so the
 * model cannot know which one is theirs, and it picked the first from the list and said it as theirs.
 *
 * THE RULE. Where the brief lists several things, saying one of them to a person AS THEIRS (a sentence
 * addressed to "you" or "your" that names it) is a claim about them that nobody gave. It stands only where
 * the person said that thing themselves. Otherwise the sentence is cut. If that leaves the turn asking
 * nothing, the product asks the plain open question instead, which claims nothing.
 */

import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked } from './nobody-is-left-looking-at-a-paragraph';

/** The things in a list of three or more "a X, a Y, a Z" in the brief. */
export function thingsTheBriefLists(brief: string | null | undefined): string[] {
  const out: string[] = [];
  const item = '(?:an?|the)\\s+[a-z][a-z-]*(?:\\s+[a-z][a-z-]*){0,2}?(?=\\s*[,.;:!?]|\\s+(?:and|or)\\s|\\s*$)';
  const join = '(?:\\s*,\\s*(?:and\\s+|or\\s+)?|\\s+(?:and|or)\\s+)';
  const run = new RegExp(`${item}(?:${join}${item}){2,}`, 'gi');
  for (const m of (brief ?? '').matchAll(run)) {
    for (const part of m[0].split(new RegExp(join, 'i'))) {
      const thing = part.replace(/^(?:an?|the)\s+/i, '').trim().toLowerCase();
      if (thing.length >= 3) out.push(thing);
    }
  }
  return [...new Set(out)];
}

const ADDRESSED_TO_THEM = /\b(?:you|your|you're|you've)\b/i;

export const WHAT_IS_ASKED_INSTEAD = 'What has happened for you since this began?';

export type ListedThingCut = { text: string; cut: string[] };

export function withoutAThingTheLeadListedAsTheirs(reply: string, brief: string | null | undefined, theirWords: string[], earlierAiTurns: string[] = []): ListedThingCut {
  const listed = thingsTheBriefLists(brief);
  if (!listed.length) return { text: reply, cut: [] };
  const said = theirWords.join(' ').toLowerCase();
  const notTheirs = listed.filter((t) => !said.includes(t));
  if (!notTheirs.length) return { text: reply, cut: [] };
  const out: string[] = [];
  const cut: string[] = [];
  for (const s of intoSentences(reply)) {
    const lower = s.toLowerCase();
    if (ADDRESSED_TO_THEM.test(s) && notTheirs.some((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`).test(lower))) {
      cut.push(s.trim());
      continue;
    }
    out.push(s);
  }
  if (!cut.length) return { text: reply, cut: [] };
  const kept = out.join('').trim();
  /* A turn that asked something and now asks nothing asks the plain open question, which claims nothing. */
  const asked = cut.some((c) => /\?/.test(c));
  if (/\?/.test(kept) || !(asked || !kept)) return { text: kept, cut };
  /*
   * NEVER THE SAME ONE TWICE IN A CHECK-IN. Hauwa (re-d, loans, 1 October 2026) was asked it as her
   * opener and then twice more. Where it has been asked, the next plain question not yet asked is used;
   * where every one has, what is left of the turn stands, and a turn is never left empty.
   */
  const instead = aQuestionNotYetAsked(WHAT_IS_ASKED_INSTEAD, earlierAiTurns);
  const text = instead ? `${kept} ${instead}`.trim() : kept || WHAT_IS_ASKED_INSTEAD;
  return { text, cut };
}
