/**
 * THEIR QUOTATION MARKS ARE PART OF THEIR WORDS.
 *
 * All-24 run 12. The record reader wrote two lines that were the person's words exactly, except for
 * the quotation marks:
 *
 *   Yemi Ojo typed:        On track, for me, meant that there weren't any major disruptions or escalations.
 *   The record held:       'On track', for me, meant that there weren't any major disruptions or escalations.
 *
 *   Dr Amina Bello typed:  I haven't explicitly said "get me out of these meetings." I did say he would own the relationships in his interview.
 *   The record held:       I haven't explicitly said 'get me out of these meetings.' I did say he would own the relationships in his interview.
 *
 * Marks added where there were none, and double marks made single. Each line was then, correctly,
 * not stamped as their own words (see reports/a-quote-is-what-they-said, saidWordForWord), so it
 * could never be quoted; and a line built at the read copied the reader's marks and served them as a
 * quote nobody made. The prompt now tells the reader to keep the marks as typed. This is what makes
 * that hold, because a model asked to keep punctuation is the thing that just failed.
 *
 * WHAT IT DOES. Where a record line is the same as a passage of what the person typed in every
 * character except its quotation marks and the space between words, the passage goes in its place:
 * their words with their marks, exactly. Anything else about the line - a word changed, a name put in
 * square brackets, a clause trimmed - and it is left as the reader wrote it, because then it is the
 * reader's version and the marks are not the only difference. The reader's own note ("[INFERRED:
 * ...]") at the end is held aside and put back.
 *
 * An apostrophe is not a quotation mark: a single mark between two letters or digits (don't, it's,
 * Kwame's) is part of the word and must match, straight or curly. Pure; nothing here reads the
 * database.
 */

const DOUBLE = new Set(['"', '“', '”']);
const SINGLE = new Set(["'", '‘', '’']);
const LETTER = /[\p{L}\p{N}]/u;

/** Whether the character at `i` is being used as a quotation mark rather than as an apostrophe. */
function isAMark(s: string, i: number): boolean {
  const c = s[i];
  if (DOUBLE.has(c)) return true;
  if (!SINGLE.has(c)) return false;
  return !(LETTER.test(s[i - 1] ?? '') && LETTER.test(s[i + 1] ?? ''));
}

/** The text without its quotation marks and with every run of space made one, and where each kept character came from. */
function skeleton(s: string): { text: string; at: number[] } {
  let text = '';
  const at: number[] = [];
  for (let i = 0; i < s.length; i += 1) {
    if (isAMark(s, i)) continue;
    let c = s[i];
    if (/\s/.test(c)) {
      if (!text || text.endsWith(' ')) continue;
      c = ' ';
    } else if (SINGLE.has(c)) {
      c = "'";
    }
    text += c;
    at.push(i);
  }
  if (text.endsWith(' ')) { text = text.slice(0, -1); at.pop(); }
  return { text, at };
}

/* The reader's note of what a word referred to, at the end of a line. It is the reader's, never the person's. */
const THE_READERS_NOTES_AT_THE_END = /(\s*\[INFERRED:[^\]]*\])+\s*$/i;

/** Double marks come in pairs; a passage that would leave one open is not theirs as a passage. */
const doubleMarksPair = (s: string): boolean => [...s].filter((c) => DOUBLE.has(c)).length % 2 === 0;

/**
 * The line with the person's own quotation marks, where the marks are the only thing between it and
 * a passage of what they typed. Otherwise the line exactly as it was.
 */
export function theirQuotationMarksBack(line: string, whatTheyTyped: string[]): string {
  if (!line) return line;
  const note = (line.match(THE_READERS_NOTES_AT_THE_END) ?? [''])[0];
  const body = note ? line.slice(0, line.length - note.length) : line;
  const want = skeleton(body.trim());
  if (!want.text || !LETTER.test(want.text)) return line;
  for (const turn of whatTheyTyped) {
    const typed = String(turn ?? '');
    const have = skeleton(typed);
    const from = have.text.indexOf(want.text);
    if (from < 0) continue;
    /* A match must start and end on a word's edge, so "track" is never found inside "tracking". */
    if (LETTER.test(have.text[from - 1] ?? '') && LETTER.test(want.text[0])) continue;
    if (LETTER.test(have.text[from + want.text.length] ?? '') && LETTER.test(want.text[want.text.length - 1])) continue;
    let start = have.at[from];
    let end = have.at[from + want.text.length - 1] + 1;
    /* A mark that opens or closes the passage, right against it, is theirs too. */
    while (start > 0 && isAMark(typed, start - 1)) start -= 1;
    while (end < typed.length && isAMark(typed, end)) end += 1;
    let passage = typed.slice(start, end);
    if (!doubleMarksPair(passage)) {
      /* The edge marks may belong to the words around the passage rather than to it. */
      passage = typed.slice(have.at[from], have.at[from + want.text.length - 1] + 1);
      if (!doubleMarksPair(passage)) continue;
    }
    return `${passage.replace(/\s+/g, ' ')}${note}`;
  }
  return line;
}
