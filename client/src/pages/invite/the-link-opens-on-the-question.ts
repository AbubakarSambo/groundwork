/**
 * THE LINK OPENS ON THE QUESTION.
 *
 * Hafsah, 18 September 2026: "can the chat just be a pop-up when you click the link?"
 *
 * For "Get updates from your team" it can, and it has to. The promise on that card is one line,
 * one link, one report, and two minutes: a person who was asked one question by their own manager
 * should meet that question, not a page explaining what a check-in is, a form asking for their
 * name, and a privacy briefing they did not ask for. The token in the mail already says who they
 * are, and clicking it is the consent the accept screen was collecting.
 *
 * WHAT DOES NOT CHANGE. It is the same conversation as every other check-in - same engine, same
 * probing, same record. Only the frame around it goes: no rail, no sidebar, one card on a plain
 * background, which on a phone is indistinguishable from a popup.
 *
 * EVERY OTHER SITUATION KEEPS ITS ACCEPT SCREEN. Somebody being asked to describe work involving a
 * colleague needs to read what happens to their words before they write any. A team update asks
 * them their own work, in their manager's own sentence.
 */

/** Situations whose invite goes straight into the conversation. */
export function opensStraightOnTheQuestion(scenario?: string | null): boolean {
  return scenario === 'TEAM_UPDATES'
}

/** The mark on the address that says: draw this one bare. */
export const JUST_THE_QUESTION = 'just'

export function justTheQuestion(search: string): boolean {
  return new URLSearchParams(search).get(JUST_THE_QUESTION) === '1'
}

/** Where a person who clicked one of those links is sent. */
export function whereTheLinkGoes(checkInId: string, scenario?: string | null): string {
  return opensStraightOnTheQuestion(scenario) ? `/checkin/${checkInId}?${JUST_THE_QUESTION}=1` : `/checkin/${checkInId}`
}
