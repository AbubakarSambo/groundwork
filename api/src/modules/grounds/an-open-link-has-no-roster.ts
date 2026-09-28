/**
 * A CHECK-IN ANSWERED ON A LINK HAS NO "EVERYBODY" TO WAIT FOR.
 *
 * `isSessionReadyForReport` asks one question: has every active party given an account for this
 * session. That is the right question on a ground with a roster - four people were invited, the
 * round is done when four have answered - and it cannot be answered at all on a ground answered
 * through an open link, for two reasons that both showed up on one live run.
 *
 * Measured, 24 September 2026. Ten agribusinesses answered one link over ten minutes:
 *
 *   THE SET GROWS WHILE YOU COUNT IT. Every person who opens the link becomes a party. The eleventh
 *   arrives mid-sentence and the round that was complete a second ago is incomplete again. There is
 *   no moment when everybody has answered, because "everybody" is not a fixed set.
 *
 *   AND THE LEAD NEVER ANSWERS. She set it up to read what comes back. Her own session-1 check-in
 *   sits NOT_STARTED forever, and one unanswered check-in makes the whole round false.
 *
 * So `releasedAt` stayed null on a report ten people had already answered - and the consequence is
 * not cosmetic. `tellThemTheReportIsReady` only fires for a ground whose report has released, so
 * every one of those ten who ticked "send me the report" was told nothing, and the report they were
 * promised existed the whole time.
 *
 * THE RULE FOR A LINK IS ANSWERS, NOT ATTENDANCE. It releases once enough people have finished for
 * a picture to mean anything, and it stays released while more arrive - the listener already has a
 * path for a late answerer, and its own comment describes exactly this: "An open link releases at
 * the first answers that make a round; the forty-eight who answer afterwards were told nothing."
 */

export interface APartyOnTheGround {
  /**
   * Whether they came in through the open link. A recorded fact, not an inference.
   *
   * My first version inferred it from "no userId and no invitedAt", and the live run said no: the
   * link sets `invitedAt` the moment somebody opens it, so every respondent looked invited and the
   * rule below never fired once. The `@unclaimed.invalid` address it mints is replaced the moment
   * they finish and give a real one, and a null `userId` is also true of an invited person who has
   * not signed in. Three plausible proxies, all wrong. So the column exists.
   */
  cameThroughTheLink?: boolean | null;
  /** True of somebody who runs the check-in without giving an account of their own. */
  managingOnly?: boolean | null;
  /** Whether they have finished this session. */
  finished: boolean;
}

/**
 * Enough finished answers for a picture.
 *
 * Two, the same floor the roster rule already uses before it will consider a round at all. It is
 * not a quality bar - the report says for itself how thin it is - it is the point below which
 * "where the accounts agree" has no meaning, because there is only one account.
 */
export const ENOUGH_TO_MAKE_A_ROUND = 2;

/** Somebody who arrived through the link rather than being put on a roster. */
export function cameThroughTheLink(p: APartyOnTheGround): boolean {
  return p?.cameThroughTheLink === true;
}

/**
 * Is this a ground people are answering on a link?
 *
 * Decided by who has actually arrived, not by whether a `joinToken` exists - every ground has one.
 * A ground where somebody came through the link and finished is being answered on the link,
 * whatever else is also true of it.
 */
export function answeredOnALink(parties: APartyOnTheGround[]): boolean {
  return (parties ?? []).some((p) => cameThroughTheLink(p) && p.finished);
}

/**
 * The round, on a link: enough people have finished.
 *
 * Nobody is waited for. The lead who reads what comes back is not counted, and neither is the
 * person who opened the link a minute ago and is still typing.
 */
export function aLinkRoundIsReady(parties: APartyOnTheGround[]): boolean {
  const finished = (parties ?? []).filter((p) => p.finished && !p.managingOnly).length;
  return finished >= ENOUGH_TO_MAKE_A_ROUND;
}
