/**
 * THE PASSAGES THAT MATTER, WHEN A DOCUMENT DOES NOT FIT WHOLE.
 *
 * A thirty page architecture document beside a twenty page spec used to reach the prompt as "the
 * first sixty thousand characters, newest file first", and the model's attention decided what
 * mattered. Now a document that does not fit is cut into passages at its own paragraph breaks and
 * the passages are ranked by what the person is talking about right now: the words of their latest
 * message and of the brief they are working to. What goes in is the passages that share those
 * words, in the document's own order, with a heading that says so - the same honesty the whole-room
 * rule already had, applied to which part rather than how much.
 *
 * Pure, so it can be read and tested without a database. No model call: this is retrieval, and a
 * retrieval that needed a model to choose what to show the model would be the problem twice.
 */

export interface APassage {
  /** Where it starts in the document, so the order can be restored. */
  at: number;
  text: string;
}

export const PASSAGE_CHARS = 1_200;

const STOP = new Set([
  'the', 'and', 'for', 'our', 'you', 'your', 'how', 'what', 'does', 'with', 'this', 'that', 'are', 'can', 'have', 'has',
  'from', 'they', 'them', 'their', 'there', 'about', 'into', 'onto', 'over', 'under', 'then', 'than', 'some', 'any', 'all',
  'was', 'were', 'will', 'would', 'should', 'could', 'been', 'being', 'just', 'like', 'also', 'when', 'where', 'which', 'who',
  'not', 'but', 'its', 'it', 'is', 'in', 'on', 'of', 'to', 'a', 'an', 'as', 'at', 'by', 'or', 'we', 'i', 'my', 'me', 'be', 'do',
]);

export function wordsOf(text: string): Set<string> {
  return new Set(
    (text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOP.has(w)),
  );
}

/** Cut at blank lines first, then at sentence ends, so a passage is a thought and not a window. */
export function passagesOf(content: string, size = PASSAGE_CHARS): APassage[] {
  const out: APassage[] = [];
  const paragraphs = content.split(/\n\s*\n/);
  let at = 0;
  let buffer = '';
  let bufferAt = 0;
  const flush = () => {
    if (buffer.trim()) out.push({ at: bufferAt, text: buffer.trim() });
    buffer = '';
  };
  for (const p of paragraphs) {
    if (p.length > size) {
      flush();
      /* One paragraph longer than a passage: split on sentence ends, never mid-word. */
      const sentences = p.split(/(?<=[.!?])\s+/);
      let chunk = '';
      let chunkAt = at;
      for (const s of sentences) {
        if (chunk && chunk.length + s.length + 1 > size) {
          out.push({ at: chunkAt, text: chunk.trim() });
          chunkAt += chunk.length + 1;
          chunk = '';
        }
        chunk += (chunk ? ' ' : '') + s;
      }
      if (chunk.trim()) out.push({ at: chunkAt, text: chunk.trim() });
      bufferAt = at + p.length + 2;
    } else if (buffer && buffer.length + p.length + 2 > size) {
      flush();
      bufferAt = at;
      buffer = p;
    } else {
      if (!buffer) bufferAt = at;
      buffer += (buffer ? '\n\n' : '') + p;
    }
    at += p.length + 2;
  }
  flush();
  return out;
}

export interface Chosen {
  /** The passages, in document order, joined for the prompt. */
  text: string;
  /** How many of the document's passages this is. */
  kept: number;
  of: number;
  /** Whether anything matched at all. When nothing does, the choice falls back to the opening. */
  byMatch: boolean;
}

/**
 * The passages that share the most words with what is being discussed, up to `room` characters,
 * returned in document order. Ties go to the earlier passage, because the opening of a document is
 * where it says what it is. When nothing matches, the opening is what goes in - the old behaviour,
 * now the fallback rather than the rule.
 */
export function passagesThatMatter(content: string, about: string, room: number): Chosen {
  const all = passagesOf(content);
  if (!all.length) return { text: '', kept: 0, of: 0, byMatch: false };
  const want = wordsOf(about);
  const scored = all.map((p, i) => {
    const have = wordsOf(p.text);
    let hits = 0;
    for (const w of want) if (have.has(w)) hits++;
    return { p, i, score: want.size ? hits / Math.sqrt(have.size || 1) : 0, hits };
  });
  const anyMatch = scored.some((s) => s.hits > 0);
  const order = anyMatch
    ? [...scored].sort((a, b) => b.score - a.score || a.i - b.i)
    : scored;
  const chosen: typeof scored = [];
  let spent = 0;
  for (const s of order) {
    if (anyMatch && s.hits === 0) break;
    if (spent + s.p.text.length + 2 > room) continue;
    chosen.push(s);
    spent += s.p.text.length + 2;
  }
  chosen.sort((a, b) => a.i - b.i);
  return { text: chosen.map((c) => c.p.text).join('\n\n'), kept: chosen.length, of: all.length, byMatch: anyMatch };
}
