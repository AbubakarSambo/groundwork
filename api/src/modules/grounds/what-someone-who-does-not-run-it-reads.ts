import { theSituationIn } from './what-a-participant-is-told-about-this';

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
const THE_SETUP_ANSWERS_BEGIN = new RegExp(
  [
    /* Since the U.7 third review: "When asked why this matters now, the answer was taken to mean this." */
    String.raw`\bWhen asked (?:who|why|what)\b`,
    /* The U.7 re-check's wording: "Asked why this matters now, Wanjiru said “...”." */
    String.raw`\bAsked (?:who is part|why this matters|what this is aiming|what the questions)\b`,
    /* The U.7 review's wording. */
    String.raw`\b(?:The people in it are|It matters now because|It is aiming at|The questions should focus on)\b`,
    /* And the labelled pieces setup wrote before that. */
    String.raw`\b(?:Who is part of this|Why now|What it is aiming at|Focus):`,
  ].join('|'),
);

/** The brief with the answers setup put together cut off, leaving what it says about the situation. */
export function withoutTheSetupAnswers(brief: string | null | undefined): string {
  const text = (brief ?? '').trim();
  const at = text.search(THE_SETUP_ANSWERS_BEGIN);
  return (at >= 0 ? text.slice(0, at) : text).trim();
}

export function whatSomeoneWhoDoesNotRunItReads(g: { brief?: string | null; toldToParticipants?: string | null }): string | null {
  return (g.toldToParticipants ?? '').trim() || theSituationIn(withoutTheSetupAnswers(g.brief)) || null;
}
