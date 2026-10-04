/*
 * THE ANCHOR SCENARIO'S FRONT DOOR, IN HAFSAH'S OWN WORDS (plan piece 2; docs/anchor-scenario.md
 * section 5, "The entry hook"; docs/anchor-scenario-plan.md section 5 row 1).
 *
 * There is no prototype screen for this: the nearest are docs/prototype/screens/F3-public-site/
 * home.txt (the public site's own front door) and B1-starting-a-check-in/start.txt (the one-box
 * entry into a conversation), and AnchorLandingPage.tsx borrows their shape - one page, one panel,
 * one question, one button entering the conversation.
 *
 * The words below are not from either .txt file: they are Hafsah's own hook, copied almost verbatim
 * from anchor-scenario.md section 5, with one change she asked for herself (request 143, answer 1,
 * 5 October 2026): "one to one" wherever her draft said "privately", everywhere this scenario says
 * it, here and in the invitation. Nothing else in her sentences is reworded.
 */
export const THE_ANCHOR_HOOK = {
  heading: 'Help your team see the bigger picture.',
  youKnow: 'You know what it takes to keep the work, customers and company moving.',
  doesYourTeam: 'Does your team?',
  /**
   * "Tell Groundwork what you're trying to get across. For one month, Groundwork will work
   * privately with you and your team to help everyone understand how their work connects,
   * contribute more, and move in the same direction." - with "check in with each person one to
   * one" in place of "work privately with you and your team" (request 143, answer 1).
   */
  body: "Tell Groundwork what you're trying to get across. For one month, Groundwork will check in with each person one to one to help everyone understand how their work connects, contribute more, and move in the same direction.",
  button: 'Help my team understand →',
} as const
