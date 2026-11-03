/**
 * HOW LONG A CHECK-IN TAKES. THE ONE OWNER (F5, the approved journey, stage 6: "about two minutes").
 *
 * Every sentence a person reads about a check-in's length reads this: the check-in's opening line, Today and the board, the
 * invitation, the assistant and the embedded panel, the emails, the WhatsApp messages sent inside the 24 hours, the words
 * suggested to a lead for chasing, and the model's own instructions. The client holds no copy: it is served at
 * GET /entry/a-check-in-takes (client/src/lib/how-long-setup-takes.ts, useACheckInTakes).
 *
 * Not from here, on purpose: the WhatsApp templates Meta has approved, or that are waiting for approval, keep the words they were
 * submitted with (whatsapp/a-message-outside-the-window.ts); and setup's own length, which has its own owner
 * (client/src/lib/how-long-setup-takes.ts, SETUP_TAKES).
 *
 * Measured on 3 November 2026 from the local test database gw_loop_round16, read only: 448 answered check-ins of people who are
 * not the lead, first message to last, median 1.9 minutes, middle half 0.6 to 2.8 minutes. Those people are simulated and answer
 * at once, so this is the machine's time plus no thinking; re-measure when real people have answered, and change it here.
 */
export const A_CHECK_IN_TAKES_MINUTES: number = 2;

const IN_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const inWords = (n: number) => IN_WORDS[n] ?? String(n);

/** "About two minutes", on its own or at the start of a sentence. */
export const A_CHECK_IN_TAKES = `About ${inWords(A_CHECK_IN_TAKES_MINUTES)} ${A_CHECK_IN_TAKES_MINUTES === 1 ? 'minute' : 'minutes'}`;

/** "about two minutes", inside a sentence. */
export const ABOUT_HOW_LONG = A_CHECK_IN_TAKES.charAt(0).toLowerCase() + A_CHECK_IN_TAKES.slice(1);

/** "It takes about two minutes." */
export const IT_TAKES = `It takes ${ABOUT_HOW_LONG}.`;
