/**
 * A CHECK-IN KEPT OFF THE PHONE STAYS OFF IT, IN BOTH DIRECTIONS (survey item 5).
 *
 * The lead's setting `overWhatsApp = false` ("keep this check-in in the app") was read by the opening
 * notice and nothing else. The session-ready message, the report sent to the phone when a session
 * finished, and messages coming in all ignored it, so a performance plan's report could reach a phone
 * after the lead had said it stays in the app. Every WhatsApp path asks this one question now.
 *
 * Null is "whatever the organisation does", which is what every check-in did before the setting
 * existed, so only an explicit `false` keeps a check-in off the phone.
 */
export function keptOffThePhone(ground: { overWhatsApp?: boolean | null } | null | undefined): boolean {
  return ground?.overWhatsApp === false;
}

/** What the person reads when they write on WhatsApp to a check-in that is kept in the app. */
export function answerItInTheApp(label: string): string {
  return `Your check-in "${label}" is kept in the Groundwork app, so I cannot take your answers to it here. Please open Groundwork and answer it there.`;
}
