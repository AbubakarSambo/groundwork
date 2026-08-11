/**
 * A LEAD CAN STATE A TARGET THEY GAVE. A LEAD CANNOT STATE A VERDICT ON ACTIONS.
 *
 * The lead can attach private context about a participant, and the first version of
 * this file treated all of it the same way: if a finding's words came from the note
 * and from nobody's own account, it was dropped. Hafsah caught that immediately,
 * and a probe against the real function proved it was backwards in BOTH directions:
 *
 *   "own one client relationship end to end by month three"    dropped
 *   "he has been slow to take ownership"                        kept
 *
 * The first is a FACT about what the lead communicated. The second is a verdict on
 * how somebody is doing. My rule dropped the fact and kept the opinion.
 *
 * WHY REQUIRING CORROBORATION FOR A TARGET IS INCOHERENT. The lead is the only
 * possible source for what the lead said. Nobody else can confirm the target they
 * were given - that is what makes it a target rather than a shared observation. So
 * asking a party's account to corroborate it is asking the wrong question, and the
 * answer is always no.
 *
 * G22 AND G13 ALREADY SAY THIS. "I would keep him if he owns a client end to end by
 * month three", recorded in week one, is the standard the week-twelve decision is
 * measured against, and the whole point is that the lead set it. What G13 adds is
 * the honest part: a target carries whether the person has SEEN it, because reading
 * somebody against a target they never saw is the definition of an unfair review.
 *
 * SO THE TEST IS WHAT KIND OF THING THE SENTENCE IS, not where its words came from:
 *
 *   a target the lead set          kept, with its provenance attached
 *   a read on how somebody is      needs a party's own account, or it goes
 *   anything else                  left alone
 */

import { touches } from './what-the-record-actually-holds';
import { aboutAPerson } from '../../common/is-this-about-a-person';

export interface LeadNote {
  participantId: string | null;
  text: string;
}

export interface PartyEntry {
  text: string;
}

/**
 * The vocabulary of a target somebody was given.
 *
 * All of it is about an act of communication or an arrangement - something said,
 * asked, agreed or dated. None of it describes a person, which is exactly the
 * distinction being drawn.
 */
const A_TARGET_THAT_WAS_SET = [
  /\b(?:told|asked|agreed|said to|set|gave|briefed|explained to)\b/i,
  /\b(?:expectation|expected to|objective|goal|target|remit|brief|scope)\b/i,
  /\bby (?:month|week|quarter|day|the end of)\b/i,
  /\bsupposed to\b/i,
  /\bthe (?:job|role) (?:is|was)\b/i,
  /\bresponsible for\b/i,
  /\bowns?\b/i,
];

/**
 * Is this sentence a target that was set, or a read on how somebody is doing?
 *
 * The verdict test comes first and wins ties, because the dangerous sentence is the
 * one that carries both - "I told him to take ownership and he has been slow to" is
 * a target with a verdict stapled to it, and the verdict half is what must not be
 * stated as established.
 */
export function whatKindOfNote(text: string): 'a target that was set' | 'a read on a person' | 'neither' {
  const verdict = aboutAPerson(text, [
    'quality of a person', 'character', 'capability', 'grade', 'progress on a person',
  ]);
  if (verdict) return 'a read on a person';
  if (A_TARGET_THAT_WAS_SET.some((p) => p.test(text))) return 'a target that was set';
  return 'neither';
}

/**
 * What this finding rests on, and whether that is enough for what it is.
 *
 * Four states, and the third is the one this file exists for.
 */
export function whatThisRestsOn(
  finding: string,
  leadNotes: LeadNote[],
  partyEntries: PartyEntry[],
):
  | 'the record'
  | 'a target the lead set'
  | 'the lead alone, and it is a read on a person'
  | 'neither, so nothing to check' {
  const fromLead = leadNotes.some((n) => touches(finding, n.text));
  const fromParties = partyEntries.some((e) => touches(finding, e.text));

  if (fromParties) return 'the record';
  if (!fromLead) return 'neither, so nothing to check';

  // It came from the lead and nowhere else. Now the question that matters: is it a
  // thing they GAVE, or a thing they THINK?
  return whatKindOfNote(finding) === 'a read on a person'
    ? 'the lead alone, and it is a read on a person'
    : 'a target the lead set';
}

/**
 * G13's honest half, attached to a target rather than assumed about it.
 *
 * A target the lead set is legitimate and belongs in the report. Whether the person
 * ever saw it is a different question, and a report that does not say which one it
 * is has quietly turned a proposal into a commitment.
 */
export function provenanceOfATarget(seenBySubject: boolean | null | undefined): string {
  if (seenBySubject === true) {
    return 'This is the standard the lead set, and the person it is about has seen it.';
  }
  if (seenBySubject === false) {
    return 'This is the standard the lead set. There is no record of the person it is about having seen it, so read it as what was expected rather than as what was agreed.';
  }
  return 'This is the standard the lead set. Nobody has recorded whether the person it is about has seen it.';
}

/**
 * Strip only the findings that are a lead's read on a person with nothing behind
 * them.
 *
 * Takes a reader function rather than a fixed shape, because agreements,
 * divergences and gaps are all different objects and all need the same test - and a
 * version of this that only knew about divergences would be a wall with a door in
 * it.
 */
export function withoutWhatOnlyTheLeadSaid<T>(
  items: T[],
  textOf: (item: T) => string,
  leadNotes: LeadNote[],
  partyEntries: PartyEntry[],
): { kept: T[]; dropped: { item: T; text: string }[] } {
  if (!leadNotes.length) return { kept: items, dropped: [] };

  const kept: T[] = [];
  const dropped: { item: T; text: string }[] = [];
  for (const item of items) {
    const text = textOf(item) ?? '';
    if (whatThisRestsOn(text, leadNotes, partyEntries) === 'the lead alone, and it is a read on a person') {
      dropped.push({ item, text });
    } else {
      kept.push(item);
    }
  }
  return { kept, dropped };
}

/**
 * What the log says when one is dropped.
 *
 * Written for the person who reads it at nine in the morning wondering why a report
 * is thinner than they expected. It names the finding, says what it rested on, and
 * says what would make it real - because most of the time the lead is right and
 * nobody has asked the person about it yet.
 */
export function whyItWasDropped(text: string): string {
  return `Dropped a finding that was the lead's read on a person, resting on their private note and on nothing either party said: "${text.slice(0, 140)}". This is not the lead being wrong, and it is not about targets they set - those stay. It is a judgement the record has not been asked about yet, and the way to make it a finding is a question in the next check-in rather than a sentence in this report.`;
}
