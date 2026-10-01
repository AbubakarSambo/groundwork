import { theRecordsWordsFor } from '../reports/a-quote-is-what-they-said';

/**
 * WHETHER WHAT A HANDOFF SAYS WAS TRIED, AND WHEN IT IS DUE, ARE THE PERSON'S OWN WORDS.
 *
 * `triedSaid` and `dueSaid` are the record reader's version, which is sometimes tidied or two things
 * joined. A quotation mark promises exact words, so it may only go round a text found character for
 * character (the report's own forgiveness: capitals, spacing, end punctuation, curly or straight marks)
 * in what the person who raised the handoff typed in the check-in it was raised in. This is decided
 * here, when the board is built from the record, by comparing text. No model, nothing written.
 *
 * What comes back is the person's own passage, so a quote is always their words and never a copy.
 */
export async function whatEachHandoffPersonTyped(
  prisma: any,
  handoffs: { fromParticipantId: string; sourceCheckInId?: string | null }[],
  checkIns: { id: string; participantId: string }[],
): Promise<Map<string, string[]>> {
  const ids = [...new Set(handoffs.map((d) => d.sourceCheckInId).filter((x): x is string => !!x))];
  const out = new Map<string, string[]>();
  if (!ids.length) return out;
  const turns = ((await prisma.conversationTurn?.findMany?.({
    where: { checkInId: { in: ids }, role: 'PERSON' },
    select: { checkInId: true, content: true },
    orderBy: { createdAt: 'asc' },
  })?.catch?.(() => [])) ?? []) as { checkInId: string; content: string }[];
  const ownerOf = new Map(checkIns.map((c) => [c.id, c.participantId]));
  for (const d of handoffs) {
    const id = d.sourceCheckInId;
    /* Only the person's own check-in counts, never somebody else's. */
    if (!id || ownerOf.get(id) !== d.fromParticipantId || out.has(id)) continue;
    out.set(id, turns.filter((t) => t.checkInId === id).map((t) => t.content ?? ''));
  }
  return out;
}

export function withTheirWordsChecked<T extends { fromParticipantId: string; sourceCheckInId?: string | null; triedSaid?: string | null; dueSaid?: string | null }>(
  handoffs: T[],
  typed: Map<string, string[]>,
): (T & { triedSaidTheirWords: string | null; dueSaidTheirWords: string | null })[] {
  return handoffs.map((d) => {
    const said = d.sourceCheckInId ? typed.get(d.sourceCheckInId) : undefined;
    const found = (t: string | null | undefined) => (said && t?.trim() ? theRecordsWordsFor(t.trim(), said) : null);
    return { ...d, triedSaidTheirWords: found(d.triedSaid), dueSaidTheirWords: found(d.dueSaid) };
  });
}
