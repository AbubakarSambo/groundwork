import { checksInOnlyWhenTheyChoose, owesThisSession } from '../grounds/the-lead-checks-in-when-they-choose';
import { isNotLetInYet } from '../grounds/who-an-admin-did-not-let-in';

/**
 * WHO HAS NOT CHECKED IN YET, COUNTED WHEN THE MAIL IS SENT, AND SAID PLAINLY (engagement audit, 7 October).
 *
 * The lead was told "2 parties have not yet checked in" on three mails sent a minute apart, though after the third only one person
 * besides the lead was left: the count included the person who had just checked in (whose answer was not saved yet when it was read)
 * and the lead herself. "Parties" is also not a word anybody says. Now the count leaves out the person who just checked in, the reader,
 * anybody who only manages the check-in, anybody an admin has not let in yet and anybody whose account has gone; and it is said with
 * names where the reader may read them (the lead sees who has checked in): "Amina and Kwame have not checked in yet." Past three
 * names, or where a name is not known, it is a count in words: "Four people have not checked in yet."
 */
export interface SomebodyInTheRound {
  id: string;
  managingOnly?: boolean | null;
  /** The lead (INITIATOR) checks in when they choose and is never left to check in (decision 133). */
  partyType?: string | null;
  user?: { email?: string | null; firstName?: string | null; isActive?: boolean | null; deletedAt?: Date | null; awaitingOrgApproval?: boolean | null } | null;
  checkIns: { id?: string }[];
}

export interface WhoIsLeft { names: string[]; count: number }

export function whoIsLeftToCheckIn(everyone: SomebodyInTheRound[], not: { justCheckedIn: string; readerEmail: string }): WhoIsLeft {
  const left = everyone.filter((p) => p.id !== not.justCheckedIn && owesThisSession(p) && p.checkIns.length === 0 && !isNotLetInYet(p)
    && p.user?.email !== not.readerEmail && !(p.user && (p.user.isActive === false || p.user.deletedAt)));
  return { names: left.map((p) => p.user?.firstName?.trim() ?? '').filter(Boolean), count: left.length };
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** "Amina and Kwame have not checked in yet." / "Two people have not checked in yet." Nothing left is the other sentence's job. */
export function haveNotCheckedInSaid(left: WhoIsLeft): string {
  if (left.count <= 0) return '';
  if (left.names.length === left.count && left.count <= 3) {
    const who = left.count === 1 ? left.names[0] : `${left.names.slice(0, -1).join(', ')} and ${left.names[left.names.length - 1]}`;
    return `${who} ${left.count === 1 ? 'has' : 'have'} not checked in yet.`;
  }
  return `${left.count <= 10 ? WORDS[left.count] : left.count} ${left.count === 1 ? 'person has' : 'people have'} not checked in yet.`;
}
