import { theSituationIn, withoutTheSetupAnswers } from './what-a-participant-is-told-about-this';

/**
 * WHAT SOMEBODY WHO DOES NOT RUN A CHECK-IN READS ABOUT WHAT IT IS FOR (U.7 third review).
 *
 * One rule for every route that serves a check-in. The check-in's own read (GET /grounds/:id) gave a
 * participant the version everyone reads; the list (GET /grounds) spread the raw brief to them. Read
 * live as Aisha, the person on probation: "...Asked what the questions should focus on, Wanjiru Lead
 * said “Aisha is often late with stock counts”." That is the lead's instruction to Groundwork about
 * her, and it was sitting in the list's payload.
 *
 * What they read is the short version Groundwork writes for the people in the check-in. Where that
 * is missing, the situation sentences of the brief stand in, and never the answers setup put
 * together from the lead's conversation: those are what the lead wants asked, and about whom.
 */
/* The cut lives beside theSituationIn now, so the situation is never read with the setup answers
   still in it, whichever route asks (request 41). Re-exported here for the callers that import it. */
export { withoutTheSetupAnswers };

export function whatSomeoneWhoDoesNotRunItReads(g: { brief?: string | null; toldToParticipants?: string | null }): string | null {
  return (g.toldToParticipants ?? '').trim() || theSituationIn(withoutTheSetupAnswers(g.brief)) || null;
}
