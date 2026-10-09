/**
 * A MANAGER WITH TWELVE PEOPLE CANNOT READ TWELVE READS.
 *
 * Everything built so far answers "what does the record hold about this person" and answers it well,
 * and a sales manager on a Monday morning does not have that question. Theirs is "where am I needed",
 * and without an answer the careful per-person read is a thing nobody opens.
 *
 * THIS IS THE FEATURE MOST LIKELY TO BECOME A LEAGUE TABLE, so it is built so that it cannot be one:
 *
 *   NOBODY IS SCORED. There is no number, so there is nothing to sort people by. The types below
 *     have no field a future edit could quietly start ordering on.
 *   THE BUCKETS ARE THINGS THE MANAGER DOES, not things a person is. "Somebody is waiting on you"
 *     is a queue of the manager's own work. "The ordinary cycle has run out" is a conversation to
 *     have. Neither is a quality of the person named.
 *   BEING IN ONE IS NOT BAD AND BEING IN NONE IS NOT GOOD. A person blocked for three weeks is in a
 *     bucket because their situation is urgent, and it is urgent because the company has not cleared
 *     something. Reading that as a mark against them inverts it completely.
 *   ORDER IS BY HOW LONG SOMETHING HAS BEEN WAITING and by nothing else, because that is a property
 *     of the situation. Two people in the same bucket are not being compared.
 *
 * The most important line in the whole file is the one about an empty list: silence in a record is
 * silence in a record, and a manager who reads "nothing flagged" as "everybody is fine" has been
 * misled by this product rather than helped by it.
 */

export type NeedKind =
  /* The manager is the blocker. First, because it is the only bucket that is their own work. */
  | 'WAITING_ON_YOU'
  /* Somebody is stuck on something the company has not cleared, and it has been taken further: by Groundwork's
     overnight check after a fortnight, or by the person, in their own words. Read by anybody who asks (decision 93, row 2). */
  | 'STUCK_AND_RAISED'
  /* The ordinary cycle has been tried on the same thing and has not moved it. */
  | 'CYCLE_RAN_OUT'
  /* They said themselves they do not know how. The cheapest thing on this list to fix. */
  | 'ASKED_TO_BE_SHOWN';

export interface Need {
  kind: NeedKind;
  /** Who it concerns. A label or a name, decided by the caller's read permissions, never by this. */
  who: string;
  /** What the situation is, in a sentence, founded on something somebody recorded. */
  says: string;
  /** How long it has been like this. The only ordering there is, and it describes the wait. */
  waitingDays: number;
  /**
   * The day it began, as it is said: "since 10 September" ("on 10 September" for asking to be shown).
   * A count of days from the moment of reading changes every time it is opened (request 117, part 9).
   */
  sinceSays?: string | null;
  /** The whole of it as one plain sentence, with the person's name and "you" for the reader. */
  sentence?: string;
  /** For a wait taken further: whether the reader runs the check-in it was said in. Decides what the group asks of them. */
  youRunIt?: boolean;
}

/**
 * WHAT EACH BUCKET ASKS OF THE MANAGER. Written here rather than in a screen, because the whole
 * value of splitting these up is that they need four different things, and a page that renders four
 * lists under one heading has thrown that away.
 */
export const WHAT_IT_ASKS: Record<NeedKind, string> = {
  WAITING_ON_YOU: 'This is yours to clear. Nobody else can.',
  /* "Somebody raised this" was not true: most are raised by Groundwork's own overnight check, not by the person. */
  STUCK_AND_RAISED: 'This has been taken further and is still open, in a check-in you run. Either clear it, or tell the person it is not being cleared.',
  CYCLE_RAN_OUT: 'Spend twenty minutes with them on what is behind it, rather than asking another check-in question.',
  ASKED_TO_BE_SHOWN: 'They have asked to be shown. That is an hour of somebody\'s time, not a conversation about performance.',
};

/**
 * WHAT THE GROUP OF WAITS TAKEN FURTHER ASKS, BY WHO READS IT (decision 93, row 2). It is read by anybody now, not
 * only by whoever runs the check-in, so it only says "you run" where every wait in it is in a check-in the reader runs.
 */
export const STUCK_AND_RAISED_FOR_SOMEBODY_WHO_DOES_NOT_RUN_IT =
  'This has been taken further and is still open. Whoever runs that check-in can clear it, or tell the person it is not being cleared.';
export const STUCK_AND_RAISED_FOR_SOME_THEY_RUN =
  'This has been taken further and is still open. Where it is in a check-in you run, either clear it, or tell the person it is not being cleared.';

/* The order the buckets are read in. The manager's own work first; the person's nerve last. */
const ORDER: NeedKind[] = ['WAITING_ON_YOU', 'STUCK_AND_RAISED', 'CYCLE_RAN_OUT', 'ASKED_TO_BE_SHOWN'];

export interface TheWeek {
  buckets: { kind: NeedKind; asks: string; needs: Need[] }[];
  /** Said even when there is plenty here, because it is true either way. */
  whatThisIsNot: string[];
}

function whatTheRaisedGroupAsks(group: Need[]): string {
  const runs = group.filter((n) => n.youRunIt).length;
  if (runs === group.length) return WHAT_IT_ASKS.STUCK_AND_RAISED;
  return runs === 0 ? STUCK_AND_RAISED_FOR_SOMEBODY_WHO_DOES_NOT_RUN_IT : STUCK_AND_RAISED_FOR_SOME_THEY_RUN;
}

export function whoNeedsYou(needs: Need[]): TheWeek {
  const buckets = ORDER
    .map((kind) => ({
      kind,
      asks: kind === 'STUCK_AND_RAISED' ? whatTheRaisedGroupAsks(needs.filter((n) => n.kind === kind)) : WHAT_IT_ASKS[kind],
      /*
       * LONGEST WAIT FIRST, and that is the only sort in this file. It is a property of the
       * situation - how long somebody has been waiting - and not a property of a person. Sorting by
       * anything else here is how this becomes a ranking, whatever it gets called.
       */
      needs: needs.filter((n) => n.kind === kind).sort((a, b) => b.waitingDays - a.waitingDays),
    }))
    .filter((b) => b.needs.length);

  return { buckets, whatThisIsNot: NOT_A_RANKING };
}

/**
 * SAID ON THE SCREEN, NOT JUST IN THIS FILE.
 *
 * A manager reading a short list of names under a heading will supply their own meaning for it
 * within about a second, and the meaning they supply is "these are my problem people". The only
 * defence is to say what it is not, in the place they are reading it.
 */
export const NOT_A_RANKING = [
  'Nobody is scored or ordered here. Two people in the same list are not being compared.',
  'Being on this list is not a mark against anybody. Most of what is here is the company owing somebody something.',
  'Not being on it does not mean somebody is fine. It means nothing in the record flagged them, and'
    + ' most of what happens is not in the record.',
];

/** What an empty week says, which is the sentence this whole file exists to get right. */
export const NOTHING_FLAGGED =
  /* No sentence about whether anybody is "fine": a reworded copy said "Not all of the people are fine" to Esther, which the record cannot know (B-168). */
  'Nothing in the record needs you this week. The record is quiet, which does not tell you how anybody is,'
  + ' and the people who most need a conversation are often the quietest in it.';
