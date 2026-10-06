import { CheckInStatus } from '@prisma/client';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';

/**
 * "YOURS IS THE LAST ONE WE ARE WAITING FOR" ONLY WHEN IT IS TRUE (engagement audit, 7 October).
 *
 * The reminder said it as soon as ANY other person had finished, so on the morning after three of five had checked in, both people
 * still to go were told they were the last. Now it is said only when at least one other person has finished and nobody else who is
 * still expected is left. Who is still expected: not the reader, not somebody who only manages the check-in, not somebody an admin has
 * not let in yet, not somebody whose account has gone, and not somebody who finished or declined this session.
 */
export interface SomeoneInTheRound {
  id: string;
  managingOnly?: boolean | null;
  notLetIn?: boolean | null;
  user?: { awaitingOrgApproval?: boolean | null; isActive?: boolean | null; deletedAt?: Date | null } | null;
  /** This person's check-ins for the session being chased. */
  checkIns?: { status: CheckInStatus | string }[];
}

const done = (p: SomeoneInTheRound) => (p.checkIns ?? []).some((c) => c.status === CheckInStatus.COMPLETED);
const declined = (p: SomeoneInTheRound) => (p.checkIns ?? []).some((c) => c.status === CheckInStatus.DECLINED);

/** Who is still expected to answer this session, other than the reader: by id. */
export function whoIsStillExpected(readerParticipantId: string, everyone: SomeoneInTheRound[]): SomeoneInTheRound[] {
  return everyone.filter((p) => p.id !== readerParticipantId && !p.managingOnly && !isNotLetInYet(p)
    && !(p.user && (p.user.isActive === false || p.user.deletedAt)) && !done(p) && !declined(p));
}

export function everyoneElseHasAnswered(readerParticipantId: string, everyone: SomeoneInTheRound[]): boolean {
  const others = everyone.filter((p) => p.id !== readerParticipantId);
  return others.some(done) && whoIsStillExpected(readerParticipantId, everyone).length === 0;
}
