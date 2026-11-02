import { whatTheyTried, Effort } from '../conversation/a-blocker-is-not-a-blocker-until-you-have-tried';

/**
 * WHAT THE PERSON SAID THEY DID ABOUT IT IS ON RECORD TOO (review of 1 October 2026).
 *
 * Ngozi Eze said, in her own check-in, "I have chased the committee four times in writing for all
 * eleven files, including the oldest one. I also escalated to the Head of Credit." Her lead's report
 * then read "Nothing on record says anybody has chased it since." and her probe read "with no
 * escalation on record. Ask what has stopped them raising it." Both read only `escalatedAt`, which
 * is the product's own overnight stamp for a handoff that has waited too long. What she said she did
 * is kept beside the handoff as `triedSaid`, and the board already read it; the report did not.
 *
 * So every read of whether a handoff was taken further reads the person's own words, tiered by the one
 * reader of them (whatTheyTried). Since 11 October it reads only those (see below).
 */
export interface AHandoffWithWhatWasTried {
  escalatedAt?: Date | string | null;
  triedSaid?: string | null;
  /** Taken above the person it was with, or round them, as the assessment read their words (GroundDependency.takenFurther). */
  takenFurther?: boolean | null;
}

/** What the person said they did, in the five tiers. `escalatedAt` is the product's, so it is not theirs. */
export function whatWasTried(d: AHandoffWithWhatWasTried): Effort {
  return whatTheyTried(String(d?.triedSaid ?? ''));
}

/*
 * TAKEN ABOVE THE PERSON, BY THEIR ACCOUNT (F2, 2 November 2026). "I called the customer" is a step up from writing, and it is not
 * taking it higher; "I escalated to the Head of Credit" is. Which one somebody said is the assessment's reading of their words
 * (`takenFurther` on the wait), kept on the wait. It replaced a word list that read "copied in" and "head of" in any sentence.
 */

/*
 * THE PRODUCT'S STAMP IS NEVER THE PERSON TAKING IT HIGHER (decision 139, must-fix 3; final evaluation, problem 4).
 *
 * `escalatedAt` is the overnight sweep's stamp on a wait still open after ESCALATE_AFTER_DAYS (webhooks.cron.ts): it posts a notice to the
 * organisation's own connected tools, where there are any. Nobody did anything. Reading it as "taken further" put "What happened to the four
 * items you escalated 15 days ago?" to Felix, "has raised it higher" in Wairimu's probes about Kevin and Fatuma, "All 3 were taken above the
 * person they were with" on her board, and "You have already taken ... to somebody above them" in Samuel's coaching. None of them had.
 * So both readers below read only what the person said they did. Where Groundwork's own notice is worth saying, it is said as Groundwork's
 * (board.service.ts, "so Groundwork raised it on ..."; detectors/what-a-lead-should-read-first.ts).
 */

/** Taken above the person it was with, or round them, by their own account. Never from the product's own stamp. */
export function itWasTakenFurther(d: AHandoffWithWhatWasTried): boolean {
  return d?.takenFurther === true;
}

/** They said they went back about it at all, even only by asking again. Never from the product's own stamp. */
export function somebodyWentBackAboutIt(d: AHandoffWithWhatWasTried): boolean {
  return whatWasTried(d) !== 'nothing';
}
