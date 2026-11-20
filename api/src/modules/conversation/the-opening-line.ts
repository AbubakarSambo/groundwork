import { ABOUT_HOW_LONG } from '../../common/how-long-a-check-in-takes';

/**
 * THE OPENING LINE, IN THE CHAT ITSELF, EVERY TIME (Hafsah, 26 October 2026). Nobody was told how long a check-in takes or how to stop.
 * The first message stays exactly as it was; this line is added to it, in front. The web says "End session"; WhatsApp says "Reply END".
 * The length is the one owner's (common/how-long-a-check-in-takes.ts). Setup's opening line is the client's (EntryChatPage.tsx).
 */
export const THE_CHECK_IN_LINE = `This takes ${ABOUT_HOW_LONG}. You can stop any time with End check-in.`;
export const THE_CHECK_IN_LINE_ON_WHATSAPP = `This takes ${ABOUT_HOW_LONG}. Reply END to stop any time.`;

/** The first message of a check-in with the line in front of it, once. */
export function withTheOpeningLine(first: string): string {
  const t = String(first ?? '');
  return t.startsWith(THE_CHECK_IN_LINE) ? t : `${THE_CHECK_IN_LINE}\n\n${t}`;
}

/** The same message on WhatsApp, where a person stops by replying END. */
export function asItReadsOnWhatsApp(text: string): string {
  return String(text ?? '').split(THE_CHECK_IN_LINE).join(THE_CHECK_IN_LINE_ON_WHATSAPP);
}
