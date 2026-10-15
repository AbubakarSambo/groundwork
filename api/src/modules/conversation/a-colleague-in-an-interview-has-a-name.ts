/**
 * A COLLEAGUE IN AN INTERVIEW IS CALLED WHAT THE PERSON CALLED THEM, AND NEVER "PARTICIPANT B".
 *
 * Two different jobs were being done by one function, and the conversation got the wrong one.
 *
 * A REPORT is written once and read by several people, so it is stored with no names in it at all
 * and the names are swapped back in per reader. "Participant B" is exactly right there: short,
 * unique, and a clean string to replace with whichever name that reader is entitled to. That
 * machinery lives in `party-labels.ts` and it stays exactly as it is. Nothing here changes what a
 * stored report holds.
 *
 * AN INTERVIEW is a conversation with ONE person, and the prompt behind it is not a document
 * anybody else will read. When it started using report labels, the engine was told this:
 *
 *   - "Finance sign-off on the six units" on Participant B, 21 days old, nobody has escalated it.
 *
 * where before it had been told a role and a target. "Participant B" is not something a question
 * can be built out of. The engine cannot ask "have you been back to them about it" and mean
 * anybody, and it cannot weigh who that is against what is stuck, so it asked something general
 * instead. The measurable cost was the specific questions: NEW_HIRE went from 14 and 12 asks for a
 * number, a date or a name down to 9, 5 and 8, over an identical 69 turns.
 *
 * SO WHAT SHOULD IT SAY? Not simply "the person's name": in an evaluation check-in - a PIP, a
 * recognition round, a contract renewal - and in a cohort, colleagues stay unnamed to the person
 * being reviewed. Giving the engine a name means the engine may say it, and the check-in that
 * withholds a colleague's name from the report must not hand it over in the next question. That
 * is a privacy rule, not a preference.
 *
 * THE ORDER, DECIDED BY HAFSAH, 26 SEPTEMBER 2026:
 *
 *  1. THE NAME THIS PERSON USED THEMSELVES. If they said "I am waiting on Ngozi", the interview
 *     says Ngozi. They said it out loud, so saying it back reveals nothing to them that they did
 *     not already know. In the record this is the free text on the row - what they actually called
 *     whoever they meant - and it is the FIRST choice, not a fallback.
 *  2. OTHERWISE A REAL NAME, BUT ONLY WHERE THIS CHECK-IN NAMES PEOPLE TO EACH OTHER. That is the
 *     same rule the report and the board already apply - see `peersAreNamedOn`. Ordinary work:
 *     fine. An evaluation or a cohort: not fine.
 *  3. OTHERWISE PLAIN WORDS. "A colleague", then "another colleague" and "a third colleague" where there
 *     are several, used the same way for the same person everywhere - the wording the reports
 *     already use, taken from the same function so the two cannot drift. Never a job title, never
 *     a detail that would give somebody away, and never a letter.
 *
 * AN ADDRESS IS NEVER USED. `displayName` only returns one when it is explicitly told the address
 * is fair to show, and nothing in this file tells it that: a prompt is not a reader with
 * permissions, and an interview has no business reciting somebody's email at anybody.
 */

import {
  displayName,
  labelsForParties,
  plainWordsForTheUnnameable,
  type LabelParty,
} from '../reports/party-labels';

/**
 * A POSITIONAL LABEL THAT SOMEHOW REACHED THE RECORD IS NOT WHAT ANYBODY CALLED ANYBODY.
 *
 * The free text on a dependency row is meant to be the person's own words, but an older extractor
 * could write a report label into it, and a stored row outlives the code that wrote it. Letting
 * one through would put back the exact string this whole change exists to remove, so it is checked
 * rather than assumed.
 */
const A_SLOT_IN_A_TEMPLATE = /^(?:the\s+)?(?:participant|party|person|initiator|lead)\s*[a-z0-9]*$/i;

function theyReallyCalledThem(said: string | null | undefined): string | null {
  const t = (said ?? '').trim();
  if (!t) return null;
  if (A_SLOT_IN_A_TEMPLATE.test(t)) return null;
  /* An address somebody typed is not what anybody is called (week 12c). */
  if (/\S+@\S+\.\S+/.test(t)) return null;
  return t;
}

/** Their actual name, or nothing. Never an address, and never a letter. */
export function theirName(p: LabelParty | null | undefined): string | null {
  if (!p) return null;
  return displayName(p as LabelParty) ?? null;
}

/**
 * Plain, non-identifying words for everybody on this check-in except the person being interviewed.
 *
 * Delegates to the reports' own wording so a colleague who is "a colleague" in the report is
 * "a colleague" in the conversation as well. The lead comes back as "your lead", which is not a
 * disclosure: the person being interviewed already knows who set their check-in up.
 */
export function plainWordsForEveryoneElse(
  parties: readonly LabelParty[] | null | undefined,
  viewerParticipantId: string | null | undefined,
): Map<string, string> {
  const out = new Map<string, string>();
  const list = [...(parties ?? [])];
  if (!list.length) return out;
  let labels: Map<string, string>;
  try {
    labels = labelsForParties(list as LabelParty[]);
  } catch {
    /* A collision loses the report for this ground; it must not also lose the conversation. */
    for (const p of list) if (p?.id && p.id !== viewerParticipantId) out.set(p.id, 'a colleague');
    return out;
  }
  const viewerLabel = viewerParticipantId ? labels.get(viewerParticipantId) ?? null : null;
  const phraseByLabel = plainWordsForTheUnnameable([...labels.values()], new Map(), viewerLabel);
  for (const [id, label] of labels) {
    const phrase = phraseByLabel.get(label);
    if (phrase) out.set(id, phrase);
  }
  return out;
}

/**
 * What the interview may call somebody, under the three rules at the top of this file.
 *
 * `speakerCalledThem` is what the person being interviewed said themselves, where the record kept
 * it. `fallback` is what the caller wants said about somebody nothing at all is known about; it is
 * never a positional label.
 */
export function whatToCallThem(
  {
    person,
    speakerCalledThem,
    peersMayBeNamed,
    plainWords,
    fallback = null,
  }: {
    person?: LabelParty | null;
    speakerCalledThem?: string | null;
    peersMayBeNamed: boolean;
    plainWords?: Map<string, string> | null;
    fallback?: string | null;
  },
): string | null {
  /* 1. Their own words for whoever they meant. */
  const theirs = theyReallyCalledThem(speakerCalledThem);
  if (theirs) return theirs;

  /* 2. A real name, where this check-in names people to each other. A name only: the role on the
        row is the lead's own description of the person, which can hold the lead's private words,
        so it never stands in for one (request 36, 27 September 2026). */
  if (peersMayBeNamed) {
    const named = theirName(person);
    if (named) return named;
  }

  /* 3. Plain words that give nobody away. */
  const plain = person?.id ? plainWords?.get(person.id) : null;
  if (plain) return plain;
  if (person) return 'a colleague';
  return fallback;
}

/** Everybody on the ground, by id, so a caller can look one up without a second read. */
export function whoIsOnThisGround(
  parties: readonly LabelParty[] | null | undefined,
): Map<string, LabelParty> {
  const byId = new Map<string, LabelParty>();
  for (const p of parties ?? []) if (p?.id) byId.set(p.id, p);
  return byId;
}
