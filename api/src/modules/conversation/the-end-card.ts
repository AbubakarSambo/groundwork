import { howALineIsKnown } from '../reports/how-a-line-is-known';
import { cleanText } from '../reports/what-the-record-actually-holds';

/**
 * THE END OF A CHECK-IN: WHAT IS NOW IN YOUR RECORD, AND WHAT WOULD CHANGE IT (task 2.7, screens
 * request 7b, week 6 of docs/weekly-plan.md).
 *
 * The prototype's end card (docs/prototype/screens/B3-the-check-in/check-in-end-card.txt) shows, under
 * "What is now in your record", each line the answers put in the record and how it is known: "Green
 * Mart has a quote / From the photo you added", "Green Mart will buy in January / You said this.",
 * "You'll visit Westgate Deli on Friday / You said you will do this. I will ask you how it went." Then,
 * under "What happens next", what would change a line.
 *
 * Built from the lines the record reader took out of this conversation, the same lines that are
 * written when the person finishes, so the card and the record say the same thing. `says` is the
 * line as recorded: the person's own words, not rewritten. The mark describes the line, never the
 * person, and nothing here says how anybody's answers were rated.
 *
 * The four marks follow docs/backend-map.md: a document means proven, memory means memory only, the
 * rest means their word. "Confirmed by the person who received it" is the colleague who was waiting
 * on the work saying it arrived (confirmed-by-who-received-it.ts); a line said a minute ago has
 * rarely been confirmed yet, so on this card it is rare.
 *
 * The screens add when the next check-in opens and "If you don't want to talk about something yet,
 * that's fine" themselves, so neither is here.
 */

export type EndCardMark = 'proven' | 'confirmed' | 'said' | 'memory';

export interface EndCard {
  inYourRecord?: { says: string; how?: string; mark?: EndCardMark }[];
  next?: string[];
}

export interface ALineForTheCard {
  type: string;
  text: string;
  recallBased?: boolean | null;
  anchoredDocumentId?: string | null;
  anchoredOrigin?: string | null;
  disputedAt?: Date | string | null;
  /** Set when the colleague who received the work said it arrived. See confirmed-by-who-received-it. */
  confirmedAt?: Date | string | null;
  /** Whether the document that backs it is a photo, so the card can say so. */
  backedByAPhoto?: boolean;
  /** False when the document that backs it was added by somebody else, which proves nothing of theirs. */
  documentIsTheirOwn?: boolean;
}

export const HOW: Record<'photo' | 'screenshot' | 'receipt' | 'invoice' | 'document' | 'confirmed' | 'commitment' | 'memory' | 'said', string> = {
  photo: 'From the photo you added.',
  screenshot: 'From the screenshot you added.',
  receipt: 'From the receipt you added.',
  invoice: 'From the invoice you added.',
  document: 'From the document you added.',
  confirmed: 'The person who received it confirmed it.',
  commitment: 'You said you will do this. I will ask you how it went.',
  memory: 'You gave this from memory. Nothing written backs it yet.',
  said: 'You said this.',
};

export const WHAT_WOULD_MAKE_IT_PROVEN =
  'If you have something written for any of these, such as a message or a photo, add it. Then that line counts as proven.';

/**
 * THE CARD'S WORDS IN THE PLAINER FORM, FOR A CHECK-IN SET TO "USE SIMPLER WORDS". Short sentences,
 * everyday words. Picked only when the lead has switched the setting on; the lines themselves, which
 * are the person's own words, are never changed.
 */
export const HOW_IN_SIMPLER_WORDS: typeof HOW = {
  photo: 'This comes from the photo you added.',
  screenshot: 'This comes from the screenshot you added.',
  receipt: 'This comes from the receipt you added.',
  invoice: 'This comes from the invoice you added.',
  document: 'This comes from the document you added.',
  confirmed: 'The person who received it said this is true.',
  commitment: 'You said you will do this. I will ask you how it went.',
  memory: 'You said this from memory. You have nothing written for it yet.',
  said: 'You said this.',
};
export const WHAT_WOULD_MAKE_IT_PROVEN_IN_SIMPLER_WORDS =
  'Do you have something written for any of these, like a message or a photo? Add it. Then that line is proven.';

/** At most this many lines: the card is read in the moment before finishing, on a phone. Commitments come first, and a card that leaves lines out says how many. */
export const AT_MOST = 6;

/*
 * WHAT KIND OF THING PROVED IT, IN THE CARD'S WORDS (week 15). A photo counts exactly as a document
 * does; the person is told it was the photo. The kind is read from the line's own anchoredOrigin, so
 * a card built from the stored record (not only the first card, which also knew the file type) says
 * "From the photo you added." too.
 */
export function whatProvedIt(line: Pick<ALineForTheCard, 'backedByAPhoto' | 'anchoredOrigin'>, simplerWords = false): string {
  const how = simplerWords ? HOW_IN_SIMPLER_WORDS : HOW;
  if (line.anchoredOrigin === 'receipt') return how.receipt;
  if (line.anchoredOrigin === 'invoice') return how.invoice;
  if (line.anchoredOrigin === 'screenshot') return how.screenshot;
  if (line.anchoredOrigin === 'photo' || line.backedByAPhoto) return how.photo;
  return how.document;
}

/* The mark is the reports' rule (reports/how-a-line-is-known.ts), so a line reads the same on both. */
function markFor(line: ALineForTheCard, simplerWords = false): { mark: EndCardMark; how: string } {
  const how = simplerWords ? HOW_IN_SIMPLER_WORDS : HOW;
  const mark = howALineIsKnown(line);
  if (mark === 'proven') return { mark, how: whatProvedIt(line, simplerWords) };
  if (mark === 'confirmed') return { mark, how: how.confirmed };
  if (mark === 'memory') return { mark, how: how.memory };
  return { mark, how: line.type === 'COMMITMENT' ? how.commitment : how.said };
}

