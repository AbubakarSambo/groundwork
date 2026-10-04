/*
 * WHETHER THE ANCHOR SCENARIO IS ON, AS A STRANGER CAN READ IT (plan piece 2; request 144).
 *
 * `release.anchorScenario` is real on the engine (`theAnchorScenarioIsOn`,
 * api/src/modules/admin/what-is-hidden-at-release.ts) and is already served as `anchorScenarioOn`
 * on the board (api/src/modules/board/board.service.ts line 777) - but only to someone already
 * signed in and already running a check-in (the same reach as `kindsOffered`). A stranger who has
 * just followed a shared link has no session and reads no board, so there is nothing public yet to
 * read the setting from.
 *
 * This is the one function the anchor landing page asks, and it returns false until the engine
 * serves a public signal (docs/requests-to-engine.md, request 144, asked for from this piece).
 * When that signal exists - on the public entry read, or a small standalone route - this is the
 * only place to change: read it from wherever it is served, and the landing page, its route guard
 * and their tests all follow without any other edit.
 */
export function anchorScenarioIsOnForAStranger(): boolean {
  return false
}
