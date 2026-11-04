import { REFERENCES_AND_RESOURCES } from '@/lib/the-references-tab'
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

export type GroundTabKey =
  | 'chat'
  /** Everyone's state: who is in it, where each of them has got to. Whoever runs the check-in. */
  | 'sessions'
  /** Your own account of it. Whoever is a party to it. */
  | 'record'
  | 'report'
  | 'context'
  | 'board'
  | 'overview'
  | 'settings'

export interface GroundTab {
  key: GroundTabKey
  label: string
}

export interface TabContext {
  /**
   * WHOSE TAB IT IS, WHICH THIS DELIBERATELY DID NOT ASK BEFORE.
   *
   * It used to say: "Every tab is now the same list for both roles. What differs is what is INSIDE
   * them, which is the page's business and not this function's." That is what produced the defect.
   *
   * One key, `record`, was labelled "Sessions" on both pages and rendered EVERYONE'S state on the
   * one that runs the check-in and YOUR OWN account on the other. Same word, same position, same
   * `?tab=` value - different content, on two pages that are otherwise indistinguishable. Reported:
   * an admin could not tell the two views apart.
   *
   * Content differing by role is fine. A NAME differing by role is not: the label is the promise,
   * and two things cannot share one. So they are two keys now, and each page asks for the one it
   * means.
   */
  /** Whoever runs this check-in - its lead, or an admin here - and so sees everyone's state. */
  canRunThisCheckIn: boolean
  /** Whoever is a party to it, and so has an account of their own to read. */
  isAParty: boolean
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
/* Both required, with no default: a default here decides who sees what by omission, and the two
   call sites are the two views this exists to keep apart. The typechecker asks each of them. */
export function groundTabs({ canRunThisCheckIn, isAParty }: TabContext): GroundTab[] {
  const tabs: GroundTab[] = [
    /** The conversation. "Check-in" rather than "Chat" because that is what the product calls it everywhere else. */
    { key: 'chat', label: 'Check-in' },
    { key: 'report', label: 'Report' },
  ]

  /**
   * THE TWO THAT USED TO BE ONE.
   *
   * `sessions` is everyone in it and where each of them has got to - the thing you need to RUN a
   * check-in. `record` is your own account of it - the thing you need to BE in one. They shared the
   * key `record` and the label "Sessions", so the same tab in the same position showed different
   * things depending on which of two identical-looking pages you were on.
   *
   * Both appear for somebody who is both, which is the common case: a lead is usually also a party.
   * Two tabs rather than one, because they answer different questions and only one of them is about
   * you.
   */
  if (canRunThisCheckIn) tabs.push({ key: 'sessions', label: 'Sessions' })
  /* The one label every participant sees on every visit. "My record" is the filing cabinet the
     product decided against - see what-we-call-the-thing-a-person-builds.ts. The key stays
     'record': it is a route, not a word anybody reads. */
  if (isAParty) tabs.push({ key: 'record', label: 'What I shared' })

  tabs.push({ key: 'context', label: REFERENCES_AND_RESOURCES })
  tabs.push({ key: 'settings', label: 'Setup' })
  return tabs
}

/** The tab a ground opens on. The work, not a summary of the work. */
export const FIRST_TAB: GroundTabKey = 'chat'

/**
 * THE CHECK-IN HEADER'S OWN TABS, FOR A PAGE THAT NAVIGATES RATHER THAN SWITCHING LOCAL STATE.
 *
 * RELEASE WALKTHROUGH A, FIX 3: RoundReportPage.tsx and SessionReportPage.tsx each hard-coded one
 * six-entry tab list, drawn the same for every reader - so an org admin who neither runs a check-in
 * nor is a party to it (exactly who RoundReportPage itself exists to serve) still saw "Check-in"
 * and "My work", open to a conversation and a record that are not theirs. GroundAdminPage.tsx and
 * GroundParticipantPage.tsx already gate those two tabs this way for the prototype's read-only view
 * (read-only-view.txt: Board, Context, People and setup only) - this mirrors the same rule from one
 * place, rather than a third copy of it, so a role that should not see a tab on the check-in page
 * does not see it here either. "Report" is not one of the prototype's five tabs (see
 * TheCheckInHeader.tsx's own note); kept reachable as a sixth, unconditionally.
 */
export function checkInHeaderTabs({
  id, canRunThisCheckIn, isAParty,
}: { id: string; ground?: unknown } & TabContext): { key: string; label: string; to: string }[] {
  /* My work is one page for the lead and each person in it (MyWorkPage.tsx, B7), so every tab row sends it to one key. */
  const myWorkTab = 'record'
  return [
    { key: 'board', label: 'Board', to: `/grounds/${id}/board` },
    ...(canRunThisCheckIn || isAParty ? [{ key: 'chat', label: 'Check-in', to: `/grounds/${id}` }] : []),
    /* Named as the check-in page names it: "References and resources" where Release 1B is on (browser test, 20 October:
       the report pages still said "Context and resources" beside a check-in page that said "References and resources"). */
    { key: 'context', label: REFERENCES_AND_RESOURCES, to: `/grounds/${id}?tab=context` },
    ...(canRunThisCheckIn || isAParty ? [{ key: myWorkTab, label: 'My work', to: `/grounds/${id}?tab=${myWorkTab}` }] : []),
    { key: 'settings', label: 'People and setup', to: `/grounds/${id}?tab=settings` },
    { key: 'report', label: 'Report', to: `/grounds/${id}?tab=report` },
  ]
}
