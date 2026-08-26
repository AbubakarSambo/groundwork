/**
 * ONE TAB ORDER FOR A GROUND, WHOEVER IS LOOKING.
 *
 * Her words: "we had a good thing going where tab 1 was chat, tab 2 reports etc."
 *
 * What had happened instead: the two views of a ground each kept their own list, in their own order,
 * with their own names for the same idea.
 *
 *   the lead      Check-in, Sessions,   Overview, Context, Report,     Ground settings, Team board
 *   a party       Check-in, My record,  Report,   Context, Team board, Ground settings
 *
 * Report was fifth for one and third for the other. "Sessions" and "My record" are the same tab -
 * what the record holds for the person looking - named twice. So the product moved its own furniture
 * depending on who walked in, and the thing that made it legible got lost.
 *
 * THE ORDER IS THE ANSWER TO "WHAT DO I DO, THEN WHAT DID IT PRODUCE". Chat first, because that is
 * the work. Report second, because that is the point. Then the record behind it, then the material,
 * then the board, then the settings that hardly anybody opens twice.
 *
 * WHAT MAY DIFFER BY ROLE IS WHAT A TAB CONTAINS, NEVER ITS NAME OR ITS POSITION. A lead's Record tab
 * shows where everybody is; a party's shows their own entries. Same word, same place, so nobody has to
 * relearn the page when their part in a ground changes - which is exactly what happens to somebody who
 * is an admin, a lead on one ground and a party on another.
 */

export type GroundTabKey = 'chat' | 'report' | 'record' | 'context' | 'board' | 'overview' | 'settings'

export interface GroundTab {
  key: GroundTabKey
  label: string
}

export interface TabContext {
  /**
   * `isLead` used to live here and decided one thing: whether Overview appeared. Overview is gone,
   * so it decided nothing, and a field nobody reads is a promise this shape does not keep - the same
   * reason a `caution` branch was removed from the situation cards rather than left in place.
   *
   * Every tab is now the same list for both roles. What differs is what is INSIDE them, which is the
   * page's business and not this function's.
   */
  /** `CONTEXT_ENABLED`. Off, the tab is documents and nothing else. */
  contextEnabled: boolean
  /**
   * `hasBoard` used to live here and decided whether a Team board TAB appeared. The board is opened
   * from Report now, so this function has no use for it and a field nobody reads is a promise the
   * shape does not keep. The page that offers the board still asks the server the same question.
   */
}

/**
 * The canonical list. Both views call this and render what comes back, so a tab cannot move on one
 * page without moving on the other.
 */
export function groundTabs({ contextEnabled }: TabContext): GroundTab[] {
  const tabs: GroundTab[] = [
    /** The conversation. "Check-in" rather than "Chat" because that is what the product calls it everywhere else. */
    { key: 'chat', label: 'Check-in' },
    { key: 'report', label: 'Report' },
    /**
     * "REPORT" AND "RECORD", SIX PIXELS APART. W-UX-6.
     *
     * The audit's line: "Two tabs called Report and Record. Nobody can tell which is which." Both
     * are nouns for a written thing about the same check-in, they differ by one letter in the middle,
     * and they sat next to each other.
     *
     * NOT MERGED, because they do not hold the same thing: Report is the one synthesised document
     * across every account, Record is the run of sessions behind it. Merging would lose the
     * distinction the product is built on. So the fix is the NAME.
     *
     * "Sessions" is that name. It is already the product's word for the thing inside a check-in - a
     * separate guard enforces that the two words stay distinct - and it is what this tab lists,
     * whoever is looking: a lead sees every party's sessions and where each has got to, a party sees
     * their own. It was rejected once for being "only true for the lead", which was true when a
     * party's tab was called "My record"; both now list sessions, so it is true of both.
     */
    { key: 'record', label: 'Sessions' },
    { key: 'context', label: contextEnabled ? 'Context' : 'Documents' },
  ]
  /**
   * THE BOARD IS NOT A TAB, BECAUSE IT DOES NOT STAY ON THE PAGE.
   *
   * It sat in this row and navigated away - you left the check-in to look at part of the check-in, and
   * landed on a full-screen surface with its own dark header and its own back-link, because it does
   * not know it is a tab. Every other entry here changes what is below the row; this one changed the
   * page.
   *
   * It is now opened from the foot of Report, which is where somebody is when they want it: the board
   * is the shared picture you talk over once you have read what the accounts said.
   *
   * NOT RENDERED INSIDE A TAB. It is a wide, dense, dark canvas and squeezing it into the content
   * column is what made it look broken. It keeps the whole window; only the way in moved.
   */
  /**
   * OVERVIEW IS GONE, AND NOTHING WENT WITH IT.
   *
   * It held five unrelated things whose only common property was having nowhere else to live: three
   * stat tiles, the resolution decision, a billing line, a third copy of the brief, and a participants
   * list duplicating Sessions. Nothing on it was wrong. Every part of it belonged somewhere else,
   * which is what made it the one to remove.
   *
   * Where each part went:
   *   the stats            -> the page header, which already carries the state
   *   the resolution       -> the foot of Report, because deciding follows reading
   *   the participants     -> Sessions, because who is in it and who has answered are one question
   *   the brief            -> Check-in only, where it was already shown
   *   the billing line     -> Billing, where the subscription lives
   *   "session N is ready" -> dropped: the Check-in tab already opens with that exact offer
   *
   * The worst of it was the resolution decision - the single most consequential control in the
   * product, sat on the tab least likely to be opened, between a stat row and a billing badge.
   */
  /**
   * "Ground settings", not "Settings": `/settings` is the account, and one word for both meant a
   * person looking for their notification preferences opened a ground, and a person looking for this
   * left the ground entirely. W13-9.
   */
  /**
   * "SETUP", NOT "SETTINGS". Both artifacts call it Setup, and the reason is the left rail: /settings
   * is the account's own, so one word for both sent people to the wrong page in both directions -
   * somebody looking for their notification preferences opened a check-in, and somebody looking for
   * this left the check-in entirely. "Check-in settings" fixed the collision by getting longer, which
   * is a different fix from getting clearer.
   *
   * Setup is also what the tab now holds: how the check-in RUNS. No target is set here any more -
   * expectations come out of the lead's own conversation and are published to Context.
   */
  tabs.push({ key: 'settings', label: 'Setup' })
  return tabs
}

/** The tab a ground opens on. The work, not a summary of the work. */
export const FIRST_TAB: GroundTabKey = 'chat'
