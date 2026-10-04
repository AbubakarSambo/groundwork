import { theRoomAsThisReaderReadsIt, type TheRoomServed } from './the-room-as-each-reader-reads-it';
import { theRoomWithoutOneOfTheOthers } from './the-room-without-one-of-the-others';
import { labelsForParties, namesVisibleTo, readsWithNamesOf, withNames } from '../reports/party-labels';

/**
 * WHAT THE ROOM IS ABOUT, FOR ONE READER, ON EVERY SURFACE THAT SERVES IT (privacy sweep, 5 October 2026, finding 2).
 *
 * The room's read is stored once with people's full names. The board served it through two reads (the wall of
 * decision 75 item 14, then the reader's own "you"), and the check-in page (`GET /grounds/:id`) served the stored column
 * raw, so a cohort colleague read every other borrower's name beside their aim, and the person on a first-90-days
 * check-in read the name of the colleague giving views (decision 17). Both surfaces now call this one function.
 *
 * `wallOffTheOthers` is the caller's answer to "does this reader not read the others by name": true for a reader who
 * does not run the check-in, in a check-in where people are not named to each other.
 */
export interface TheReaderOfTheRoom {
  /** The check-in's people, as the board and the check-in page hold them (with `user.firstName` and `user.lastName`). */
  participants: any[];
  /** The reader's own row, or null for a reader who is not in it (an admin, say). */
  me: any | null;
  /** The lead's id on the check-in (`initiatorId`), so the lead stays named to everybody. */
  initiatorId: string | null | undefined;
  /** Whoever runs it, and an admin who reads it, read it whole. */
  viewerRunsIt: boolean;
  /** Where people are not named to this reader, one other person's rows go and the others are said as a count. */
  wallOffTheOthers: boolean;
  /** An evaluation check-in: the person reviewed is shielded from the names of the colleagues giving views (decision 17), and no more than that. */
  evaluation?: boolean;
}

const fullNameOf = (p: any): string | null => [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(' ').trim() || (p?.nameGiven ?? '').trim() || null;

export function theRoomForThisReader<T extends TheRoomServed | null | undefined>(room: T, c: TheReaderOfTheRoom): T {
  if (!room) return room;
  const { participants: people, me } = c;
  const leadRow = people.find((p) => !!c.initiatorId && p.userId === c.initiatorId) ?? null;
  const roomLabels = labelsForParties(people as any);
  const readerLabel = me?.id ? roomLabels.get(me.id) ?? null : null;
  const visibleNames = namesVisibleTo(
    readsWithNamesOf({ viewerIsLead: c.viewerRunsIt, viewerParticipantId: me?.id ?? null, parties: people as any[] }),
    people as any[],
  );
  /*
   * WHERE PEOPLE DO NOT SEE EACH OTHER, ONE PERSON'S CIRCUMSTANCES NEVER REACH ANOTHER (decision 75, item 14), as the
   * report's own wall: the reader's own rows, the lead's and several people's stay; one other person's go, and the
   * other people's names are said as a count. See the-room-without-one-of-the-others.
   */
  let served: any = room;
  if (c.wallOffTheOthers) {
    served = theRoomWithoutOneOfTheOthers(served, {
      reader: me ? fullNameOf(me) : null,
      lead: leadRow ? fullNameOf(leadRow) : null,
      namesOnly: !!c.evaluation,
      otherNames: people.filter((p) => p.id !== me?.id && p.id !== leadRow?.id)
        .flatMap((p) => [fullNameOf(p), (p.user?.firstName ?? '').trim().length > 2 ? p.user.firstName.trim() : null].filter(Boolean) as string[]),
    });
  }
  return theRoomAsThisReaderReadsIt(served, {
    fullName: me ? fullNameOf(me) : null,
    otherNames: people.filter((p) => p.id !== me?.id)
      .flatMap((p) => [fullNameOf(p), p.user?.firstName, p.user?.lastName, p.nameGiven].filter(Boolean) as string[]),
    name: (t: string) => withNames(t, visibleNames, roomLabels.values(), { viewerLabel: readerLabel }),
  }) as T;
}