/**
 * THE LINE AS A PERSON READS IT. The engine's own notes come off, the way every report takes them
 * off (cleanText): the reviewer read "I haven't had that conversation with Tobi yet. [INFERRED: about
 * him taking over the scheduling]" on a card. Then it starts with a capital letter and ends as a
 * sentence. Their words are otherwise left exactly as recorded.
 */
export function asTheyReadIt(text: string): string {
  const clean = cleanText(String(text ?? '')).replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const capital = clean.charAt(0).toUpperCase() + clean.slice(1);
  return /[.!?…]["'”’)]*$/.test(capital) ? capital : `${capital}.`;
}

/**
 * WHEN NOT EVERY LINE FITS, SAY SO. The reviewer read a card that had dropped the commitment, the
 * line that matters most, because it came seventh. Commitments now come first, and a card that
 * leaves lines out says how many, in one plain sentence.
 */
export function theLinesLeftOut(count: number, simplerWords = false): string | null {
  if (count <= 0) return null;
  if (simplerWords) {
    return count === 1
      ? '1 more line is in your record. You can read it after you finish.'
      : `${count} more lines are in your record. You can read them after you finish.`;
  }
  return count === 1
    ? 'There is 1 more line in your record. You can read it in your record after you finish.'
    : `There are ${count} more lines in your record. You can read them all in your record after you finish.`;
}

/**
 * WHAT THEY WERE ASKED TO SHOW, AND DID NOT (sales-first.md, section 5; the light prototype's s68).
 *
 * Miriam was asked "Can you add the quote? A photo of it is enough." and tapped "Later". Her card must
 * not say a photo was added, and the prototype has the line say what would prove it: "You said this. A
 * photo of the quote would prove it." This reads the thing Groundwork asked for a photo of from this
 * check-in's own questions ("add the quote", "a photo of the quote"), one word, or null. Things that are
 * themselves the proof ("the photo", "the document") are not an answer. Only this check-in's turns are
 * ever passed in.
 */
const NOT_A_THING_TO_SHOW = new Set(['photo', 'picture', 'document', 'file', 'proof', 'screenshot', 'copy', 'one', 'same', 'other', 'rest', 'details', 'link']);
export function whatTheyWereAskedToShow(questions: readonly (string | null | undefined)[]): string | null {
  let found: string | null = null;
  for (const q of questions ?? []) {
    const said = String(q ?? '');
    const m = said.match(/\b(?:photo|picture|copy|screenshot) of (?:the|your) ([a-z]+)\b/i)
      ?? said.match(/\b(?:add|send|upload|share) (?:the|your) ([a-z]+)\b/i);
    const thing = m?.[1]?.toLowerCase();
    if (thing && !NOT_A_THING_TO_SHOW.has(thing)) found = thing;
  }
  return found;
}

/** The line about a thing they were asked to show and did not: what would prove it, in the prototype's words. */
export function whatAPhotoWouldProve(thing: string): string {
  return `You said this. A photo of the ${thing} would prove it.`;
}

/**
 * `askedToShow` is what Groundwork asked them for a photo of in this check-in, when nothing was added
 * since (whatTheyWereAskedToShow). A line about it that only rests on their word says so. Leave it out
 * when a document was added, so nothing here can read as a photo missing that was in fact sent.
 */
export function theEndCard(lines: readonly ALineForTheCard[], simplerWords = false, askedToShow: string | null = null): EndCard | null {
  const all = (lines ?? []).filter((l) => !l.disputedAt && asTheyReadIt(l.text));
  /* Commitments first, then the rest in the order they were said. */
  const ordered = [...all.filter((l) => l.type === 'COMMITMENT'), ...all.filter((l) => l.type !== 'COMMITMENT')];
  const shown = ordered
    .slice(0, AT_MOST)
    .map((l) => {
      const known = markFor(l, simplerWords);
      const aboutIt = askedToShow && known.mark === 'said' && l.type !== 'COMMITMENT'
        && new RegExp(`\\b${askedToShow}s?\\b`, 'i').test(l.text);
      return { says: asTheyReadIt(l.text), ...known, ...(aboutIt ? { how: whatAPhotoWouldProve(askedToShow!) } : {}), type: l.type };
    });
  if (!shown.length) return null;
  const leftOut = theLinesLeftOut(ordered.length - shown.length, simplerWords);
  /* What would change a line: something written, for a line that is only their word or memory. A
     commitment is not proven by a document now; it is asked about next time. */
  const couldBeProven = shown.some((l) => l.mark === 'memory' || (l.mark === 'said' && l.type !== 'COMMITMENT'));
  return {
    inYourRecord: shown.map(({ says, how, mark }) => ({ says, how, mark })),
    ...(couldBeProven || leftOut ? { next: [...(leftOut ? [leftOut] : []), ...(couldBeProven ? [simplerWords ? WHAT_WOULD_MAKE_IT_PROVEN_IN_SIMPLER_WORDS : WHAT_WOULD_MAKE_IT_PROVEN] : [])] } : {}),
  };
}

/**
 * The card the transcript serves: the one on the last AI turn, while nobody has said anything after
 * it. Once they carry on ("Change something"), it is no longer what their record will hold, and the
 * next close brings a new one.
 */
export function theCardStillStanding(turns: readonly { role: string; endCard?: unknown }[]): EndCard | null {
  const last = (turns ?? [])[(turns ?? []).length - 1];
  return last && last.role === 'AI' && last.endCard ? (last.endCard as EndCard) : null;
}
