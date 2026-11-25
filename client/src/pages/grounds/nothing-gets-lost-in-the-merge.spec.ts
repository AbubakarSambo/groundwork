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
 * WHAT IT CHECKED, AND WHY THAT WAS NOT ENOUGH.
 *
 * It asserted each call APPEARS somewhere in these files. Appearing is not
 * reachability, and the difference cost something real: retiring the card view
 * deleted the only button wired to `activateMutation`, and this spec stayed green
 * because the mutation was still declared a hundred lines above. `probeSession` was
 * the same shape - the paid path for opening a session survived as code nothing
 * could call.
 *
 * So mutations are now checked twice: declared AND invoked. A `useMutation` whose
 * `.mutate(` appears nowhere is a capability with no way in, which is precisely what
 * "nothing gets lost" was meant to prevent.
 *
 * It still cannot prove a control is on screen, or on screen for the right person.
 * It is the floor, not the ceiling - a merge still has to be driven in a browser.
 */

/**
 * The check-in's surfaces. `GroundChat` is here because capabilities MOVED into it
 * when the card view was retired - the session summary and the correction that
 * starts from it. This spec went red on `conversationApi.artifact` the moment they
 * left `GroundParticipantPage`, which is the whole reason it exists: a capability
 * quietly leaving the pages being watched looks exactly like a capability being
 * deleted.
 */
const PAGES = [
  'GroundAdminPage.tsx',
  /* The roster of "Who has answered" folded into People and setup's one list (page audit, 24 November 2026, row 8): ending early,
     the invite link and who asked to join moved with it. This guard fired for each of them, which is what it is for. */
  'PeopleAndSetupAsPictured.tsx',
  'GroundParticipantPage.tsx',
  '../report/ReportPage.tsx',
  '../board/BoardPage.tsx',
  '../../components/gw/MyCheckInSessions.tsx', /* GroundChat.tsx was deleted on 15 November 2026; the session summary and its correction moved here */
  // The Context tab, which used to be assembled inline in the two pages above. When it moved, this
  // guard fired for every document and lead-context call - which is exactly what it is for.
  '../../components/gw/ContextPage.tsx',
  // And the two lifted out of the party page so the view that RUNS a check-in can show a lead their
  // own account and their own private report without sending them to a second page. This guard
  // fired for `setMySoloReportShared` and `signOff` the moment they moved, which is what it is for.
  '../../components/gw/MyRecord.tsx',
  '../../components/gw/WhatYouAreCarryingForward.tsx',
  '../../components/gw/SharedReportForAParty.tsx',
  /*
   * And the surfaces the report tab became. It was one tab carrying a report, a list, a board
   * door and a release control; it is a list of sessions whose rows open a session's own page,
   * which renders the reader's own report and the per-session shared one. Every capability that
   * was on that tab is in one of these files, and this guard is how a future merge finds out.
   */
  /* Batch 2, group 5: the session report page went; your own report, its download and its corrections are on My work. */
  'MyWorkPage.tsx',
  '../report/RoundReportPage.tsx',
  '../../components/gw/TheReportIsAListOfSessions.tsx',
  /* "Did this feel fair" - moved here from the dead ReportBody, onto the board, where everyone
     reads how a closed check-in ended. */
  '../../components/gw/OutcomeFeedback.tsx',
  '../../components/gw/TheSessionsReport.tsx',
  '../../components/gw/WhoIsStillOut.tsx',
  /*
   * REVIEW ROUND 3, ITEM 2: THE PAYWALL AND ITS MUTATIONS (claimFreeExtension, createSubscription,
   * redeemContributorCode) MOVED OUT OF GroundParticipantPage.tsx into a shared hook and a shared
   * modal, so GroundAdminPage.tsx could open a session (and show the same paywall) without a trip
   * through the other page. Same capabilities, same calls - now declared and invoked here instead.
   */
  '../../hooks/useOpenSession.ts',
  '../../components/gw/checkin/SessionPaywallModal.tsx',
]

