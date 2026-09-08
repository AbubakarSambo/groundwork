/**
 * THE BOARD KEEPS THE WALL THE CHECK-IN KEEPS.
 *
 * On an evaluation-family ground - a new hire, a probation, a cohort - people check in without
 * seeing each other. `grounds.service` enforces that by FILTERING THE OTHER PARTIES OUT OF THE
 * PAYLOAD, and it works: on a real twelve-session sales cohort, one hire's check-in page came back
 * with exactly one participant, herself.
 *
 * The board had never heard of the rule. The same person, on the same ground, at the same moment,
 * opened the team board and read a colleague's full name, their remit, and the assessment of their
 * quarter: "Nothing checkable since session 5." Every hire could read the performance read of every
 * other hire, on a cohort whose whole purpose was the lead deciding which of them to keep.
 *
 * WHAT IS AND IS NOT WALLED. The aggregate stays: the quick read, where accounts differ, the
 * question this turns on, the shared picture. None of it names anybody, all of it is the point of
 * having a board, and everybody having the same picture of the WORK is what the product is for.
 *
 * What goes is the per-person material - the contribution read, coverage, who owns what, the
 * attendance grid, handoffs between named people, manager alignment. A person keeps their own row
 * in each: your own line about your own work is yours to read, and losing it would make the board
 * useless to the people it is about.
 *
 * AND NOBODY WHO RUNS THE CHECK-IN IS WALLED. The lead needs every row - it is the job - and so does
 * an admin of the organisation. The rule is between the PARTIES, and it always was.
 */

/** Rows the board carries that are about one named person. */
export interface AboutOnePerson {
  participantId?: string | null;
}

export interface WhoMaySeeWhom {
  /** True when the parties are hidden from each other on this ground. */
  peersHidden: boolean;
  /** The reader's own participant row, when they are a party. */
  meParticipantId: string | null;
}

/**
 * Keep only what this reader may see. Their own row always survives; everybody else's goes when the
 * ground hides peers.
 */
export function onlyWhatThisReaderMaySee<T extends AboutOnePerson>(
  rows: T[] | undefined,
  who: WhoMaySeeWhom,
): T[] | undefined {
  if (!rows) return rows;
  if (!who.peersHidden) return rows;
  return rows.filter((r) => !!r.participantId && r.participantId === who.meParticipantId);
}

/**
 * A handoff names TWO people, so a row survives only when the reader is one of them - and even then
 * the other end is a name they are entitled to, because a handoff they are part of is a fact about
 * their own work. A handoff between two other people is not.
 */
export function onlyHandoffsTheyAreIn<T extends { fromParticipantId?: string | null; onParticipantId?: string | null }>(
  rows: T[] | undefined,
  who: WhoMaySeeWhom,
): T[] | undefined {
  if (!rows) return rows;
  if (!who.peersHidden) return rows;
  return rows.filter(
    (r) => !!who.meParticipantId
      && (r.fromParticipantId === who.meParticipantId || r.onParticipantId === who.meParticipantId),
  );
}

/**
 * The line a party reads in place of everybody else's rows, so a board that has quietly lost most
 * of itself does not read as broken or as though nobody else is in the check-in.
 */
export const WHY_YOU_ONLY_SEE_YOURSELF =
  'On this check-in people give their accounts without seeing each other, so the person-by-person '
  + 'part of this board shows only you. Everything above it - what the accounts agree on, where they '
  + 'differ, and the question it turns on - is built from everybody and is the same for all of you.';
