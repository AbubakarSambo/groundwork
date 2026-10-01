/**
 * THE SHARED READ OF THE ANSWERS (`whatTheAnswersSay`) SAYS NOTHING ABOUT THE LEAD'S OWN UNDERSTANDING, TO ANYBODY BUT THE LEAD.
 *
 * "Amaka Nwachukwu has no visibility of these facts, and so has understood the problem as one of individual
 * repayment rather than loan design." was served to a borrower on the programme's board. It is a judgement of
 * the lead, written for the lead, and a participant never reads the lead's judgement (decision 4; the 1 October
 * review, part 1). The shared picture of the answers stays for everybody. Only a sentence in it that is about
 * the lead, by name or as "the lead", is left out of what a person who is not the lead reads.
 */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function aSentenceAboutTheLead(sentence: string, leadNames: readonly string[]): boolean {
  const names = leadNames.map((n) => n.trim()).filter((n) => n.length > 1);
  const byName = names.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.map(escape).join('|')})(?![\\p{L}\\p{N}])`, 'iu') : null;
  return !!(byName?.test(sentence)) || /\b(?:the|your) lead\b|\bthe person who runs this check-in\b/i.test(sentence);
}

/** The shared read, as somebody who is not the lead reads it. */
export function theSharedReadWithoutTheLeadsJudgement<T extends { thePicture?: unknown } | null | undefined>(read: T, leadNames: readonly string[]): T {
  if (!read || typeof read !== 'object' || typeof (read as any).thePicture !== 'string') return read;
  const text = (read as any).thePicture as string;
  const sentences = text.match(/[^.!?\n]+(?:[.!?]+["”’)]*|\n|$)\s*/g) ?? [text];
  const kept = sentences.filter((s) => !aSentenceAboutTheLead(s, leadNames));
  if (kept.length === sentences.length) return read;
  return { ...(read as object), thePicture: kept.join('').trim() } as T;
}
