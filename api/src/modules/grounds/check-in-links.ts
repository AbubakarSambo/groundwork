import { theFirstNameOfAParticipant } from '../reports/a-title-is-not-a-first-name';
import { blockerHasSubstance, dedupeDependencies, type ReadDependency } from '../board/reads';
import { peersAreNamedOn, theReaderBySignIn } from '../reports/peers-are-named';
import { theDueFields } from './when-a-handoff-is-due';

/**
 * LINKS BETWEEN CHECK-INS (D3, U.16), AS ONE READER MAY SEE THEM.
 *
 * A handoff in one check-in can wait on another team's check-in (`waitingOnGroundId`, written by
 * the engine: request 18). On the board of the check-in that waits, it is "Waiting on other teams";
 * on the board of the check-in waited on, it is "Asked of <this check-in> by other teams".
 *
 * THE ONE RULE: A READER SEES ONLY WHAT THEY MAY ALREADY OPEN. Never a check-in's name, a person or
 * a blocker from a check-in the reader cannot open.
 *   - Waiting on other teams: the handoff is from this check-in, which the reader may open, so its
 *     words are theirs to read, under this check-in's own wall (where people do not see each other,
 *     only the handoffs you are part of). The other check-in is named, with a way to open it, only
 *     when the reader may open it; otherwise the line says only the team as the person said it here.
 *   - Asked of this check-in by other teams: the handoff is from the other check-in. It is shown only
 *     to a reader who may open that check-in too, under that check-in's wall, and who asked is named
 *     only where that check-in lets its people see each other or the reader runs it.
 *
 * WHAT IT NEVER HOLDS. How anybody's answers were rated, a label on anybody, or where a blocker
 * started (that is `GET /grounds/:id/blocker-trace`, in the reports folder).
 */

export interface LinkRow extends ReadDependency {
  id: string;
  groundId: string;
  waitingOnGroundId: string | null;
  createdAt: Date;
  dueSaid?: string | null;
  dueOn?: Date | string | null;
  blockerKind?: string | null;
  fromParticipant?: { userId: string | null; nameGiven?: string | null; user?: { firstName: string | null; lastName: string | null } | null } | null;
  onParticipant?: { userId: string | null } | null;
}

export interface OpenableCheckIn {
  id: string;
  label: string | null;
  initiatorId: string | null;
  scenario?: any;
  peersVisibleToEachOther?: boolean | null;
  /** Who is on it, as far as telling the person reviewed apart from a colleague needs (decision 17). */
  participants?: { id: string; userId?: string | null; partyType: string; managingOnly?: boolean | null; createdAt?: Date | string | null }[] | null;
}

export interface WaitingOnAnotherTeam {
  id: string;
  /** The other check-in's name when you may open it; otherwise the team as the person said it here; or null. */
  team: string | null;
  what: string;
  /** When it was first asked, as a moment. The screen says it in the reader's time. */
  asked: string;
  /** Only when you may open the other check-in. */
  open: { label: string; to: string } | null;
  /** The person's own words for when, word for word; null where they gave none. */
  dueSaid: string | null;
  /** The day those words meant, as YYYY-MM-DD; null where the words name no day. */
  dueOn: string | null;
  /** "Overdue", "Today", a short weekday ("Fri") or a short date; null where no day is known. */
  dueWord: string | null;
  /** One plain sentence of where it stands, written from the record. */
  standing: string;
}

export interface AskedOfThisCheckIn {
  id: string;
  /** The check-in that asked, which you may open. */
  team: string;
  what: string;
  /** Who asked, by first name, or null where that check-in does not let you see who. */
  askedBy: string | null;
  asked: string;
  open: { label: string; to: string };
  /** The person's own words for when, word for word; null where they gave none. */
  dueSaid: string | null;
  /** The day those words meant, as YYYY-MM-DD; null where the words name no day. */
  dueOn: string | null;
  /** "Overdue", "Today", a short weekday ("Fri") or a short date; null where no day is known. */
  dueWord: string | null;
  /** One plain sentence of where it stands, written from the record. */
  standing: string;
}

export interface CheckInLinks {
  waitingOnOtherTeams: WaitingOnAnotherTeam[];
  askedOfThisCheckIn: AskedOfThisCheckIn[];
}

export interface LinkReader {
  userId: string;
  role?: string | null;
}

const labelOf = (g: OpenableCheckIn) => (g.label ?? '').trim();

/** Whoever runs a check-in, or an admin of the organisation, is never walled from its people. */
function wallFor(g: OpenableCheckIn, reader: LinkReader): boolean {
  const runs = (!!g.initiatorId && g.initiatorId === reader.userId) || reader.role === 'ADMIN';
  return !runs && !peersAreNamedOn(g as any, theReaderBySignIn(g as any, reader.userId));
}

function youArePartOf(r: LinkRow, reader: LinkReader) {
  return r.fromParticipant?.userId === reader.userId || r.onParticipant?.userId === reader.userId;
}

function real<T extends LinkRow>(rows: T[]): T[] {
  return dedupeDependencies(rows).filter(blockerHasSubstance);
}

export function checkInLinks(
  here: OpenableCheckIn,
  rows: LinkRow[],
  mayOpen: Map<string, OpenableCheckIn>,
  reader: LinkReader,
  today: Date = new Date(),
): CheckInLinks {
  const hereWalled = wallFor(here, reader);

  const waitingOnOtherTeams = real(rows.filter((r) =>
    r.groundId === here.id && !!r.waitingOnGroundId && r.waitingOnGroundId !== here.id))
    .filter((r) => !hereWalled || youArePartOf(r, reader))
    .map((r) => {
      const other = mayOpen.get(r.waitingOnGroundId!) ?? null;
      const said = (r.onLabel ?? '').trim() || null;
      return {
        id: r.id,
        team: other ? labelOf(other) || said : said,
        what: r.what.trim(),
        asked: new Date(r.createdAt).toISOString(),
        open: other && labelOf(other) ? { label: labelOf(other), to: `/grounds/${other.id}/board` } : null,
        ...theDueFields(r, today),
      };
    });

  const askedOfThisCheckIn: AskedOfThisCheckIn[] = [];
  for (const r of real(rows.filter((x) => x.waitingOnGroundId === here.id && x.groundId !== here.id))) {
    const from = mayOpen.get(r.groundId);
    /* A check-in you may not open gives you nothing of itself: not its name, its people or its words. */
    if (!from || !labelOf(from)) continue;
    const walled = wallFor(from, reader);
    if (walled && !youArePartOf(r, reader)) continue;
    const first = theFirstNameOfAParticipant(r.fromParticipant as any);
    askedOfThisCheckIn.push({
      id: r.id,
      team: labelOf(from),
      what: r.what.trim(),
      askedBy: walled ? null : first,
      asked: new Date(r.createdAt).toISOString(),
      open: { label: labelOf(from), to: `/grounds/${from.id}/board` },
      ...theDueFields(r, today),
    });
  }

  const byAsked = (a: { asked: string }, b: { asked: string }) => a.asked.localeCompare(b.asked);
  return {
    waitingOnOtherTeams: waitingOnOtherTeams.sort(byAsked),
    askedOfThisCheckIn: askedOfThisCheckIn.sort(byAsked),
  };
}
