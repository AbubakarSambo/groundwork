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

const NOT_A_BREAK = /\b(Mr|Mrs|Ms|Dr|Prof|St|No|vs|etc)\.$/;
const LITTLE_WORDS = new Set('the and for but not has had have was were are been will would should could can did does his her its our their they them you your with from that this than then there what when who why how all any one two out off per into onto over about also just very more most some such too own same each both few many much shall may might must i me my we us he she it is be to of in on at by an as or if so do no up'.split(' '));
const contentWords = (t: string): string[] => (t.toLowerCase().normalize('NFC').replace(/[\u2018\u2019']/g, '').match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length > 2 && !LITTLE_WORDS.has(w));
/** A person's turn as its sentences, each exactly as they typed it ("Mr." does not end one). */
function sentencesOf(turn: string): string[] {
  const out: string[] = [];
  for (const line of turn.split(/\n+/)) {
    let from = 0;
    const re = /[.!?]+(?=\s+\S|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const end = m.index + m[0].length;
      if (NOT_A_BREAK.test(line.slice(from, end))) continue;
      out.push(line.slice(from, end).trim());
      from = end;
    }
    if (line.slice(from).trim()) out.push(line.slice(from).trim());
  }
  return out.filter(Boolean);
}

/**
 * THE SENTENCES OF THEIRS A STORED TEXT WAS DRAWN FROM: the whole text if it is found in their words,
 * otherwise each sentence of theirs whose own words are mostly in the stored text. Returned exactly as
 * they typed them, in the order they typed them; null when nothing of theirs is the source.
 */
export function theirWordsItCameFrom(stored: string | null | undefined, said: string[] | undefined): string[] | null {
  const text = stored?.trim();
  if (!text || !said?.length) return null;
  const whole = theRecordsWordsFor(text, said);
  if (whole !== null) return [whole];
  const mine = new Set(contentWords(text));
  if (!mine.size) return null;
  const found: string[] = [];
  for (const turn of said) {
    for (const sentence of sentencesOf(turn ?? '')) {
      const words = contentWords(sentence);
      if (!words.length) continue;
      const shared = words.filter((w) => mine.has(w)).length;
      if (shared >= Math.min(2, mine.size) && shared / words.length >= 0.5 && !found.includes(sentence)) found.push(sentence);
    }
  }
  return found.length > 3 ? null : found.length ? found : null;
}

export function withTheirWordsChecked<T extends { fromParticipantId: string; sourceCheckInId?: string | null; triedSaid?: string | null; dueSaid?: string | null; then?: string | null }>(
  handoffs: T[],
  typed: Map<string, string[]>,
): (T & { triedSaidTheirWords: string[] | null; dueSaidTheirWords: string[] | null; thenTheirWords: string | null })[] {
  return handoffs.map((d) => {
    const said = d.sourceCheckInId ? typed.get(d.sourceCheckInId) : undefined;
    /* What happens once it is cleared, only where it is word for word what they typed (request 115 e). */
    const then = (d.then ?? '').trim();
    return {
      ...d,
      triedSaidTheirWords: theirWordsItCameFrom(d.triedSaid, said),
      dueSaidTheirWords: theirWordsItCameFrom(d.dueSaid, said),
      thenTheirWords: then && said?.length ? theRecordsWordsFor(then, said) : null,
    };
  });
}
