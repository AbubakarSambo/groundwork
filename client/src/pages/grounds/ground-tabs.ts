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
  /** Whoever runs the ground sees the lead's content behind the shared labels. */
  isLead: boolean
  /** `CONTEXT_ENABLED`. Off, the tab is documents and nothing else. */
  contextEnabled: boolean
  /** The server decides whether this ground has a board; the client keeps no second copy. */
  hasBoard: boolean
}

/**
 * The canonical list. Both views call this and render what comes back, so a tab cannot move on one
 * page without moving on the other.
 */
export function groundTabs({ isLead, contextEnabled, hasBoard }: TabContext): GroundTab[] {
  const tabs: GroundTab[] = [
    /** The conversation. "Check-in" rather than "Chat" because that is what the product calls it everywhere else. */
    { key: 'chat', label: 'Check-in' },
    { key: 'report', label: 'Report' },
    /**
     * One tab, two contents. A lead gets every party's sessions and where each has got to; a party
     * gets their own record. "Record" is the word that is true of both, where "Sessions" was only
     * true for the lead and "My record" only for a party.
     */
    { key: 'record', label: 'Record' },
    { key: 'context', label: contextEnabled ? 'Context' : 'Documents' },
  ]
  if (hasBoard) tabs.push({ key: 'board', label: 'Team board' })
  /**
   * The lead's read across the whole ground. It has no counterpart for a party - there is nothing to
   * summarise across accounts that a party is allowed to see - so it is the one tab that appears for
   * one role only, and it goes late rather than displacing anything shared.
   */
  if (isLead) tabs.push({ key: 'overview', label: 'Overview' })
  /**
   * "Ground settings", not "Settings": `/settings` is the account, and one word for both meant a
   * person looking for their notification preferences opened a ground, and a person looking for this
   * left the ground entirely. W13-9.
   */
  tabs.push({ key: 'settings', label: 'Ground settings' })
  return tabs
}

/** The tab a ground opens on. The work, not a summary of the work. */
export const FIRST_TAB: GroundTabKey = 'chat'
