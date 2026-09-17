/**
 * "COMMIT MAY RETURN YOUR OLD GROUND IF YOU HAVE SET ONE UP BEFORE." 5.5, AND IT IS REAL.
 *
 * The entry draft is one row per user, created once at signup, and commit short-circuits on it:
 * a CONSUMED draft means "a commit already ran", so it returns the ground that commit made. That
 * is exactly right for what it was built for - a double-clicked link, a remount, the dev
 * double-fire - where two requests seconds apart must not make two grounds.
 *
 * It is exactly wrong a week later. The same lead comes back through /entry, sets up a completely
 * different check-in, presses the last button, and is handed the ground they made the first time:
 * a different label, different people, and everything they just typed dropped without a word. The
 * draft has no way to say "this is a new one" because nothing creates a second draft.
 *
 * TWO THINGS SEPARATE A REPLAY FROM A SECOND SETUP, and either is enough:
 *
 *   TIME. A replay arrives within seconds. Nothing legitimate replays a commit an hour later.
 *   WHAT IT IS CALLED. A replay carries the same label; a new setup is a different check-in.
 *
 * Both are needed because either alone gets one case wrong: a fast second setup of a check-in with
 * the same name is one thing, and a slow retry over a bad connection is another. Requiring BOTH to
 * look like a replay keeps the protection that exists and lets the second setup through.
 */

/** How long a genuine replay can take. A double-click is milliseconds; a retried request, seconds. */
export const A_REPLAY_ARRIVES_WITHIN_MS = 10 * 60 * 1000;

export interface TheDraftAndTheAsk {
  consumedAt: Date | string | null | undefined;
  /** What the ground that draft produced is called. */
  theGroundItMade: string | null | undefined;
  /** What this commit says it is setting up. */
  nowAskingFor: string | null | undefined;
  now?: Date;
}

const sameName = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/**
 * Is this commit a replay of the one that consumed the draft, or somebody setting up again?
 */
export function isAReplayRatherThanASecondSetup(d: TheDraftAndTheAsk): boolean {
  if (!d.consumedAt) return false;
  const at = new Date(d.consumedAt).getTime();
  if (!Number.isFinite(at)) return false;
  const soonEnough = ((d.now ?? new Date()).getTime() - at) <= A_REPLAY_ARRIVES_WITHIN_MS;
  /*
   * A ground whose label we cannot read is treated as a replay, deliberately: that is the old
   * behaviour, and returning a ground somebody already has is a smaller failure than making a
   * second one they did not ask for.
   */
  if (!d.theGroundItMade) return soonEnough;
  return soonEnough && sameName(d.theGroundItMade, d.nowAskingFor);
}
