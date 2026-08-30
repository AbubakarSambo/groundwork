/**
 * WHAT A PIECE OF EVIDENCE ACTUALLY PROVES, SAID IN WORDS A PERSON READS.
 *
 * The single most dangerous thing this feature could do is let a report say "the evidence shows he
 * visited the shop" when what exists is a calendar entry. Three claims are involved and they are
 * not the same:
 *
 *   somebody was at the shop
 *   a conversation happened
 *   a meaningful conversation happened
 *
 * Nothing that can be ingested proves the third, and most of what can be ingested does not prove
 * the second. So the sentence is generated from the kind and the strength rather than written by a
 * model, and the model is given the sentence rather than the raw record.
 *
 * THE PERSON'S OWN ACCOUNT IS EVIDENCE TOO, and saying so matters. `SELF_REPORTED` is not a
 * suspicion - most of what any check-in knows is self-reported and always has been. It is simply
 * not corroboration, and the difference is worth stating plainly rather than implying.
 */

export type Kind = 'VISIT' | 'CALL' | 'MESSAGE' | 'MEETING' | 'PROPOSAL' | 'TRANSACTION';
export type Strength = 'COMPLETED' | 'RECORDED' | 'ARRANGED' | 'SELF_REPORTED';

const THING: Record<Kind, string> = {
  VISIT: 'a visit',
  CALL: 'a call',
  MESSAGE: 'a message',
  MEETING: 'a meeting',
  PROPOSAL: 'a proposal',
  TRANSACTION: 'a transaction',
};

/**
 * One sentence, and it never claims more than the strength allows.
 *
 * `who` and `withWhom` are labels the caller has already resolved - a name never reaches here, for
 * the same reason names never reach a stored report.
 */
export function whatThisProves(
  kind: Kind,
  strength: Strength,
  who: string,
  withWhom: string | null,
): string {
  const thing = THING[kind];
  const at = withWhom ? ` with ${withWhom}` : '';

  switch (strength) {
    case 'COMPLETED':
      /* The only strength that is evidence of an outcome rather than of an activity. */
      return `${thing}${at} completed. This is the one kind of record that shows a thing finished rather than that it was attempted.`;

    case 'RECORDED':
      /*
       * A system record is good evidence that somebody was there and no evidence at all of what was
       * said. Saying both halves is the point - the second half is what a reader will otherwise
       * supply for themselves.
       */
      return `${thing}${at} was logged in a system somebody operates. That is evidence it happened, and no evidence of what was said or whether it went anywhere.`;

    case 'ARRANGED':
      /* The trap. A calendar entry is evidence of an intention, and reads as evidence of an event. */
      return `${thing}${at} was arranged. A record that something was scheduled is not a record that it took place, and this one says nothing about whether it did.`;

    case 'SELF_REPORTED':
      return `${who} says ${thing}${at} happened. Their own account, which is most of what any check-in knows - it is not corroboration and does not need to be treated as doubtful.`;
  }
}

/**
 * WHAT NOBODY MAY CONCLUDE FROM ANY OF IT.
 *
 * Given to the synthesis alongside the records. Without it a model reading twelve logged visits and
 * one sale will reach for the sentence that explains the gap, and the record cannot support any
 * such sentence.
 */
export const NEVER_CONCLUDE =
  'WHAT THESE RECORDS CANNOT TELL YOU. None of them says whether a conversation was any good, '
  + 'whether the right person was there, or why something did or did not progress. Counting them is '
  + 'not a measure of how somebody is doing: forty logged visits and two conversations that went '
  + 'anywhere is a different situation from fifteen and ten, and the records alone cannot tell you '
  + 'which is which. Where a record and somebody\'s own account disagree, say both and settle '
  + 'neither. Never write that a record proves somebody did not do something - an unlogged visit and '
  + 'an unmade one look identical from here.';