/** Everything the four ground surfaces can do, by the call that does it. */
const OPERATIONS: Record<string, string[]> = {
  /* confirmLead went with the lead page, 10 Sep 2026: a ground is open from the moment it is made. */
  'ground state': ['groundsApi.update(', 'beginClosingSession('],
  people: ['addParticipant(', 'getParticipantInviteUrl(', 'participantsApi.updateEmail(', 'participantsApi.updateRole('],
  requests: ['participantRequestsApi.list(', 'participantRequestsApi.update(', 'participantRequestsApi.create('],
  documents: ['documentsApi.list(', 'documentsApi.upload(', 'documentsApi.remove(', 'documentsApi.setVisibility('],
  /*
   * `addLeadContext(` was here. The three write boxes it served were removed on 22 September 2026 -
   * "that section needs to go since you can all do everything from the context chat" - so the page's
   * write path is the conversation and one call per line of the record. The server route stays, for
   * the API and for anything that still posts a note.
   */
  context: ['changeContextLine('],
  'privacy switches': ['setExternalVisibility(', 'setPeopleWorkTogether('],
  /*
   * `activationStatus(` was here and is gone as a CALL, not as a capability: who has shown theirs
   * travels with the per-session report now, in `counting`, carrying the report's own labels
   * instead of being joined against the roster on the page. `reportsApi.sessionReport(` is the
   * call that answers it, and the endpoint itself still exists.
   */
  /* `reportsApi.activate(` was here. The reveal it belonged to is deleted - see
     there-is-no-reveal.spec.ts - so requiring a caller for it would require the button back. */
  reports: ['reportsApi.get(', 'reportsApi.release(', 'reportsApi.sessionReport('],
  nudging: ['conversationApi.remind('],
  'my record': ['getMyRecord(', 'getMySoloReport(', 'getMySpecificity(', 'setMySoloReportShared('],
  /*
   * `getMyCheckinStatus(` CAME OFF THIS LIST 1 OCTOBER 2026, AND THE CAPABILITY DID NOT GO WITH IT.
   * On these four pages it was called once, inside the dead `ReportBody` (`ReportPage.tsx`), to
   * list a party's own completed sessions for the download button. The download button moved to
   * `SessionReportPage.tsx` and now downloads the one session that page is already about, which
   * needs no roster lookup - so the call has no remaining reason to exist on these four surfaces.
   * The capability itself is alive and well outside this inventory's four pages
   * (`YourNextCheckIn.tsx`, `TheDonePage.tsx`, `ChatPage.tsx` all still call it), which is why this
   * is a removal rather than a loss: this list tracks what the FOUR MERGED PAGES can do, not every
   * caller of every endpoint in the product.
   *
   * `signOff(` is off this list because the control is gone, on her instruction. It was a
   * confirmation step at the foot of My record on a page nobody had been asked to confirm anything
   * on. The client method went with it rather than sitting declared and uncalled; the column and
   * the server route stay, so a record corrected after a sign-off still reads correctly if the
   * control ever comes back.
   *
   * This list is what a merge must not silently drop. A capability removed on purpose leaves it -
   * quietly keeping the entry is how the list rots into a list of things that used to be true.
   */
  'my session': ['conversationApi.artifact(', 'startSelfCorrection('],
  /**
   * Money reaches a participant inside their own ground page, three ways, and
   * not on /billing. Moving it would break the paid path for the person who is
   * not the admin - rule 2 of the inventory.
   */
  /* claimFreeExtension went with the free plan (22 November 2026): the only free plan is the free trial. */
  billing: ['createSubscription(', 'redeemContributorCode(', 'getContributorCodeShareCard('],
  /**
   * The two that exist nowhere else, and the reason the report cannot simply be
   * dropped into the board: did this check-in actually help, and can I take my
   * record away with me.
   */
  'report only': ['outcomeFeedbackApi.mine(', 'outcomeFeedbackApi.submit(', 'conversationApi.download('],
  board: ['boardApi.get(', 'createObjective(', 'updateObjective(', 'deleteObjective(', 'upsertPoll(', 'togglePoll('],
}

