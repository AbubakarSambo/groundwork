/**
 * A CLIENT IS NOT A COLLEAGUE. (W3)
 *
 * From Hafsah's own walkthrough. Her ground is about two of her reports not
 * delivering client setups. Her private report offered four people to add:
 *
 *   Daisy                  a direct report          correct
 *   Duke                   a direct report          correct
 *   Microchip Solutions    a client                 one click from an invitation
 *   Mass General           a client                 one click from an invitation
 *
 * Each with a "+ Add them" button next to it. Adding a client to a ground about
 * your team's delivery would send that client an invitation to give their account
 * of your team's performance, and it takes one click by somebody skimming.
 *
 * The extractor is not wrong to have noticed them. Both clients are genuinely
 * part of the story, and dropping them loses real material. What is wrong is that
 * one list is doing two jobs: "who came up" and "who you could invite" are
 * different questions, and only the first one is safe to answer generously.
 *
 * SO THE FIX IS TO SPLIT THE LIST, NOT TO FILTER IT. Everything the extractor
 * found stays on the page. Only the button moves.
 *
 * AND THE SIGNAL IS THE CONTEXT, NOT THE NAME. "Mass General" reads exactly like a
 * person's name and "Daisy" reads exactly like a flower. What separates them is
 * the sentence the extractor already wrote next to each: one is described as a
 * client whose business was secured, the other as a direct report who is not
 * delivering. The product knows; it just was not asked.
 */

export interface Mentioned {
  name: string;
  context: string;
}

/**
 * Whether the extractor's own description names somebody as being outside the
 * organisation.
 *
 * Deliberately one-directional: this decides who is NOT invitable, and everybody
 * else stays invitable. The failure it guards against is a client receiving an
 * invitation; the cost of being wrong the other way is a lead typing an email
 * address themselves.
 */
const OUTSIDER = '(?:client|customer|account|prospect|vendor|supplier|agency|contractor|company|business|organisation|organization|firm)';

/**
 * A SCAN FOR THESE WORDS ANYWHERE IN THE SENTENCE DOES NOT WORK, and my first
 * version was exactly that. Daisy's description is
 *
 *   "Mentioned as a direct report who is not delivering on CLIENT setup."
 *
 * so the person the ground is actually about got classified as an outsider by the
 * word describing her work. The signal is not which words appear, it is what the
 * sentence says this person IS - which means the noun has to be in the position
 * where somebody is being named as one.
 */
const OUTSIDE_THE_ORGANISATION = [
  // "A client whose business was secured..." - the description opens by naming them as one.
  new RegExp(`^(?:a|an|the)\\s+(?:\\w+\\s+)?${OUTSIDER}\\b`, 'i'),
  // "...is a client", "mentioned as the customer", "was a vendor on this".
  new RegExp(`\\b(?:is|was|as|being)\\s+(?:a|an|the)\\s+(?:\\w+\\s+)?${OUTSIDER}\\b`, 'i'),
  // The two that name the relationship without the noun.
  /\bwhose business\b/i,
  /\bthey signed (?:up|the contract)\b/i,
];

export function isOutsideTheOrganisation(m: Mentioned): string | null {
  for (const p of OUTSIDE_THE_ORGANISATION) {
    const hit = m.context?.match(p);
    if (hit) return hit[0];
  }
  return null;
}

export interface SplitMentions {
  /** People a lead could reasonably invite. The only list with a button. */
  couldBeAdded: Mentioned[];
  /** Everybody else who came up. Shown, named, and not invitable. */
  alsoCameUp: Mentioned[];
  /** One line, only when there is something in the second list. */
  note: string | null;
}

export function splitMentions(mentioned: Mentioned[]): SplitMentions {
  const couldBeAdded: Mentioned[] = [];
  const alsoCameUp: Mentioned[] = [];

  for (const m of mentioned) {
    (isOutsideTheOrganisation(m) ? alsoCameUp : couldBeAdded).push(m);
  }

  return {
    couldBeAdded,
    alsoCameUp,
    note: alsoCameUp.length
      ? 'These came up in what you said and are part of the picture. They are not offered as people to add, because they look like they are outside your organisation - and an invitation asks somebody to give their own account of this work.'
      : null,
  };
}
