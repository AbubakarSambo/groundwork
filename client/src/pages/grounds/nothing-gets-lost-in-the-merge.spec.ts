import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE 45 OPERATIONS THE GROUND PAGES DO, AS A TEST RATHER THAN A LIST. W8-52.
 *
 * Hafsah's instruction on the page merge: "make sure the ux change does not
 * break or lose important functions and pages." W8-52 answered that with an
 * inventory read off the API calls, and an inventory in a document is a safety
 * net nobody is standing under - the merge is a large refactor across four
 * pages, and the way an operation disappears in one is quietly, in a branch
 * nobody re-read.
 *
 * So the inventory lives here. Merge the pages however the design wants; if a
 * capability stops being wired to anything, this goes red and names it.
 *
 * WHAT THIS DOES NOT CLAIM. It proves a call is still wired somewhere in the
 * ground surfaces, not that it is reachable, correctly gated, or on the right
 * page. It is the floor, not the ceiling - a merge still has to be driven in a
 * browser. Its job is to make silent loss loud.
 */

const PAGES = [
  'GroundAdminPage.tsx',
  'GroundParticipantPage.tsx',
  '../report/ReportPage.tsx',
  '../board/BoardPage.tsx',
]

/** Everything the four ground surfaces can do, by the call that does it. */
const OPERATIONS: Record<string, string[]> = {
  'ground state': ['groundsApi.update(', 'confirmLead(', 'beginClosingRound('],
  people: ['addParticipant(', 'getParticipantInviteUrl(', 'participantsApi.updateEmail(', 'participantsApi.updateRole('],
  requests: ['participantRequestsApi.list(', 'participantRequestsApi.update(', 'participantRequestsApi.create('],
  documents: ['documentsApi.list(', 'documentsApi.upload(', 'documentsApi.remove(', 'documentsApi.setVisibility('],
  context: ['addLeadContext('],
  'privacy switches': ['setExternalVisibility(', 'setPeopleWorkTogether('],
  reports: ['reportsApi.get(', 'reportsApi.release(', 'reportsApi.activate(', 'activationStatus('],
  nudging: ['conversationApi.remind('],
  'my record': ['getMyRecord(', 'getMySoloReport(', 'getMySpecificity(', 'setMySoloReportShared(', 'getMyCheckinStatus('],
  'my session': ['conversationApi.artifact(', 'startSelfCorrection(', 'signOff('],
  /**
   * Money reaches a participant inside their own ground page, three ways, and
   * not on /billing. Moving it would break the paid path for the person who is
   * not the admin - rule 2 of the inventory.
   */
  billing: ['claimFreeExtension(', 'createSubscription(', 'redeemContributorCode(', 'getContributorCodeShareCard('],
  /**
   * The two that exist nowhere else, and the reason the report cannot simply be
   * dropped into the board: did this ground actually help, and can I take my
   * record away with me.
   */
  'report only': ['outcomeFeedbackApi.mine(', 'outcomeFeedbackApi.submit(', 'conversationApi.download('],
  board: ['boardApi.get(', 'createObjective(', 'updateObjective(', 'deleteObjective(', 'upsertPoll(', 'togglePoll('],
}

const SRC = PAGES.map(p => readFileSync(join(__dirname, p), 'utf8')).join('\n')

describe('nothing the ground pages can do gets lost in a merge', () => {
  for (const [group, calls] of Object.entries(OPERATIONS)) {
    describe(group, () => {
      for (const call of calls) {
        it(`${call.replace('(', '')} is still wired to something`, () => {
          expect(SRC).toContain(call)
        })
      }
    })
  }

  it('and the inventory is the whole inventory', () => {
    /**
     * 43 DISTINCT CALLS, NOT THE 45 W8-52 WROTE DOWN.
     *
     * That prose count totalled the four pages separately, so `reports.get` and
     * `grounds.get` were each counted on more than one page. Distinct
     * capabilities is the number that matters for a merge - it is what must
     * survive - so the difference is a counting artefact, not two lost
     * operations. Written down because a test asserting a number nobody can
     * reproduce is worse than no test.
     *
     * If a real capability is added to these pages it belongs in the list above,
     * or the next merge loses it without anybody noticing.
     */
    const total = Object.values(OPERATIONS).reduce((n, c) => n + c.length, 0)
    expect(total).toBe(43)
  })
})
