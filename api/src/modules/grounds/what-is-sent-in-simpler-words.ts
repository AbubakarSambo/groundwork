/**
 * WHAT IS SENT AFTERWARDS, IN THE PLAINER FORM, FOR A CHECK-IN SET TO "USE SIMPLER WORDS".
 *
 * The lead switches the setting on (`Ground.simplerWords`, false for every check-in that existed
 * before). Everything a person is sent about that check-in afterwards uses the plainer form of its
 * fixed sentences: short sentences, everyday words, no contractions, one thing in each. Every
 * function here takes the switch as its last argument and, with it off or missing, gives back the
 * sentence the product has always sent, character for character, so a caller can pass the switch
 * through without a second branch.
 *
 * The closing turn and the end card are in conversation/ (the-close-says-what-comes-next,
 * the-end-card). The report's own text is written by the model, and gets the plain-words rule in
 * its prompt (THE_REPORT_IN_SIMPLER_WORDS).
 */

/** Added to the report's instructions when the check-in is set to use simpler words. Nothing else about the report changes. */
export const THE_REPORT_IN_SIMPLER_WORDS =
  'THIS CHECK-IN USES SIMPLER WORDS, FOR EVERYBODY IN IT. Write every sentence of the report in short sentences, one idea in each, using everyday words that a person with basic English knows. Use no idioms and no figures of speech. Keep every fact, number, name and quote exactly as it is: simpler words never mean fewer facts.';

/** What WhatsApp says when the person writes "finish" and the check-in is closed. */
export function theCheckInIsCompleteSaying(simplerWords?: boolean | null): string {
  return simplerWords
    ? 'Your check-in is finished, and your answers are saved. Your report will come in a moment.'
    : 'Your check-in is complete and on record. Your report follows in a moment.';
}

/** What WhatsApp adds when there is enough to close and the person has not said "finish". */
export function enoughToCloseSaying(simplerWords?: boolean | null): string {
  return simplerWords
    ? 'You have said enough to finish. Write "finish" to end this check-in, or keep talking.'
    : 'That is enough to close this check-in. Reply "finish" to complete it, or keep going.';
}

/** The words that begin the line about the conversation worth having, in a report sent as one message. */
export function theConversationWorthHavingSaying(simplerWords?: boolean | null): string {
  return simplerWords ? 'Here is one thing worth talking about.' : 'Here is a conversation worth having.';
}

/**
 * THE REMINDERS AND NUDGES, IN THEIR PLAINER FORM. Same blanks, same numbers, same order as the
 * template of the same kind (a-message-outside-the-window), so `fill(body, params)` works on either.
 *
 * Inside the 24-hour window the plainer body can be sent as a text message. Outside it, WhatsApp
 * only carries a template Meta has approved, and a plainer template is a new template with its own
 * approval: until one is approved the person is sent the approved body, and that is true to say.
 */
export const THE_REMINDERS_IN_SIMPLER_WORDS: Record<string, string> = {
  'checkin-open': 'Hi {{1}}, your check-in for {{2}} is open. It takes about five minutes. You can answer here. Write START to begin.',
  'due-tomorrow': 'Hi {{1}}, your check-in for {{2}} is due tomorrow, {{3}}. You can answer here at any time before then.',
  'opens-soon': 'Hi {{1}}, your check-in for {{2}} opens in one hour, at {{3}}. Write here when it opens, and we will start.',
  'closes-soon': 'Hi {{1}}, your check-in for {{2}} closes in one hour, at {{3}}. Please answer now. It takes five minutes. Then your answers go into the report.',
  overdue: 'Hi {{1}}, your check-in for {{2}} is late. It is still open. You can answer here now.',
  'team-almost-in': 'Hi {{1}}, {{2}} of {{3}} people have answered the check-in for {{4}}. You have not answered yet. When you answer, your answers go into the report.',
  'your-view-matters': 'Hi {{1}}, your check-in for {{2}} is still waiting. Your answers help {{3}} see what is in your way and where they can help. It takes about five minutes. You can answer here.',
  'anchor-follow-up': 'Hi {{1}}, last time you said you would {{2}}. How did it go? Your check-in for {{3}} is open. You can answer here.',
};

/** The body to send for a kind of reminder: the plainer one when the switch is on and there is one, otherwise the usual body. */
export function theReminderBody(kind: string, usualBody: string, simplerWords?: boolean | null): string {
  return (simplerWords && THE_REMINDERS_IN_SIMPLER_WORDS[kind]) || usualBody;
}

/**
 * THE EMAILS ABOUT A CHECK-IN, AS TEXT, plain. The caller puts them in the email's layout and
 * escapes the names. Each is the sentence the email says today when the switch is off.
 */
export const THE_EMAILS = {
  /** "Your check-in for X is still open." and the line when the other person has already answered. */
  nudge: (simplerWords?: boolean | null) =>
    simplerWords
      ? { stillOpen: 'is still open. It takes about five minutes.', theOtherHasAnswered: 'The other person has already answered. Yours is the last answer we need.' }
      : { stillOpen: 'is still open.', theOtherHasAnswered: 'They have already shared their side. Yours is the last one we are waiting for.' },
  /** "A new check-in is ready for X." */
  nextCheckInOpen: (simplerWords?: boolean | null) =>
    simplerWords ? { before: 'Your next check-in for', after: ' is open. It takes about five minutes.' } : { before: 'A new check-in is ready for', after: '.' },
} as const;
