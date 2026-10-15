/**
 * PROOF GIVEN COUNTS: A REFERENCE THE PERSON TYPES BACKS THE LINE IT WAS GIVEN FOR (Hafsah, 12 October
 * 2026).
 *
 * Night quality run 2, week 4. Hassan typed "I sold three this week. SJT3J5K7LM to Mr Ondieki,
 * SJT4L6M8NP to Mama Moraa and SJT5N7P9QR to Mr Obare, all in Kisii town." His record then read "You
 * gave this from memory. Nothing written backs it yet." Three M-Pesa codes counted for nothing.
 *
 * A transaction reference (an M-Pesa code, a receipt or a delivery-note number) typed in an answer is
 * written down evidence: it can be checked against the till. So a line of their record backs onto it
 * when the line carries the reference itself, or when the line was read from the very answer the
 * reference was typed in. The line is stored as not recalled, with origin "typed" (a source, see
 * COUNTS_AS_A_SOURCE) and the references as the passage that backs it, so it reads as proven
 * wherever how-a-line-is-known is read. A reference typed in an answer no line came from backs
 * nothing: it stays in the transcript, word for word, and no line is said to be backed by it.
 */

/* M-Pesa codes: ten capitals and digits, with at least two letters and one digit ("SJT3J5K7LM"). */
const MPESA = /\b(?=[A-Z0-9]{10}\b)(?=[A-Z0-9]*\d)(?=(?:[0-9]*[A-Z]){2})[A-Z0-9]{10}\b/g;
/* Delivery notes and receipts written with a prefix: "DN-1182", "RCPT-0042", "INV-2031". */
const PREFIXED = /\b(?:DN|GRN|RCPT|RCT|REC|INV|PO|TXN|REF)[-\s]?\d{3,}\b/gi;

/** Every reference in a piece of text, as typed, once each. */
export function theReferencesIn(text: string | null | undefined): string[] {
  const t = text ?? '';
  const found = [...(t.match(MPESA) ?? []), ...(t.match(PREFIXED) ?? [])];
  return [...new Set(found.map((x) => x.trim()))];
}

const flat = (s: string) => s.toLowerCase().replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim();

/** The answer a line was read from: the answer that holds the line, or most of its words. */
function theAnswerItCameFrom(line: string, answers: string[]): string | null {
  const l = flat(line).replace(/[.!?]+$/, '');
  if (!l) return null;
  const whole = answers.find((a) => flat(a).includes(l));
  if (whole) return whole;
  const words = l.split(' ').filter((w) => w.length > 2);
  if (words.length < 3) return null;
  let best: { a: string; share: number } | null = null;
  for (const a of answers) {
    const fa = flat(a);
    const share = words.filter((w) => fa.includes(w)).length / words.length;
    if (!best || share > best.share) best = { a, share };
  }
  return best && best.share >= 0.8 ? best.a : null;
}

export interface ARowToBack {
  text: string;
  recallBased?: boolean | null;
  anchoredDocumentId?: string | null;
  anchoredPassage?: string | null;
  anchoredOrigin?: string | null;
}

/**
 * Each row, backed by the references given for it. A row a document already backs is left alone.
 * `answers` is what the person typed in this check-in, each answer whole.
 */
export function aTypedReferenceBacksItsLine<T extends ARowToBack>(rows: T[], answers: string[]): T[] {
  return rows.map((row) => {
    if (row.recallBased === false || row.anchoredDocumentId) return row;
    const own = theReferencesIn(row.text);
    const from = own.length ? null : theAnswerItCameFrom(row.text, answers);
    const refs = own.length ? own : theReferencesIn(from);
    if (!refs.length) return row;
    return { ...row, recallBased: false, anchoredOrigin: 'typed', anchoredPassage: refs.join(', ') };
  });
}

/**
 * WHAT THE SESSION IS HANDED, so it acknowledges proof already given and never asks for it again.
 * One line per reference given so far in this check-in, with the answer it was given in.
 */
export function proofAlreadyGiven(answers: string[], sentThisSession: ADocumentSent[] = []): string {
  const lines: string[] = documentsAlreadyGiven(sentThisSession);
  for (const a of answers) {
    const refs = theReferencesIn(a);
    if (!refs.length) continue;
    lines.push(`- already given: ${refs.join(', ')}, for "${a.trim().slice(0, 240)}"`);
  }
  if (!lines.length) return '';
  return `PROOF ALREADY GIVEN IN THIS CHECK-IN. Each reference or document below is proof the person has already given. Thank them for it once, in plain words, and never ask for these references, or for proof of the lines they back, again in this check-in.\n${lines.join('\n')}`;
}

/** A document someone sent, as much of it as says what it is. */
export interface ADocumentSent {
  id: string;
  fileName: string;
  origin?: string | null;
  uploaderNote?: string | null;
  content?: string | null;
}

/** The references a document names: in its name, in what they said it was, or in what it reads. */
export function theReferencesADocumentNames(d: ADocumentSent): string[] {
  return theReferencesIn([d.fileName, d.uploaderNote, d.content].filter(Boolean).join('\n'));
}

