import { TEMPLATES, fill } from './a-message-outside-the-window';

/**
 * THE FIRST MESSAGE GROUNDWORK EVER SENDS TO A NUMBER (decision 106 item 2, as Hafsah corrected it).
 *
 * Groundwork writes first to every saved number, as planned; nobody has to confirm a number. To protect
 * against a number typed wrong, the first message to a number names the organisation and adds "Not you?
 * Reply STOP." STOP then stops everything to that number.
 *
 * The first message is nearly always outside the 24 hours (the person has never written), so it goes as a
 * template. Rather than change Hafsah's eight and resubmit them all, it goes as one template of its own,
 * `groundwork_first_contact`, carrying whatever the message was going to say:
 *
 *   This is Groundwork, writing for Kito Foods. Hi Amani, your check-in for Sales team, Q4 is open. It
 *   takes about five minutes, and you can answer right here. Reply START to begin. Not you? Reply STOP.
 *
 * The second message to the same number is the ordinary one.
 */
export const FIRST_CONTACT = 'first-contact';
export const FIRST_CONTACT_NOT_APPROVED = 'The first message to this number must go as groundwork_first_contact, which is not approved yet; not sent';

/** The longest the message's own words may be inside the template, which Meta caps at 1,024 characters in all. */
const ITS_OWN_WORDS_AT_MOST = 800;

/** What the message was going to say, on one line, for the template's second blank. */
export function theFirstContactLine(kind: string | null | undefined, params: string[] | undefined, text: string): string {
  const t = kind ? TEMPLATES[kind] : null;
  const words = t ? fill(t.body, params?.length ? params : [text]) : text;
  const line = String(words ?? '').replace(/\s+/g, ' ').trim();
  return line.length <= ITS_OWN_WORDS_AT_MOST ? line : `${line.slice(0, ITS_OWN_WORDS_AT_MOST - 1).replace(/\s+\S*$/, '')}…`;
}
