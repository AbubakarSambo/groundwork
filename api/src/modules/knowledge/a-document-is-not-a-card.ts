/**
 * A HANDBOOK IS ONE DOCUMENT AND THE ASSISTANT ANSWERS FROM CARDS.
 *
 * Knowledge cards work: they supersede rather than update, retrieval is hybrid and logged, and
 * "how we work" quotes them rather than paraphrasing. What nothing did was get a real document into
 * them. A customer with a forty-page handbook had to split it into cards themselves and keep the
 * split in step with their own document by hand - so the realistic outcome was that they pasted the
 * whole thing into one card, and retrieval that caps at 6,000 characters returned a handbook.
 *
 * CHUNKS ARE CARDS, AND THAT IS THE WHOLE DESIGN. Nothing here adds a retrieval path, a table or a
 * cap. A chunk is a card with a derived key, so supersession, the effective-from history, the
 * retrieval log, the character budget and the "what was our policy in March" query all work on
 * documents the day this ships, because none of them can tell the difference.
 *
 * WHAT THIS IS NOT: a parser. It takes text. Turning a PDF or a Word file into text is a different
 * job with different failure modes, and a chunker that also guessed at file formats would fail at
 * both in ways that look the same from outside.
 */

/**
 * The character budget for one chunk.
 *
 * Retrieval keeps whole cards up to MAX_CHARS across at most MAX_CARDS of them. A chunk near that
 * ceiling means one chunk is the entire answer and the second-best match is dropped for lack of
 * room; a chunk of two sentences means the words that matter are spread over more cards than
 * retrieval will return. This sits where several chunks fit in one answer.
 */
export const CHUNK_CHARS = 1_200;

/**
 * A paragraph longer than this is split on sentences rather than kept whole.
 *
 * Not the same number as CHUNK_CHARS, deliberately. Slight overshoot is better than cutting a
 * paragraph, because a policy split down the middle answers half a question with no sign that the
 * other half exists - so a paragraph is kept intact up to here, and only a genuinely long one is
 * broken.
 */
export const KEEP_WHOLE_UP_TO = 1_800;

export interface Chunk {
  /** 1-based, and part of the key, so chunk order is recoverable from the card alone. */
  index: number;
  /** The nearest heading above this text, or the document's own title. */
  heading: string;
  body: string;
}

/**
 * A LINE THAT IS A HEADING, WITHOUT A MARKUP PARSER.
 *
 * Three shapes people actually write: a markdown heading, an ALL CAPS line, and a short line with
 * no terminal punctuation followed by a blank line. The last is the loose one and it is kept short
 * on purpose - a long line with no full stop is far more often a wrapped sentence than a heading,
 * and promoting one turns a mid-sentence fragment into the title of a card somebody gets quoted.
 */
export function isHeading(line: string, next: string | undefined): boolean {
  const t = line.trim();
  if (!t || t.length > 80) return false;
  if (/^#{1,6}\s+\S/.test(t)) return true;
  if (/^\d+(\.\d+)*[.)]?\s+\S/.test(t) && t.length <= 60 && !/[.!?]$/.test(t)) return true;
  if (t === t.toUpperCase() && /[A-Z]/.test(t) && t.length <= 60) return true;
  return t.length <= 60 && !/[.!?,;:]$/.test(t) && (next === undefined || next.trim() === '');
}

const cleanHeading = (t: string) => t.replace(/^#{1,6}\s+/, '').replace(/^\d+(\.\d+)*[.)]?\s+/, '').trim();

/** Split a paragraph that is too long to keep whole, on sentence ends and never mid-word. */
function sentences(text: string): string[] {
  const out: string[] = [];
  let from = 0;
  const re = /[.!?]["')\]]?\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(text.slice(from, m.index + m[0].length).trim());
    from = m.index + m[0].length;
  }
  const rest = text.slice(from).trim();
  if (rest) out.push(rest);
  /*
   * A wall of text with no sentence punctuation at all - a pasted table, a list of names - would
   * otherwise come back as one oversized piece and defeat the budget entirely. Cut it on width, and
   * only ever here, where there is nothing better to cut on.
   */
  if (out.length === 1 && out[0].length > KEEP_WHOLE_UP_TO) {
    const forced: string[] = [];
    for (let i = 0; i < out[0].length; i += CHUNK_CHARS) forced.push(out[0].slice(i, i + CHUNK_CHARS));
    return forced;
  }
  return out;
}

/**
 * Split a document into chunks, packing paragraphs up to the budget and never crossing a heading.
 *
 * NEVER CROSSING A HEADING is the part that matters for the answer somebody gets. A chunk holding
 * the end of the expenses policy and the start of the leave policy is retrieved for a question
 * about either and quoted as though both were the answer to it.
 */
export function chunk(documentTitle: string, text: string): Chunk[] {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const chunks: Chunk[] = [];

  let heading = documentTitle.trim() || 'Untitled';
  let buffer: string[] = [];
  let size = 0;

  const flush = () => {
    const body = buffer.join('\n\n').trim();
    buffer = [];
    size = 0;
    if (body) chunks.push({ index: chunks.length + 1, heading, body });
  };

  /* Paragraphs, with the heading lines pulled out as they are met. */
  let para: string[] = [];
  const takeParagraph = () => {
    const p = para.join(' ').replace(/\s+/g, ' ').trim();
    para = [];
    if (!p) return;
    const pieces = p.length > KEEP_WHOLE_UP_TO ? sentences(p) : [p];
    for (const piece of pieces) {
      if (size && size + piece.length > CHUNK_CHARS) flush();
      buffer.push(piece);
      size += piece.length;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { takeParagraph(); continue; }
    if (isHeading(line, lines[i + 1])) {
      takeParagraph();
      /* The heading belongs to what follows it, so everything before it is finished first. */
      flush();
      heading = cleanHeading(line) || heading;
      continue;
    }
    para.push(line);
  }
  takeParagraph();
  flush();

  return chunks;
}

/**
 * The card key for a chunk.
 *
 * Derived rather than stored, so the same document uploaded again lands on the same keys and every
 * chunk supersedes its own previous version instead of creating a parallel set. The `#` is what
 * makes a document's chunks findable as a group when a shorter version leaves some behind.
 */
export const chunkKey = (documentKey: string, index: number) => `${documentKey}#${index}`;

/** Reading a chunk's document back out of its key. Kept next to the maker so they cannot diverge. */
export function documentKeyOf(cardKey: string): string | null {
  const at = cardKey.lastIndexOf('#');
  return at > 0 ? cardKey.slice(0, at) : null;
}

/**
 * The card title.
 *
 * Both parts, always. A retrieved card is quoted to somebody, and "Expenses" alone does not say
 * which document it is the expenses section of - a company with a staff handbook and a contractor
 * handbook has two, and they disagree.
 */
export function chunkTitle(documentTitle: string, c: Chunk): string {
  const doc = documentTitle.trim();
  const h = c.heading.trim();
  return !h || h === doc ? doc : `${doc} - ${h}`;
}
