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

export const HOW: Record<'photo' | 'document' | 'confirmed' | 'commitment' | 'memory' | 'said', string> = {
  photo: 'From the photo you added.',
  document: 'From the document you added.',
  confirmed: 'The person who received it confirmed it.',
  commitment: 'You said you will do this. I will ask you how it went.',
  memory: 'You gave this from memory. Nothing written backs it yet.',
  said: 'You said this.',
};

export const WHAT_WOULD_MAKE_IT_PROVEN =
  'If you have something written for any of these, such as a message or a photo, add it. Then that line counts as proven.';

/** At most this many lines: the card is read in the moment before finishing, on a phone. */
export const AT_MOST = 6;

/* The mark is the reports' rule (reports/how-a-line-is-known.ts), so a line reads the same on both. */
function markFor(line: ALineForTheCard): { mark: EndCardMark; how: string } {
  const mark = howALineIsKnown(line);
  if (mark === 'proven') return { mark, how: line.backedByAPhoto ? HOW.photo : HOW.document };
  if (mark === 'confirmed') return { mark, how: HOW.confirmed };
  if (mark === 'memory') return { mark, how: HOW.memory };
  return { mark, how: line.type === 'COMMITMENT' ? HOW.commitment : HOW.said };
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

export function theEndCard(lines: readonly ALineForTheCard[]): EndCard | null {
  const shown = (lines ?? [])
    .filter((l) => !l.disputedAt && asTheyReadIt(l.text))
    .slice(0, AT_MOST)
    .map((l) => ({ says: asTheyReadIt(l.text), ...markFor(l), type: l.type }));
  if (!shown.length) return null;
  /* What would change a line: something written, for a line that is only their word or memory. A
     commitment is not proven by a document now; it is asked about next time. */
  const couldBeProven = shown.some((l) => l.mark === 'memory' || (l.mark === 'said' && l.type !== 'COMMITMENT'));
  return {
    inYourRecord: shown.map(({ says, how, mark }) => ({ says, how, mark })),
    ...(couldBeProven ? { next: [WHAT_WOULD_MAKE_IT_PROVEN] } : {}),
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
