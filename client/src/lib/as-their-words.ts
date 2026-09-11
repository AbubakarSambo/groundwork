/**
 * A RECORD LINE, AS THE PERSON WOULD READ IT.
 *
 * The record stores lines with the engine's own marks on them: a verifiability tier on the front,
 * an inference note in brackets, a difference the extractor spotted written as a labelled sentence.
 * Every one of those is for the engine and every one of them has reached a screen: a participant
 * read "[INFERRED: An unstated expectation is a source of potential tension]" above her first
 * question. One function, used wherever a line is shown, so the marks stop leaking one screen at
 * a time.
 */
export function asTheirWords(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/^\[VERIFIABILITY:\w+\]\s*/i, '')
    .replace(/\s*\[INFERRED:[^\]]*\]/gi, '')
    .replace(/^OPERATING_DIFFERENCE:\s*/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Lines that are the engine talking to itself, not the person's words. Left out of what the person sees. */
export function isTheEnginesOwnNote(text: string | null | undefined): boolean {
  return /^OPERATING_DIFFERENCE:/i.test((text ?? '').trim());
}
