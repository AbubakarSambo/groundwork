/**
 * WHAT GROUNDWORK IS, ON THE MAILS WHERE SOMEBODY MIGHT NOT KNOW.
 *
 * Of the 110 emails a hundred audited journeys produced, not one named the organisation the
 * check-in belonged to, and 54 never said who can see what the reader writes. That is not a copy
 * problem: half of these mails go to somebody who has met the product once, for ten minutes, and
 * what they believe happens to their words decides what they write down. A record built on a
 * misunderstanding about privacy is a worse record.
 *
 * SO IT IS APPENDED BY THE SENDER, NOT WRITTEN INTO EACH TEMPLATE. Forty-two senders means
 * forty-two chances to forget, and the ones that forgot were exactly the ones nobody had read
 * recently.
 *
 * AND NOT ON EVERY MAIL. A sign-in link does not need a paragraph about who reads a check-in — a
 * person clicking one is not writing anything, and a footer on a one-line mail is noise that
 * teaches people to skip footers. `WHAT_EACH_MAIL_IS` already classifies every sender for the
 * opt-out rule, and it happens to draw exactly the right line: "the way back in" is a door, and
 * everything else is about the work.
 */
import { whatThisMailIs } from './nothing-goes-out-that-was-turned-off';

/** True where this footer belongs. */
export function shouldSayWhatGroundworkIs(sender: string | undefined): boolean {
  if (!sender) return false;
  /* A door does not need explaining, and a person opening one is not writing anything down. */
  return whatThisMailIs(sender) !== 'the way back in';
}

/**
 * One short paragraph, in the same words the product uses on screen. The privacy sentence is the
 * load-bearing one and it is TRUE as written: accounts are private until the record is released to
 * everybody at once, and the record does not quote anybody.
 */
export const WHAT_GROUNDWORK_IS =
  '<p style="font-size:12px;color:#9B9590;line-height:1.6;margin-top:20px;border-top:1px solid #E8E5DE;padding-top:12px;">' +
  'Groundwork is where the people involved in a piece of work each give their own account of it, ' +
  'privately, and get one shared record back. What you write is not shown to anybody until the ' +
  'record is released to everybody at the same time, and the record does not quote you.' +
  '</p>';

export function withWhatGroundworkIs(html: string, sender: string | undefined): string {
  if (!shouldSayWhatGroundworkIs(sender)) return html;
  /* Not twice. Three mails say it in their own words already, and a second copy underneath reads
     as a template that does not know what it has said. */
  if (/Groundwork is where the people involved/.test(html)) return html;
  return html + WHAT_GROUNDWORK_IS;
}
