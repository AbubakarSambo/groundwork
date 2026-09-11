/**
 * WHAT WE CALL THE THING A PERSON BUILDS: WHAT THEY SHARED.
 *
 * The product called it a record. Every near-synonym we reached for was the same shape - account,
 * assessment, perspective, observations - all of them carrying the faint smell of an official
 * document. Put beside "your side", "the other party" and "on record", the whole voice read as a
 * case file being assembled about somebody.
 *
 * That is the wrong emotional shape for what this is. Decided 11 September 2026:
 *
 *   NOT   you create evidence, we store evidence, the evidence may be reviewed later
 *   BUT   you tell us what is going on, we help you think it through, and together it gets clearer
 *
 * So the thing one person builds is WHAT THEY SHARED, and the thing everybody builds together is
 * the SHARED PICTURE, which the product already had. The two now say the same thing twice, which
 * is the point: "what you shared" is what becomes "the shared picture" once everybody has answered.
 * The word does the explaining that a paragraph used to.
 *
 * WHAT DID NOT CHANGE. The database still has RecordEntry and the code still says record, and that
 * is deliberate - internally it IS a record, the word is precise, and a rename of the data model
 * buys nothing a reader ever sees. This file is about the words a person meets.
 *
 * "Record" survives in copy in exactly one situation: where the point being made IS permanence and
 * evidence, and the person has asked for that. A contract renewal or the evidence behind a raise
 * can honestly say something is on record. An ordinary team check-in cannot, and did.
 */

/** What one person builds. Not a record, not an account, not a perspective. */
export const WHAT_ONE_PERSON_BUILDS = 'what you shared';

/** What everybody builds together, once more than one person has answered. Already the product's word. */
export const WHAT_EVERYBODY_BUILDS = 'the shared picture';

/**
 * The words that carry the old shape, for the guard that keeps them out of the first conversation.
 * Each is here because it was actually in the product, not because it sounds bad.
 */
export const THE_FILING_CABINET = [
  'your record',
  'their record',
  'the record',
  'on record',
  'your account of',
  'official account',
] as const;
