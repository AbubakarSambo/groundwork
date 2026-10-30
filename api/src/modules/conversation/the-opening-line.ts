import { YOU_CAN_END_NOW, YOU_CAN_END_NOW_ON_WHATSAPP } from './a-short-day';
/**
 * THE OPENING LINE, IN THE CHAT ITSELF, EVERY TIME (Hafsah, 26 October 2026). Nobody was told how long a check-in takes or how to stop.
 * The first message stays exactly as it was; this line is added to it, in front. The web says "End session"; WhatsApp says "Reply END".
 */
export const THE_CHECK_IN_LINE = 'This takes about 10 minutes. You can stop any time with End session.';
export const THE_CHECK_IN_LINE_ON_WHATSAPP = 'This takes about 10 minutes. Reply END to stop any time.';
export const THE_SETUP_LINE = 'This sets up your team’s check-ins, so they can give updates against what you tell me here. It takes about 10 minutes, and you can stop any time with End session.';

/** The first message of a check-in with the line in front of it, once. */
export function withTheOpeningLine(first: string): string {
  const t = String(first ?? '');
  return t.startsWith(THE_CHECK_IN_LINE) ? t : `${THE_CHECK_IN_LINE}\n\n${t}`;
}

/** The same message on WhatsApp, where a person stops by replying END. */
export function asItReadsOnWhatsApp(text: string): string {
  /* And a long check-in's offer to end says "reply END" (a-short-day.ts). */
  return String(text ?? '').split(THE_CHECK_IN_LINE).join(THE_CHECK_IN_LINE_ON_WHATSAPP).split(YOU_CAN_END_NOW).join(YOU_CAN_END_NOW_ON_WHATSAPP);
}
