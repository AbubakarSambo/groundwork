/**
 * HOW LONG SETUP TAKES, MEASURED (Hafsah's approval of the target journey, 1 November 2026, change 3: "Setup's opening states an
 * honest length. Time setup in the next run and use the real figure, instead of 'about two minutes'").
 *
 * The one owner of the figure: the way in and setup's opening line both read it, so they never disagree.
 *
 * Measured on 3 November 2026 from the local test database gw_loop_round16, read only: entry_drafts, from the row's created_at (the
 * lead's setup first kept) to consumed_at (the setup saved), for the ten setups of the latest round (8 and 9 February 2027 on the
 * test clock). Median 4.4 minutes, middle half 2.8 to 6.4 minutes; across all 58 saved setups in that database, median 3.5 minutes.
 * Said as "about five minutes", rounded up rather than down. Re-measure after each run and change the number here.
 */
export const SETUP_TAKES_MINUTES = 5

/** "about five minutes" */
export const SETUP_TAKES = `about ${['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][SETUP_TAKES_MINUTES] ?? SETUP_TAKES_MINUTES} minutes`

/**
 * HOW LONG A TEAM MEMBER'S CHECK-IN TAKES, MEASURED (F5, stage 6), the client's copy of the server's A_CHECK_IN_TAKES
 * (api/src/modules/participants/when-it-asks.ts, which the invitation serves as `takes`). Measured on 3 November 2026 from
 * gw_loop_round16, read only: 448 answered check-ins of people who are not the lead, first message to last, median 1.9 minutes.
 */
export const A_CHECK_IN_TAKES = 'About two minutes'
export const a_check_in_takes = 'about two minutes'
