/**
 * UPLOADING A RECORD OF A CONVERSATION SOMEBODY ELSE WAS IN.
 *
 * A call transcript, a meeting summary, a message thread. Different in kind from a job description
 * or a workplan, and the difference is not about us: other people are in it who never signed up to
 * this product, and the person uploading is the only one in a position to have told them.
 *
 * SO THE ASSUMPTION IS STATED AT THE MOMENT OF UPLOADING, AND NOTHING IS REFUSED. This used to be a
 * refusal: a transcript was turned away until the uploader pressed a button confirming the people
 * in it knew. Reversed by the product owner on 11 September 2026 - "don't refuse anything, just
 * say the assumption" - and the reasoning holds: a person uploading a record of a conversation to
 * a tool that reads it has already decided to share it, and a gate in front of that decision
 * teaches them to press through gates rather than to think about the people in the room. What
 * lands is the sentence, at the one moment it can land: uploading this means you are telling us
 * they know, and that you told them.
 *
 * IT IS NOT A CONSENT RECORD FOR THE CUSTOMER. We are not in a position to hold one - we never met
 * them. It records that the person who was in the room uploaded it under that stated assumption,
 * which is a different and smaller claim, and pretending otherwise would be worse than not saying.
 */

import { aReceiptOrAnInvoice, A_FIELD_OF_A_RECEIPT } from './a-receipt-is-not-a-conversation';

/** The words shown beside the upload. Kept here so the page and the response cannot drift. */
export const WHAT_THEY_ARE_CONFIRMING =
  'This is a record of a conversation other people were part of. Uploading it means they know '
  + 'conversations like this may be used to help your team work better - and that you told them, '
  + 'rather than us.';

/** What the response says back when a conversation was recognised and taken on the uploader's word. */
export const THE_ASSUMPTION_WHEN_UPLOADING =
  'This looks like a record of a conversation. It has been kept on your word that the people in it '
  + 'know their conversations may be used this way. We cannot ask them, and you are the one who was '
  + 'in the room.';

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

/* Words in a file name that say it is a record of people talking, whatever else the name says. */
const SAYS_PEOPLE_TALKED = /transcript|conversation|chat log|call log|call notes|meeting|minutes|interview|voice note|recording/;

export function looksLikeAConversation(fileName: string, content: string): boolean {
  const name = (fileName ?? '').toLowerCase();
  /* A receipt or an invoice is not a conversation (week 15). A name that also says people talked still is. */
  if (aReceiptOrAnInvoice(fileName, content) && !SAYS_PEOPLE_TALKED.test(name)) return false;
  if (SOUNDS_LIKE_ONE.some((w) => name.includes(w))) return true;

  /*
   * The shape a transcript has and a document does not: many short lines that open with a name and
   * a colon. Checked on the opening only - enough to recognise the form, not enough to read it.
   */
  const opening = (content ?? '').slice(0, 2_000).split('\n').filter((l) => l.trim());
  if (opening.length < 6) return false;
  /* "Total:" and "VAT:" are the fields of a receipt, not people speaking. */
  /* A speaker is a name, and a name has no digits: "Week of 5 January:" opens a line of a weekly report, and eleven National Assembly and mill
     reports were kept as conversations and left out of every answer (Fatima's office, 23 November 2026). */
  const speakerLines = opening.filter((l) => /^\s*[A-Z][A-Za-z .'-]{1,30}\s*:/.test(l) && !A_FIELD_OF_A_RECEIPT.test(l)).length;
  return speakerLines / opening.length >= 0.5;
}
