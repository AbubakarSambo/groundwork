/**
 * UPLOADING A RECORD OF A CONVERSATION SOMEBODY ELSE WAS IN.
 *
 * A call transcript, a meeting summary, a message thread. Different in kind from a job description
 * or a workplan, and the difference is not about us: other people are in it who never signed up to
 * this product, and the person uploading is the only one in a position to have told them.
 *
 * SO THE CONFIRMATION IS AT THE MOMENT OF UPLOADING, and it is a refusal rather than a warning.
 * A tick-box in a settings page somebody clicked a year ago is not consent, it is paperwork. The
 * moment a person is about to hand over a recording of somebody else is the only moment the
 * question lands, and it is the only moment they can still go and ask.
 *
 * IT IS NOT A CONSENT RECORD FOR THE CUSTOMER. We are not in a position to hold one - we never met
 * them. It records that the person who was in the room says they told them, which is a different
 * and smaller claim, and pretending otherwise would be worse than not asking.
 */

/** The words somebody has to have read. Kept here so the page and the refusal cannot drift. */
export const WHAT_THEY_ARE_CONFIRMING =
  'This is a record of a conversation other people were part of. Confirm that they know '
  + 'conversations like this may be used to help your team work better - and that you told them, '
  + 'rather than us.';

export const NOT_CONFIRMED =
  'This looks like a record of a conversation. Before it can be stored, confirm that the people in '
  + 'it know their conversations may be used this way. We cannot ask them, and you are the one who '
  + 'was in the room.';

/**
 * Does this look like a record of a conversation?
 *
 * DELIBERATELY OVER-INCLUSIVE. Being asked a question about a strategy deck costs somebody one
 * click; a transcript slipping through as an ordinary document costs somebody else their privacy.
 * When it is wrong it is wrong in the direction that only wastes time.
 *
 * The person can always say it is not a conversation, and that answer is taken. This decides what
 * to ASK, never what is true.
 */
const SOUNDS_LIKE_ONE = [
  'transcript', 'recording', 'call notes', 'meeting notes', 'meeting summary', 'minutes',
  'whatsapp', 'conversation', 'chat log', 'call log', 'voice note', 'gemini', 'zoom', 'teams',
  'meet recording', 'interview',
];

export function looksLikeAConversation(fileName: string, content: string): boolean {
  const name = (fileName ?? '').toLowerCase();
  if (SOUNDS_LIKE_ONE.some((w) => name.includes(w))) return true;

  /*
   * The shape a transcript has and a document does not: many short lines that open with a name and
   * a colon. Checked on the opening only - enough to recognise the form, not enough to read it.
   */
  const opening = (content ?? '').slice(0, 2_000).split('\n').filter((l) => l.trim());
  if (opening.length < 6) return false;
  const speakerLines = opening.filter((l) => /^\s*[A-Z][\w .'-]{1,30}\s*:/.test(l)).length;
  return speakerLines / opening.length >= 0.5;
}
