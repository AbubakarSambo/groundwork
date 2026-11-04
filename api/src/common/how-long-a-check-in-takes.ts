/**
 * HOW LONG A CHECK-IN TAKES. THE ONE OWNER. "About ten minutes" is Hafsah's fixed decision (3 November 2026, standards.md,
 * "Fixed decision: how long a check-in takes"). It is a decision, not a measurement: change it only when she does.
 *
 * Every sentence a person reads about a check-in's length reads this: the check-in's opening line, Today and the board, the
 * invitation, the assistant and the embedded panel, the emails, the WhatsApp messages sent inside the 24 hours, the words
 * suggested to a lead for chasing, the pacing words in the recurring scenario packs, and the ops duration check. The client holds
 * no copy: it is served at GET /entry/a-check-in-takes (client/src/lib/how-long-setup-takes.ts, useACheckInTakes).
 *
 * Not from here, on purpose: the WhatsApp templates Meta has approved, or that are waiting for approval, keep the words they were
 * submitted with (whatsapp/a-message-outside-the-window.ts); and setup's own length, which has its own owner
 * (client/src/lib/how-long-setup-takes.ts, SETUP_TAKES).
 */
export const A_CHECK_IN_TAKES_MINUTES: number = 10;

const IN_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => IN_WORDS[n] ?? String(n);

/** "About ten minutes", on its own or at the start of a sentence. */
export const A_CHECK_IN_TAKES = `About ${inWords(A_CHECK_IN_TAKES_MINUTES)} ${A_CHECK_IN_TAKES_MINUTES === 1 ? 'minute' : 'minutes'}`;

/** "about ten minutes", inside a sentence. */
export const ABOUT_HOW_LONG = A_CHECK_IN_TAKES.charAt(0).toLowerCase() + A_CHECK_IN_TAKES.slice(1);

/** "It takes about ten minutes." */
export const IT_TAKES = `It takes ${ABOUT_HOW_LONG}.`;
