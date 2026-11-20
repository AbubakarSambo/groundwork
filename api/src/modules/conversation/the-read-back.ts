/**
 * THE READ-BACK AT THE END OF A CHECK-IN, FROM THE ASSESSMENT, ONCE (docs/fix-plan.md, batch 2 group 4; staging S5 and S6, item 5, and the
 * first principle).
 *
 * WHY. The read-back was built from the conversation's working notes while the end and every page read the close's assessment: two
 * readings of the same words, worded differently (item 5). It arrived in the same message as a new question, so it read twice and left
 * Rita's promise out (S6). And its lines had no ids, so "That's not right, it's two days" could not be tied to the line it corrects and
 * got "I am not sure what this refers to." (S5).
 *
 * NOW. When the check-in reaches its close, the conversation is assessed (the one reading every page reads), and the read-back is that
 * assessment's lines, as the person may read them (theFactsIn), each with the item id kept behind it on the stored assessment
 * (`readBack`). It is sent alone, as the last message before the close, with nothing else in it and no new question. Their reply is read
 * by the model: a correction goes through the same claim probe as any correction (checkTheCorrection, assistant/
 * a-correction-is-checked-like-a-claim.ts) against those lines, and is kept on the item it corrects, so every page changes; Groundwork
 * says plainly what it changed. Anything else goes to the conversation as before. The working-notes read-back is gone.
 *
 * Only their own lines are said back to them (the person's reader), so nothing about them from anybody else, and no judgement, reaches it.
 */
import { theFactsIn, type AFact } from './the-facts-on-record';
import { theirWordsAsSaid, theWordsAlone } from './their-words-as-said';
import type { TheAssessment } from './the-assessment';
import { asTheReader } from '../grounds/what-a-participant-is-told-about-this';

export const THE_READ_BACK_OPENS = 'Here’s what I recorded.';
export const THE_READ_BACK_ASKS = 'Is anything wrong? Tell me and I will put it right.';

/** One line read back, with the item it came from: "<checkInId>#<itemId>", as every correction names a line. */
export interface ALineReadBack { id: string; says: string }

/* What is read back: what they said about the work. Not what was compared with last time (the record already holds it), and not setup. */
const NOT_READ_BACK = /^(?:setup\.|compared\.)/;

/**
 * A piece of an answer, not a statement: it starts with a small joining word ("by 31 January 2027", "in Nakuru") or is one or two words.
 * Said back on its own in quotation marks it read as a fragment (run 8: You said "by 31 January 2027".), so it is said as an answer, with what
 * it was recorded as where the item holds that.
 */
const A_PIECE_OF_AN_ANSWER = /^(?:by|on|in|at|for|to|until|till|from|with|about|around|before|after|since|next|this|every|each)\b/i;
export function isAPieceOfAnAnswer(words: string): boolean {
  const w = theWordsAlone(words);
  return A_PIECE_OF_AN_ANSWER.test(w) || w.split(/\s+/).filter(Boolean).length <= 2;
}

/**
 * One line as the person reads it: their own words in quotation marks only where they typed them word for word, and always a whole sentence.
 *
 * AN ANSWER JOINED INTO A LINE IS SAID BACK WITH IT (WhatsApp test, 20 November 2026, C26). Chidi's "buyer said friday, im on it with mercy in
 * procurement" was read into the item for "still chasing naivas PO" (who it waits on, and when), and the read-back quoted only "still chasing
 * naivas PO", so Friday and Mercy were nowhere in what he was asked to check. Where an item was read from more than one of their messages, what
 * it was recorded as is said with it.
 */
export function aLineAsTheyReadIt(f: Pick<AFact, 'words' | 'saidWordForWord'> & { detail?: string | null; fromMessages?: number }): string {
  const w = theWordsAlone(f.words);
  const what = (f.detail ?? '').trim().replace(/[.!?]+$/, '');
  const recordedAs = what ? `, which I recorded as ${what.charAt(0).toLowerCase()}${what.slice(1)}` : '';
  if (f.saidWordForWord && isAPieceOfAnAnswer(w)) return `You answered ${theirWordsAsSaid(w, true)}${recordedAs}.`;
  if (f.saidWordForWord) return `You said ${theirWordsAsSaid(w, true)}${(f.fromMessages ?? 0) > 1 ? recordedAs : ''}.`;
  /* Said plainly, not quoted: the words are theirs, so "I want 9 a week" is "You want 9 a week", never Groundwork saying "I want". */
  const you = asTheReader(w);
  return `${you.charAt(0).toUpperCase()}${you.slice(1)}.`;
}

/** The read-back from the assessment, or null when it holds nothing of theirs to say back. */
export function theReadBackFrom(a: TheAssessment | null): { text: string; lines: ALineReadBack[] } | null {
  if (!a) return null;
  const seen = new Set<string>();
  const lines: ALineReadBack[] = [];
  for (const f of theFactsIn(a, { kind: 'the person', participantId: a.about.participantId })) {
    if (NOT_READ_BACK.test(f.section) || f.participantId !== a.about.participantId) continue;
    const key = theWordsAlone(f.words).toLowerCase();
    if (!key || seen.has(key) || [...seen].some((k) => k.includes(key))) continue;
    seen.add(key);
    lines.push({ id: `${f.checkInId}#${f.itemId}`, says: aLineAsTheyReadIt(f) });
  }
  if (!lines.length) return null;
  return { text: [THE_READ_BACK_OPENS, ...lines.map((l) => l.says), THE_READ_BACK_ASKS].join('\n'), lines };
}

/** The lines read back, kept on the stored assessment, so a reply after it can name the one it is about. */
export function theReadBackKeptOn(column: unknown, lines: ALineReadBack[]): unknown {
  return column && typeof column === 'object' ? { ...(column as object), readBack: lines } : column;
}

/** The lines read back on this check-in, or none. */
export function theLinesReadBackIn(column: unknown): ALineReadBack[] {
  const r = (column as any)?.readBack;
  return Array.isArray(r) ? r.filter((l: any) => l && typeof l.id === 'string' && typeof l.says === 'string') : [];
}

/** Said to the model on the turns after the read-back, for anything that is not a correction. */
export const THE_READ_BACK_WAS_GIVEN = [
  'YOU HAVE SAID BACK WHAT WAS RECORDED AND ASKED WHETHER ANYTHING IS WRONG.',
  'If they say it is right, or have nothing to change, close now in one short sentence with [[SESSION_COMPLETE]]. If they add something new, take it and carry on.',
  'Never read the list back again.',
].join(' ');
