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
 * So every read of whether a handoff was taken further asks both: the product's stamp, and the
 * person's own words, tiered by the one reader of them (whatTheyTried).
 */
export interface AHandoffWithWhatWasTried {
  escalatedAt?: Date | string | null;
  triedSaid?: string | null;
}

/** What the person said they did, in the five tiers. `escalatedAt` is the product's, so it is not theirs. */
export function whatWasTried(d: AHandoffWithWhatWasTried): Effort {
  return whatTheyTried(String(d?.triedSaid ?? ''));
}

/*
 * TAKEN ABOVE THE PERSON, IN THEIR WORDS. The conversation's tiers put "I called the customer" with
 * "I escalated to the Head of Credit", because speaking is a step up from writing. For "has it been
 * taken higher" only the second is true, so the words have to say so: somebody above, or the word.
 */
const TAKEN_ABOVE = /escalat|went to (?:his|her|their|the)\b|raised it with|took it to|\bcc(?:'?d)?\b|copied in|\b(?:his|her|their|my|our) (?:manager|boss|director|head)\b|\bhead of\b|\bsomeone higher\b/i;

/** Taken above the person it was with, or round them: by the product's sweep, or by their own account. */
export function itWasTakenFurther(d: AHandoffWithWhatWasTried): boolean {
  if (d?.escalatedAt) return true;
  const tried = whatWasTried(d);
  if (tried === 'went-around') return true;
  return tried === 'escalated' && TAKEN_ABOVE.test(String(d?.triedSaid ?? ''));
}

/** Anybody went back about it at all, even only by asking again. */
export function somebodyWentBackAboutIt(d: AHandoffWithWhatWasTried): boolean {
  return !!d?.escalatedAt || whatWasTried(d) !== 'nothing';
}