/**
 * A PHOTO, DOCUMENT OR PIN BACKS THE LINE IT NAMES (Hafsah, 12 October). Night run 2: Amina's photo was
 * "Used to check DN-1182" and her record still read "Backed up: Nothing attached yet". A line not yet
 * backed that names a reference one of their own documents names is backed by that document. Returns
 * only the rows it backs, with what backs them.
 */
export function theLinesADocumentBacks<T extends ARowToBack & { id?: string }>(
  rows: T[],
  docs: ADocumentSent[],
): { row: T; doc: ADocumentSent; reference: string }[] {
  const out: { row: T; doc: ADocumentSent; reference: string }[] = [];
  for (const row of rows) {
    if (row.recallBased === false || row.anchoredDocumentId) continue;
    const refs = theReferencesIn(row.text);
    if (!refs.length) continue;
    for (const doc of docs) {
      const named = theReferencesADocumentNames(doc);
      const reference = refs.find((r) => named.some((n) => n.replace(/[-\s]/g, '').toUpperCase() === r.replace(/[-\s]/g, '').toUpperCase()));
      if (reference) { out.push({ row, doc, reference }); break; }
    }
  }
  return out;
}

/** What the session is handed for a document sent this session: already given, for what it names. */
export function documentsAlreadyGiven(docs: ADocumentSent[]): string[] {
  return docs.map((d) => {
    const refs = theReferencesADocumentNames(d);
    if (isALocationPin(d)) return `- already given: ${aLocationPinBacking(d)}`;
    const kind = /^image\//.test(String((d as any).mimeType ?? '')) || d.origin === 'photo' ? 'the photo' : 'the document';
    return `- already given: ${kind} "${d.fileName}"${refs.length ? `, for ${refs.join(', ')}` : ''}`;
  });
}

/* ---------- What a document was sent for ---------- */

const PIN_NAME = /^Location pin shared at /;
/** A location pin is kept as a document named "Location pin shared at ..." (documents/a-location-pin). */
export const isALocationPin = (d: ADocumentSent) => PIN_NAME.test(d.fileName ?? '');
/** "a location pin shared at 10:42 on Tuesday 13 October": what reads beside the line it backs. */
export const aLocationPinBacking = (d: ADocumentSent) => `a location pin shared at ${(d.fileName ?? '').replace(PIN_NAME, '').trim()}`;

const LITTLE = new Set(['that', 'this', 'with', 'were', 'have', 'been', 'your', 'their', 'they', 'from', 'what', 'week', 'about', 'there', 'which', 'when', 'will', 'into', 'would', 'show', 'proof', 'photo', 'send', 'share', 'could', 'does', 'did', 'for', 'the', 'and', 'you']);
const stem = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/ies$/, 'y').replace(/(?:es|s)$/, '');
const words = (t: string) => new Set(String(t ?? '').split(/[\s/,.;:!?()“”"']+/).map(stem).filter((w) => w.length > 3 && !LITTLE.has(w)));

export interface ATurnInTheSession { role: string; content: string; createdAt: Date | string }

/**
 * THE LINE A DOCUMENT, PHOTO OR PIN WAS SENT FOR (Hafsah, 12 October). The line the place on a pin names,
 * where it has a name or address; otherwise the line the question it answered was about: the last thing
 * the session asked before it was sent, matched to the line that shares the most of its words (two at
 * least). Null where neither finds one: it is kept, and backs nothing.
 */
export function theLineADocumentWasSentFor<T extends ARowToBack>(
  rows: T[],
  doc: ADocumentSent & { createdAt: Date | string },
  turns: ATurnInTheSession[],
): { row: T; passage: string } | null {
  const open = rows.filter((r) => r.recallBased !== false && !r.anchoredDocumentId);
  if (!open.length) return null;
  const passage = isALocationPin(doc) ? aLocationPinBacking(doc) : `${doc.origin === 'photo' ? 'the photo' : 'the document'} "${doc.fileName}"`;
  const best = (about: Set<string>): T | null => {
    let top: { r: T; n: number } | null = null;
    for (const r of open) {
      const n = [...words(r.text)].filter((w) => about.has(w)).length;
      if (n >= 2 && (!top || n > top.n)) top = { r, n };
    }
    return top?.r ?? null;
  };
  if (isALocationPin(doc)) {
    const place = /The pin is named ([^.]+)\.|The address on the pin is ([^.]+)\./.exec(doc.content ?? '');
    const named = place ? words(place[1] ?? place[2] ?? '') : new Set<string>();
    const byPlace = named.size ? open.find((r) => [...words(r.text)].some((w) => named.has(w))) : undefined;
    if (byPlace) return { row: byPlace, passage };
  }
  const sentAt = new Date(doc.createdAt).getTime();
  const asked = [...turns]
    .filter((t) => t.role === 'AI' && new Date(t.createdAt).getTime() <= sentAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (!asked) return null;
  const row = best(words(asked.content));
  return row ? { row, passage } : null;
}
