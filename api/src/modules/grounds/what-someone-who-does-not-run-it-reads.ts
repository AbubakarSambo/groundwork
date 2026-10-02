import { withoutTheSetupAnswers } from './what-a-participant-is-told-about-this';

/**
 * WHAT SOMEBODY WHO DOES NOT RUN A CHECK-IN READS ABOUT WHAT IT IS FOR (U.7 third review).
 *
 * One rule for every route that serves a check-in. The check-in's own read (GET /grounds/:id) gave a
 * participant the version everyone reads; the list (GET /grounds) spread the raw brief to them. Read
 * live as Aisha, the person on probation: "...Asked what the questions should focus on, Wanjiru Lead
 * said “Aisha is often late with stock counts”." That is the lead's instruction to Groundwork about
 * her, and it was sitting in the list's payload.
 *
 * What they read is the short version Groundwork writes for the people in the check-in, which the lead
 * confirms before it is kept. Never the brief (decision 75, item 13, below).
 */
/* The cut lives beside theSituationIn now, so the situation is never read with the setup answers
   still in it, whichever route asks (request 41). Re-exported here for the callers that import it. */
export { withoutTheSetupAnswers };

/*
 * DECISION 75, ITEM 13: AND NEVER THE LEAD'S BRIEF ITSELF. Where the short version is missing, the brief's own
 * situation sentences used to stand in. They are the lead's words to the product, and Hafsah decided on 2 October
 * that the brief is never quoted into a participant's check-in. So nothing stands in: the person reads the short
 * version the lead confirmed, or nothing about it, and the goals they may see come separately.
 */
export function whatSomeoneWhoDoesNotRunItReads(g: { brief?: string | null; toldToParticipants?: string | null; scenario?: string | null }): string | null {
  /* On a team update the lead's one line IS the question the team is sent, so it is theirs to read. */
  if (g.scenario === 'TEAM_UPDATES') return (g.toldToParticipants ?? '').trim() || (g.brief ?? '').trim() || null;
  return (g.toldToParticipants ?? '').trim() || null;
}
