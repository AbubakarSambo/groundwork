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
 * One line as the person reads it: the assessment's own sentence for the item, written to them, where it wrote one.
 *
 * THE SENTENCE IS THE MODEL'S, NOT STITCHED (release test, 21 November 2026, bugs 9 and 10). The line was built here from pieces: their
 * quoted words, then "which I recorded as" and the item's fields joined with commas, with a word list deciding which words were "a piece of
 * an answer". It read "which I recorded as new shop sign-ups, at One signed with order, one verbal commitment., 20 cartons.", "You said
 * “wait 5 days”." and "You answered “on tues”, which I recorded as on tues, saw Naivas." The assessment now writes each item's line as one
 * whole sentence (`saidBack`), and that is what is said. A corrected item, or one with no sentence, is said in their own words.
 */
export function aLineAsTheyReadIt(f: Pick<AFact, 'words' | 'saidWordForWord'> & { saidBack?: string | null }): string {
  const own = (f.saidBack ?? '').trim();
  if (own) return /[.!?]$/.test(own) ? own : `${own}.`;
  const w = theWordsAlone(f.words);
  if (f.saidWordForWord) return `You said ${theirWordsAsSaid(w, true)}.`;
  /* Said plainly, not quoted: the words are theirs, so "I want 9 a week" is "You want 9 a week", never Groundwork saying "I want". */
  const you = asTheReader(w);
  return `${you.charAt(0).toUpperCase()}${you.slice(1)}.`;
}

/** The read-back from the assessment, or null when it holds nothing of theirs to say back. */
export function theReadBackFrom(a: TheAssessment | null): { text: string; lines: ALineReadBack[] } | null {
  if (!a) return null;
  const theirs = theFactsIn(a, { kind: 'the person', participantId: a.about.participantId })
    .filter((f) => !NOT_READ_BACK.test(f.section) && f.participantId === a.about.participantId)
    .map((f) => ({ f, key: theWordsAlone(f.words).toLowerCase() }))
    .filter((x) => x.key);
  /*
   * ONE THING SAID ONCE, THE FULLER WAY, WHATEVER ORDER THE ITEMS CAME IN (release test, 22 November 2026, bugs 9 and 10). Amani's one
   * message was read into a wait with its whole sentence ("You are waiting on Baraka in operations for the delivery schedule...") and into a
   * number and a date made of pieces of it ("wait 5 days", "by next friday"), which were then said back as quoted fragments beside it. Only
   * a later piece was dropped before, so it depended on the order. Words that sit inside another of their items' words are that item.
   */
  const insideAnother = (x: (typeof theirs)[number], i: number) => theirs.some((y, j) => j !== i && y.key.includes(x.key)
    && (y.key.length > x.key.length || (!!y.f.saidBack && !x.f.saidBack) || (!!y.f.saidBack === !!x.f.saidBack && j < i)));
  /*
   * ONLY WHAT THE ASSESSMENT SAID AS A SENTENCE, WHERE IT SAID ANY (final run, 22 November 2026). An item the model gave no sentence for
   * was said as their quoted words, and those were the fragments still read back ("You said “mercy in procurement says friday”."). Where
   * the assessment wrote sentences, those are the read-back; the other items stay on the record and can be put right through the same
   * "Is anything wrong?". Their own words are quoted only for a conversation the assessment wrote no sentence for at all.
   */
  const kept = theirs.filter((x, i) => !insideAnother(x, i));
  const withSentences = kept.filter(({ f }) => !!f.saidBack);
  const lines: ALineReadBack[] = (withSentences.length ? withSentences : kept)
    .map(({ f }) => ({ id: `${f.checkInId}#${f.itemId}`, says: aLineAsTheyReadIt(f) }));
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
