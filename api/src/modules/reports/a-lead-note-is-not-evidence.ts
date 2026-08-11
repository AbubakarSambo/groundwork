/**
 * A LEAD NOTE IS NOT EVIDENCE, AND THE WALL WAS WORDING.
 *
 * The lead can attach private context about a participant: "Abubakar has been slow
 * to take ownership." That is genuinely useful and it is usually why the ground
 * exists. It is also the most dangerous input in the system, because of how easily
 * it becomes what it predicted: the engine is told to watch for slow ownership, so
 * it probes ownership, so ownership fills the record, so a pattern "confirms" - and
 * what happened is that one person's opinion was laundered into a finding by the
 * machinery meant to test it.
 *
 * THE PROTECTION SHIPPED AS AN INSTRUCTION. The note reaches the model in its own
 * labelled section saying "never quote it, never attribute it to a party, never
 * state it as an established fact". Which is exactly the shape of guardrail this
 * codebase has already watched leak twice in a single day - and the module that
 * states this rule properly, a-hypothesis-is-not-a-finding.ts, had never been
 * called by anything.
 *
 * SO THIS IS THE ARITHMETIC. After synthesis, any finding whose distinctive words
 * come from a lead note and from NO party's own account did not survive the test it
 * was supposed to pass. It is dropped, and the drop is logged loudly, because a
 * report quietly containing one is worse than a report missing one.
 *
 * WHY DROPPING IS RIGHT HERE AND WARNING WAS RIGHT FOR TONE. A stiff sentence is a
 * stiff sentence. A finding that exists only because the manager said so is the
 * product doing the specific harm it was built to prevent, in a document that will
 * be read as neutral. There is no version of shipping that and explaining later.
 */

import { touches } from './what-the-record-actually-holds';

export interface LeadNote {
  participantId: string | null;
  text: string;
}

export interface PartyEntry {
  text: string;
}

/**
 * Whether this finding stands on the parties' own accounts.
 *
 * Three states rather than two, because "nothing touches it either way" is
 * common and innocent: a synthesis sentence is a summary, and a summary often
 * shares no distinctive words with any single entry. Only the middle case is a
 * leak.
 */
export function whatThisRestsOn(
  finding: string,
  leadNotes: LeadNote[],
  partyEntries: PartyEntry[],
): 'the record' | 'the lead alone' | 'neither, so nothing to check' {
  const fromLead = leadNotes.some((n) => touches(finding, n.text));
  const fromParties = partyEntries.some((e) => touches(finding, e.text));

  if (fromParties) return 'the record';
  if (fromLead) return 'the lead alone';
  return 'neither, so nothing to check';
}

/**
 * Strip the findings that rest on the lead alone.
 *
 * Takes a reader function rather than a fixed shape, because agreements,
 * divergences and gaps are all different objects and all need the same test - and
 * a version of this that only knew about divergences would be a wall with a door
 * in it.
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
    if (whatThisRestsOn(text, leadNotes, partyEntries) === 'the lead alone') {
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
 * Written for the person who reads it at nine in the morning wondering why a
 * report is thinner than they expected. It names the finding, says what it rested
 * on, and says what would make it real - because most of the time the answer is
 * that the lead is right and nobody has asked the person about it yet.
 */
export function whyItWasDropped(text: string): string {
  return `Dropped a finding that rested on the lead's private note and on nothing either party said: "${text.slice(0, 140)}". This is not the lead being wrong - it is the record not having been asked yet. The way to make it a finding is a question in the next check-in, not a sentence in this report.`;
}