const SRC = PAGES.map(p => readFileSync(join(__dirname, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')).join('\n')

describe('nothing the check-in pages can do gets lost in a merge', () => {
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
    /* 40 since confirmLead went with the lead page, 10 Sep 2026. */
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
    /* 43 until `signOff` was removed with the control that called it - a capability dropped on
       purpose, which is the one reason this number is allowed to go down. 42 until `activate`
       went the same way with the reveal: see there-is-no-reveal.spec.ts. 39 since
       `getMyCheckinStatus` came off this list 1 October 2026 - a capability still alive outside
       these four pages, see the note above, not a capability lost from the product. 38 since `claimFreeExtension` went with the
       free plan, 22 November 2026: a capability dropped on purpose. */
    const total = Object.values(OPERATIONS).reduce((n, c) => n + c.length, 0)
    expect(total).toBe(38)
  })
})

/**
 * EVERY MUTATION HAS SOMETHING THAT CALLS IT.
 *
 * The half this file was missing. A `const x = useMutation(...)` with no `x.mutate(`
 * anywhere is dead weight at best and, as with `activateMutation`, a sign that the
 * last button wired to it was deleted - which reads as working code to every other
 * check we have.
 */
/**
 * REVIEW ROUND 3, ITEM 2: A HOOK CAN HAND A MUTATION TO ITS CALLER INSTEAD OF INVOKING IT ITSELF.
 * `useOpenSession.ts` declares `redeemPaywallCode`/`claimFreeExtensionMut`/`createSubscriptionMut`
 * and returns them (renamed, under `paywall.redeem`/`paywall.claimFreeExtension`/
 * `paywall.createSubscription`) for `SessionPaywallModal.tsx` to call - the whole point of pulling
 * the paywall out into a shared piece two pages use. "Declared here, invoked here" does not hold
 * for a hook; "declared here, returned here, and something calls the thing that was returned"
 * does. `CONSUMERS` names where each hook's exposed mutations get called when that call does not
 * carry the declaring identifier's own name.
 */
const CONSUMERS: Record<string, string> = {
  '../../hooks/useOpenSession.ts': '../../components/gw/checkin/SessionPaywallModal.tsx',
  /*
   * THE SAME SHAPE, FOR A COMPONENT RATHER THAN A HOOK. People and setup
   * (CheckInPeopleAndSetup.tsx) was pulled out of GroundAdminPage.tsx's `tab === 'settings'`
   * branch so it could be rebuilt from components/gw/ui; GroundAdminPage.tsx keeps every
   * mutation it needs - the server-side access rule lives there, next to
   * `isInitiator`/`isOrgAdmin` - and hands each one down as a prop (`removeGround={removeGround}`)
   * rather than returning it from a hook. PROP_PATTERN below checks for that shape wherever the
   * hook check above looks for `return { ... }`.
   */
  'GroundAdminPage.tsx': './CheckInPeopleAndSetup.tsx',
}

describe('no mutation is left with no way to call it', () => {
  for (const page of PAGES) {
    const src = readFileSync(join(__dirname, page), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const consumerPath = CONSUMERS[page]
    const consumerSrc = consumerPath
      ? readFileSync(join(__dirname, consumerPath), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      : ''
    const declared = [...src.matchAll(/const (\w+) = useMutation\(/g)].map(m => m[1])
    for (const name of declared) {
      it(`${page.split('/').pop()}: ${name} is invoked`, () => {
        const invokedDirectly = new RegExp(`\\b${name}\\.(mutate|mutateAsync)\\(`).test(src)
        /* Returned from the hook (as any property of the object literal it hands back) AND some
           `.mutate(`/`.mutateAsync(` call exists in the file that consumes it - not proof THIS
           exact mutation is the one called, but the paired manual check above (the paywall spec,
           which reads real button text) is what actually pins each button to its mutation; this
           guard only catches one still declared and returned to nobody. */
        const returnedFromHook = consumerPath
          ? new RegExp(`return \\{[\\s\\S]*\\b${name}\\b[\\s\\S]*?\\n  \\}`).test(src) && /\.(mutate|mutateAsync)\(/.test(consumerSrc)
          : false
        /* THE COMPONENT-AND-PROP VERSION OF THE SAME CHECK (see the CONSUMERS doc comment above):
           `name={name}` handing a mutation down as a prop, in place of a hook's `return { name }`. */
        const passedAsProp = consumerPath
          ? new RegExp(`\\b${name}\\s*=\\{\\s*${name}\\s*\\}`).test(src) && /\.(mutate|mutateAsync)\(/.test(consumerSrc)
          : false
        expect(
          invokedDirectly || returnedFromHook || passedAsProp,
          `${name} is declared in ${page} and nothing calls it (directly, or via ${consumerPath ?? 'a consumer'}). ` +
            `Wire it to a control or delete it - a declared mutation with no caller is how the paid ` +
            `check-in path survived as code nobody could reach.`,
        ).toBe(true)
      })
    }
  }
})
