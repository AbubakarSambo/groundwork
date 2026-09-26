/**
 * HOW CHECKABLE A CHECK-IN WAS IS A READ OF ONE PERSON'S ANSWERS, AND IT IS THEIRS ALONE.
 *
 * Every check-in row carries `specificityLevel` and `specificityDimensions`: the engine's read of
 * how checkable that person's answers were. The Done page shows it to the person with the words
 * "This is about the check-in. Only you see it." (docs/prototype/screens/B3-the-check-in/done.txt).
 *
 * That sentence was not true. `GET /grounds/:id` sent every check-in on the ground with both fields,
 * so the lead, an admin and anyone else in the check-in could read how each person's answers were
 * rated. CLAUDE.md: "Leads never see how a person's answers were rated."
 *
 * So the rows are cut here, in the read, for everybody: a reader keeps the read of their own
 * check-ins and gets null for everyone else's. Nothing on screen decides it.
 */
export interface ARowWithARead {
  participantId: string;
  specificityLevel?: unknown;
  specificityDimensions?: unknown;
}

export function howCheckableIsYoursAlone<T extends ARowWithARead>(
  checkIns: T[],
  participants: { id: string; userId?: string | null }[],
  readerUserId: string | null | undefined,
): T[] {
  const mine = new Set(
    participants.filter((p) => !!readerUserId && p.userId === readerUserId).map((p) => p.id),
  );
  return checkIns.map((c) => {
    if (mine.has(c.participantId)) return c;
    const cut: T = { ...c };
    if ('specificityLevel' in cut) cut.specificityLevel = null;
    if ('specificityDimensions' in cut) cut.specificityDimensions = null;
    return cut;
  });
}
