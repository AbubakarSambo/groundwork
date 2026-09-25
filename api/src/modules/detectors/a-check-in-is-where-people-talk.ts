/**
 * THE ORGANISATION-LEVEL READ WAS LISTENING TO THE WRONG ROOM.
 *
 * Measured on a whole fictional consulting firm, 25 September 2026: eleven people, seven subjects
 * across a real strategy tree, four check-ins, twenty-eight conversations about three named
 * projects. Every one of those conversations discussed the work by name. The contribution table
 * came out as 27 ASSIGNED rows, 0 STATED, 0 REFERENCED, and the firm was told this six times over:
 *
 *   "Zainab Yusuf is listed on 4 pieces of work and has not been mentioned in any of them."
 *
 * The cause is one line. `DetectorsService.run` reads `assistantTurn` - the chat a lead has with
 * the assistant - and nothing else. Check-ins are the product's core and the only place most people
 * in an organisation ever say anything, and they were not an input to the organisation-level read
 * at all. So every cross-ground detector - who is actually carrying what, unattached work,
 * undeclared dependencies, unowned gaps, unrecognised contributors - was computing over an
 * organisation that had said nothing, and reporting confidently about the silence.
 *
 * WHY IT LOOKED FINE. `assistantTurn` already carries `personExternalId`, because the assistant
 * knows who is typing. A check-in turn belongs to a participant, who is an email on a ground, and
 * joining that to a `Person` in the directory is the step nobody had written. So the easy input was
 * wired and the important one was not, and nothing failed loudly enough to say so.
 *
 * THE JOIN IS THE ADDRESS, and it is the same join the rest of the product uses to know that a
 * participant and a directory entry are one person. A participant whose address is in nobody's
 * directory row contributes nothing here rather than being guessed at - the whole point of this
 * layer is being right about WHICH person and WHICH objective.
 */

export interface ATurnFromACheckIn {
  personExternalId: string;
  content: string;
  createdAt: Date;
}

export interface AParticipantWhoSpoke {
  /** The address on the ground's participant row. */
  email: string | null;
  /** The address on their sign-in, where they have one. */
  userEmail?: string | null;
  content: string;
  createdAt: Date;
}

export interface ADirectoryEntry {
  externalId: string;
  email: string | null;
}

const tidy = (e: string | null | undefined): string => (e ?? '').trim().toLowerCase();

/**
 * Check-in turns, resolved to the directory.
 *
 * Unmatched turns are dropped and counted, because a number the caller can log is the difference
 * between "this organisation is quiet" and "half its people are not in the directory".
 */
export function turnsFromCheckIns(
  spoken: AParticipantWhoSpoke[],
  directory: ADirectoryEntry[],
): { turns: ATurnFromACheckIn[]; unmatched: number } {
  const byEmail = new Map<string, string>();
  for (const p of directory) {
    const e = tidy(p.email);
    if (e) byEmail.set(e, p.externalId);
  }
  const turns: ATurnFromACheckIn[] = [];
  let unmatched = 0;
  for (const s of spoken) {
    const id = byEmail.get(tidy(s.email)) ?? byEmail.get(tidy(s.userEmail));
    if (!id) { unmatched += 1; continue; }
    if (!(s.content ?? '').trim()) continue;
    turns.push({ personExternalId: id, content: s.content, createdAt: s.createdAt });
  }
  return { turns, unmatched };
}
