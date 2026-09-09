/**
 * DOCUMENTS ARE NOT ONE THING.
 *
 * A typed contract or rota is a source: somebody else wrote it and it exists independently. A photo
 * of a whiteboard is a source but partial: no author, no date, could be months old. A screenshot of a
 * message has a real author but is a fragment. Notes somebody generated with a model are a record of
 * their recollection, one step removed; anchoring a claim to those is close to anchoring it to the
 * person's own memory, which is what the document mechanism exists to get past.
 *
 * The origin is decided at upload: from the file type first, and for text from a short read of the
 * content. It travels with every line the document backs (anchoredOrigin), so the documented share
 * in the confidence read can leave generated notes out, and What this rests on can say what kind of
 * thing each document is.
 */
export type DocumentOrigin = 'typed' | 'photo' | 'scan' | 'screenshot' | 'generated' | 'pasted' | 'conversation';

export const ORIGIN_LABEL: Record<DocumentOrigin, string> = {
  typed: 'a typed document',
  photo: 'a photo',
  scan: 'a scanned document',
  screenshot: 'a screenshot',
  generated: 'notes written with a model',
  pasted: 'pasted text',
  conversation: 'a conversation',
};

/** Origins that count as an independent source in the documented share. */
export const COUNTS_AS_A_SOURCE: ReadonlySet<string> = new Set<DocumentOrigin>(['typed', 'photo', 'scan', 'screenshot', 'pasted', 'conversation']);

export function originLabel(origin: string | null | undefined): string | null {
  return origin && origin in ORIGIN_LABEL ? ORIGIN_LABEL[origin as DocumentOrigin] : null;
}

const IMAGE = /^image\//;

/** What the file type alone can say. Null means the content has to be read to decide. */
export function originFromTheFile(mimeType: string, fileName: string, opts: { isConversation?: boolean; pdfHadNoTextLayer?: boolean; pastedByHand?: boolean } = {}): DocumentOrigin | null {
  if (opts.isConversation) return 'conversation';
  if (opts.pastedByHand) return 'pasted';
  if (IMAGE.test(mimeType)) return /screen ?shot|screenshot|capture/i.test(fileName) ? 'screenshot' : 'photo';
  if (mimeType === 'application/pdf' && opts.pdfHadNoTextLayer) return 'scan';
  return null;
}

/**
 * Text that a model wrote reads a certain way: headings and bullets in tidy parallel, "Here is a
 * summary", "Key points", "In summary", no dates or names that a person's own notes would carry.
 * This is the cheap read; the model is asked the same question and either answer decides.
 */
export function looksGeneratedByAModel(text: string): boolean {
  const t = text.slice(0, 4000);
  const tells = [/\b(here is|here's) (a|the) (summary|breakdown|overview)\b/i, /\b(key (points|takeaways)|in summary|to summari[sz]e|overall,)\b/i, /^\s*(\*\*|#{1,3} )/m, /\b(as an ai|i cannot|i can't provide)\b/i];
  const hits = tells.filter((re) => re.test(t)).length;
  const bullets = (t.match(/^\s*[-*\u2022] /gm) ?? []).length;
  return hits >= 2 || (hits >= 1 && bullets >= 6);
}
