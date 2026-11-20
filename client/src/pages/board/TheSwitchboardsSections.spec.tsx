import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BoardPage } from './BoardPage'
import { boardApi } from '@/api/board'

/**
 * REQUEST 70, THE SWITCHBOARD'S 22 SECTIONS: THE 13 THAT NOW HAVE A SERVED FIELD.
 *
 * Each is a new top-level field on `GET /grounds/:id/board` (api/src/modules/board/the-switchboards-
 * own-sections.ts), present only when it has something in it - this renders the real page with a
 * payload shaped the way the server actually sends it (copied from the engine's own worked examples
 * in docs/answers-from-engine.md), once for a reader who runs the check-in (everything) and once for
 * a participant (their own rows only, and never `leadActions` or `questionsForTheLead` at all, which
 * the engine's own comment says are for whoever runs the check-in alone).
 */
let me = { id: 'u-bisi', firstName: 'Bisi', role: 'MEMBER' }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: me }) }))
vi.mock('@/api/board', () => ({ boardApi: { get: vi.fn() } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn().mockResolvedValue({ initiatorId: 'u-bisi' }) } }))
vi.mock('@/api/today', () => ({ todayApi: { get: vi.fn().mockResolvedValue({ count: 0, line: null, comingUp: [], needs: [] }) } }))
vi.mock('@/components/gw/HowThisHasMoved', () => ({ HowThisHasMoved: () => null }))
vi.mock('@/components/gw/ResolutionPanel', () => ({ ResolutionPanel: () => null }))
vi.mock('@/components/gw/WhatSuccessLooksLike', () => ({ WhatSuccessLooksLikeFor: () => null }))
vi.mock('@/components/gw/TheOtherBoardsYouAreIn', () => ({ TheOtherBoardsYouAreIn: () => null }))
vi.mock('@/components/gw/Suggestions', () => ({ SuggestionsForTheLead: () => null }))

const base = {
  groundId: 'g1', renders: true, mode: 'SHARED', family: 'DELIVERY', sections: [],
  /*
   * A SCENARIO THE SWITCHBOARD HAS NO ROW FOR AT ALL, ON PURPOSE: `switchboardAllows` leaves every
   * section alone when the scenario is not one of its 24 (see what-the-switchboard-allows.spec.ts,
   * "allows everything when the scenario has no switchboard row at all"), so this test is free to
   * check what each of the 13 sections draws, for each reader, without also having to pick a real
   * situation whose own row happens to name every one of them (no single one of the 24 does - the
   * switchboard's own per-situation gating is what what-the-switchboard-allows.spec.ts covers).
   */
  title: 'Sales org, Q3', scenario: 'NOT_A_REAL_SCENARIO', coverageVariant: 'text',
  lastChangedAt: '2026-09-23T15:02:00.000Z',
  participants: [
    { id: 'p-bisi', name: 'Bisi Adeyemi', role: null, managingOnly: true, signedOffAt: null },
    { id: 'p-kwame', name: 'Kwame Mensah', role: null, managingOnly: false, signedOffAt: null },
  ],
}

const risks = [{ id: 'r1', says: 'Rukia Mwangi cannot move on the credit terms until it comes from Finance.', because: 'It was first said on 3 September.' }]
const workPlan = [{ id: 'w1', participantId: 'p-kwame', who: 'Kwame Mensah', says: 'Kwame Mensah committed to send the Westgate quote.', when: 'by Friday', state: 'open' as const, statedInSession: 1 }]
const timeline = [{ on: '2026-09-10', says: 'On 10 September, Baraka Otieno’s commitment to call the Kisumu depot was marked done.' }]
const personHistory = [{ participantId: 'p-kwame', who: 'Kwame Mensah', says: 'Kwame Mensah has answered 2 check-ins and made 3 commitments.', sessions: [{ n: 1, on: '2026-09-02', says: 'In check-in 1, Kwame Mensah made 1 commitment.' }] }]
const blockerCheck = [{ id: 'blocker-1', who: 'Kwame Mensah', says: 'Kwame Mensah is waiting on Bisi Adeyemi for the approval of five applications.', namesWhoHoldsIt: true, saidWhatWasTried: false, timeGiven: false, checks: ['Finance holds it.', 'Nobody has said what has been tried.', 'No time has been given for it.'] }]
const evidenceIndex = [{ id: 'e1', participantId: 'p-kwame', who: 'Kwame Mensah', said: 'We paid out KES 90K to the Nyama Choma Palace account.', backedBy: 'A document Kwame Mensah added shows this.', sessionNumber: 2 }]
const busyOrMoving = { eachPerson: [{ participantId: 'p-kwame', who: 'Kwame Mensah', says: 'Kwame Mensah has made 3 commitments across 2 answered check-ins.' }], cannotTellYou: 'These are counts of what people said and what came of it.' }
const leadActions = [{ id: 'l1', says: 'You need to get back to Kwame Mensah, who is waiting on you for the approval of five applications.', because: 'It was first said on 16 September.' }]
const obligations = [{ participantId: 'p-kwame', who: 'Kwame Mensah', promised: ['Kwame Mensah committed to send the Westgate quote.'], othersWaitFor: [] }]
const forecast = [{ objectiveId: 'o1', about: 'The team is aiming for 40 approved facilities this quarter.', says: 'If it keeps moving at the pace it has since check-in 1, it would be about 21 by check-in 4, against an aim of 40.', restsOn: 'It was 6 in check-in 1 and 11 in check-in 2.', cannotTellYou: 'This carries the pace so far forward in a straight line.' }]
const whoWaitedOnWhom = [{ id: 'blocker-1', says: 'Kwame Mensah has been waiting on you for the approval of five applications since 16 September, and it has not been cleared.', startedAt: '2026-09-16', clearedAt: null, days: null }]
/*
 * REQUEST 105 PART 2 / 108: `blockers` IS NOW THE SERVER'S OWN BUILT SECTION, REPLACING THE JOIN
 * OF `blockerCheck` AND `whoWaitedOnWhom` THIS FILE USED TO DO. Its `says` matches `blockerCheck`'s
 * own sentence above so the existing assertions keep checking the same fact under the new field.
 */
const blockers = [{
  id: 'blocker-1', who: 'Kwame Mensah', name: 'the approval of five applications', state: 'blocking' as const,
  says: blockerCheck[0].says,
  raised: { times: 1, firstRaisedAt: '2026-09-16', lastRaisedAt: '2026-09-16', says: 'This was raised once, on 16 September.', sessions: [1], inSessions: 'It was raised in check-in 1.' },
  proof: { state: 'none', says: 'Nothing on record proves it yet. It rests on what Kwame Mensah said.' },
  timeGiven: 'No time has been given for it.',
  wouldClearIt: null, wouldClearItSays: 'Nobody has said what would clear it yet.', holdingUp: null,
}]
const contradictions = [{ id: 'c1', commitmentId: 'cm1', participantId: 'p-kwame', who: 'Kwame Mensah', says: 'Kwame Mensah’s commitment was marked done in check-in 1, and in check-in 2 Kwame Mensah said it again as something still to do.' }]
const questionsForTheLead = [{ id: 'q1', question: 'Has Femi Okonkwo’s commitment, "I will call them again", happened, or is it still wanted?', because: 'Femi Okonkwo said it in check-ins 1, 2 and 3.' }]

const AS_THE_LEAD = {
  ...base, myParticipantId: 'p-bisi', canEditFrame: true, readOnlyNote: null,
  risks, workPlan, timeline, personHistory, blockerCheck, evidenceIndex, busyOrMoving,
  leadActions, obligations, forecast, whoWaitedOnWhom, contradictions, questionsForTheLead, blockers,
}

/* Kwame reads his own rows, where the server would have cut everything else down to - but never
   leadActions or questionsForTheLead at all, which are for whoever runs the check-in alone. */
const AS_KWAME = {
  ...base, myParticipantId: 'p-kwame', canEditFrame: false, readOnlyNote: null,
  risks, workPlan, timeline,
  personHistory: [personHistory[0]],
  blockerCheck, evidenceIndex,
  obligations: [obligations[0]],
  whoWaitedOnWhom, contradictions, blockers,
}

function renderBoard(payload: any) {
  ;(boardApi.get as any).mockResolvedValue(payload)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/grounds/g1/board']}>
        <Routes><Route path="/grounds/:id/board" element={<BoardPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the switchboard’s 22 sections: the 13 now served, as the lead reads them', () => {
  beforeEach(() => { vi.clearAllMocks(); me = { id: 'u-bisi', firstName: 'Bisi', role: 'MEMBER' } })

  it('draws every one of the 13, in the server’s own sentences', async () => {
    renderBoard(AS_THE_LEAD)
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    expect(screen.getByText('What could go wrong')).toBeTruthy()
    expect(screen.getByText(risks[0].says)).toBeTruthy()
    expect(screen.getByText('Work plan')).toBeTruthy()
    /* The same sentence also appears under "What each side promised" below (obligations.promised
       reuses the work plan's own sentence for that person, per the engine's own comment), so this
       checks it is there at least once rather than exactly once. */
    expect(screen.getAllByText(workPlan[0].says).length).toBeGreaterThan(0)
    expect(screen.getByText('Timeline')).toBeTruthy()
    expect(screen.getByText(timeline[0].says)).toBeTruthy()
    expect(screen.getByText('What each person has done so far')).toBeTruthy()
    expect(screen.getByText(personHistory[0].says)).toBeTruthy()
    /*
     * BOARD TASK, PHASE 2: "Blockers", ONE SECTION, NOT TWO. `blockerCheck` and `whoWaitedOnWhom`
     * used to draw as two separate sections ("What is blocking work, and since when" and "Who is
     * waiting on whom"), each saying an overlapping half of the same blocker's story under its own
     * heading. The prototype's own example (eng.txt, "Blockers") draws one card per blocker,
     * joined on the id the two arrays already share - see `BlockersSection`. Updated here, not
     * deleted: the facts behind both old headings are still checked, just under the one heading
     * and the "Waiting on"/"Raised" labels the joined card actually renders.
     */
    expect(screen.getByText('Blockers')).toBeTruthy()
    expect(screen.getByText(blockerCheck[0].says)).toBeTruthy()
    expect(screen.getByText('Evidence index')).toBeTruthy()
    expect(screen.getByText(`“${evidenceIndex[0].said}”`)).toBeTruthy()
    expect(screen.getByText('Who is busy and who is free')).toBeTruthy()
    expect(screen.getByText(busyOrMoving.eachPerson[0].says)).toBeTruthy()
    expect(screen.getByText(busyOrMoving.cannotTellYou)).toBeTruthy()
    expect(screen.getByText('What needs you in this check-in')).toBeTruthy()
    expect(screen.getByText(leadActions[0].says)).toBeTruthy()
    expect(screen.getByText('What each side promised')).toBeTruthy()
    expect(screen.getByText('Where this could end up')).toBeTruthy()
    expect(screen.getByText(forecast[0].says)).toBeTruthy()
    expect(screen.getByText('Contradictions')).toBeTruthy()
    expect(screen.getByText(contradictions[0].says)).toBeTruthy()
    expect(screen.getByText('Questions for you')).toBeTruthy()
    expect(screen.getByText(questionsForTheLead[0].question)).toBeTruthy()
    cleanup()
  })
})

/**
 * SECOND BOARD REVIEW: BLOCKERS NEVER DRAWS ON SIX KINDS OF WORK WHOSE PROTOTYPE HAS THEM.
 *
 * The test above uses a scenario the switchboard has no row for at all, so it could not have
 * caught this: `OKR_ALIGNMENT` ("Set goals and keep the team on track" - ops and sales both run on
 * it) is a real row, and until this fix it did not name "Blocker check" as on or optional, so
 * `BlockersSection` drew nothing however much `blockerCheck` and `whoWaitedOnWhom` data the engine
 * sent - exactly what distribution operations' own served board showed in the second board review.
 * This renders a real scenario to prove the card now draws.
 */
describe('Blockers now draws for a real situation whose own row used to leave "Blocker check" out', () => {
  beforeEach(() => { vi.clearAllMocks(); me = { id: 'u-bisi', firstName: 'Bisi', role: 'MEMBER' } })

  it('draws the full blocker card for OKR_ALIGNMENT (ops, sales)', async () => {
    renderBoard({ ...AS_THE_LEAD, scenario: 'OKR_ALIGNMENT' })
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    expect(screen.getByText('Blockers')).toBeTruthy()
    expect(screen.getByText(blockerCheck[0].says)).toBeTruthy()
    cleanup()
  })
})

describe('the switchboard’s 22 sections: as a participant reads them', () => {
  beforeEach(() => { vi.clearAllMocks(); me = { id: 'u-kwame', firstName: 'Kwame', role: 'MEMBER' } })

  it('reads their own rows, and never the lead-only sections at all', async () => {
    renderBoard(AS_KWAME)
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    expect(screen.getByText('What could go wrong')).toBeTruthy()
    expect(screen.getByText('Work plan')).toBeTruthy()
    expect(screen.getByText('Timeline')).toBeTruthy()
    expect(screen.getByText('What each person has done so far')).toBeTruthy()
    /* See the lead's own test above: "Blockers" replaces "What is blocking work, and since when"
       and "Who is waiting on whom" as one joined section. */
    expect(screen.getByText('Blockers')).toBeTruthy()
    expect(screen.getByText('Evidence index')).toBeTruthy()
    expect(screen.getByText('What each side promised')).toBeTruthy()
    expect(screen.getByText('Contradictions')).toBeTruthy()
    /* Never drawn for a participant: the server itself never sends these two to one, but the page's
       own `shown.*` gate is checked here too, so a future bug that sent them cannot surface them. */
    expect(screen.queryByText('What needs you in this check-in')).toBeNull()
    expect(screen.queryByText('Questions for you')).toBeNull()
    expect(screen.queryByText('Who is busy and who is free')).toBeNull()
    expect(screen.queryByText('Where this could end up')).toBeNull()
    cleanup()
  })

  /*
   * BOARD REVIEW, 1 OCTOBER, ITEM 4: THE CLIENT'S OWN GATE, NOT ONLY THE SERVER'S.
   * `leadActions` and `questionsForTheLead` only ever hold rows for whoever runs the check-in
   * server-side, but the page's own `shown.*` test did not check that again - it trusted the
   * server completely. This gives a participant's payload a `leadActions` row anyway (as if the
   * server had a bug) and checks the page still never shows it to them.
   */
  it('never shows "What needs you in this check-in" to a participant, even if the server sent it', async () => {
    renderBoard({ ...AS_KWAME, leadActions: [{ id: 'l2', says: 'You need to get back to somebody.', because: 'Said on 1 September.' }] })
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    expect(screen.queryByText('What needs you in this check-in')).toBeNull()
  })
})

/*
 * SUPPORT DESK BOARD FIX 5, REWRITTEN (not deleted): "Work plan" ALWAYS SITS INSIDE THE CLOSED
 * END FOLD, SO DROPPING THE ROW LEFT NOTHING IN ITS PLACE. This used to check that a leadActions
 * row whose sentence also appeared under "Work plan" was left out of "What needs you in this
 * check-in", on the assumption the reader would read it under "Work plan" instead - but
 * `WorkPlanSection` sits inside "Everything else from this check-in" (`FoldEverythingElseUnless`),
 * a disclosure closed by default for every reader, so a lead who never opens it lost the row
 * entirely. support.txt's own example board still lists a plan item under "What needs you in this
 * check-in", with "This comes from the plan." said once, in full view. The row is now kept.
 */
describe('"What needs you in this check-in" keeps a row even when "Work plan" says the same thing', () => {
  beforeEach(() => { vi.clearAllMocks(); me = { id: 'u-bisi', firstName: 'Bisi', role: 'MEMBER' } })

  it('is kept, because "Work plan" sits inside the closed end fold, not read without opening it', async () => {
    const duplicateLeadActions = [{ id: 'l3', says: workPlan[0].says, because: null }]
    renderBoard({ ...AS_THE_LEAD, leadActions: duplicateLeadActions })
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    expect(screen.getByText('Work plan')).toBeTruthy()
    const section = screen.getByText('What needs you in this check-in').closest('section') as HTMLElement
    expect(within(section).getByText(workPlan[0].says)).toBeTruthy()
  })
})

/*
 * REQUEST 105 PART 2 / 107 (b) / 108: `blockers` IS NOW ONE SENTENCE PER FACT, SERVER-BUILT, NO
 * "Waiting on:"/"Raised:"/"What the proof shows:" LABELS. The two tests below used to check the
 * old join of `blockerCheck` and `whoWaitedOnWhom`, including a label-joined "Waiting on:" line
 * and a "Cleared" state read off `whoWaitedOnWhom.clearedAt` - both the defective shape request
 * 107 (b) asked to fix. They are rewritten here, not deleted: the facts (who, what was raised,
 * what the proof shows, since when) are still checked, as the plain sentences the server sends.
 * A cleared blocker is no longer in `blockers` at all (the server leaves it out), so there is no
 * "Cleared" card to test for any more.
 */
describe('Blockers: one card per blocker, built from the server\'s own blockers field', () => {
  beforeEach(() => { vi.clearAllMocks(); me = { id: 'u-bisi', firstName: 'Bisi', role: 'MEMBER' } })

  it('shows full sentences, with no colon-joined labels', async () => {
    renderBoard(AS_THE_LEAD)
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    const card = screen.getByText(blockers[0].says).closest('div[class*="panel"]') as HTMLElement
    expect(within(card).getByText(blockers[0].raised.says)).toBeTruthy()
    expect(within(card).getByText(blockers[0].proof.says)).toBeTruthy()
    expect(within(card).getByText(blockers[0].timeGiven)).toBeTruthy()
    expect(within(card).getByText(blockers[0].wouldClearItSays)).toBeTruthy()
    expect(within(card).getByText('Blocking')).toBeTruthy()
    expect(screen.queryByText(/Waiting on:/)).toBeNull()
    expect(screen.queryByText(/Raised:/)).toBeNull()
    expect(screen.queryByText(/What the proof shows:/)).toBeNull()
    expect(screen.queryByText(/Would clear it:/)).toBeNull()
  })

  it('reads "Waiting", never "Blocking", for a blocker whose state is "waiting"', async () => {
    renderBoard({
      ...AS_THE_LEAD,
      blockers: [{ ...blockers[0], state: 'waiting' as const }],
    })
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    expect(screen.getByText('Waiting')).toBeTruthy()
    expect(screen.queryByText('Blocking')).toBeNull()
  })
})

describe('"Decisions needed" moves for the lead, stays for everyone else', () => {
  const decisions = [{ question: 'Decide the discount.', why: 'Someone cannot move until this is decided.', owner: 'Bisi Adeyemi', source: 'blocker' as const }]

  it('for the lead, a decision reads inside "What needs you in this check-in", not as its own section', async () => {
    me = { id: 'u-bisi', firstName: 'Bisi', role: 'MEMBER' }
    renderBoard({ ...AS_THE_LEAD, sections: ['decisions'], decisions })
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    const needsYou = screen.getByText('What needs you in this check-in').closest('section') as HTMLElement
    expect(within(needsYou).getByText(decisions[0].question)).toBeTruthy()
    expect(screen.queryByText('Decisions needed')).toBeNull()
  })

  it('for a participant, "Decisions needed" is still its own section, as before', async () => {
    me = { id: 'u-kwame', firstName: 'Kwame', role: 'MEMBER' }
    renderBoard({ ...AS_KWAME, sections: ['decisions'], decisions })
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    expect(screen.getByText('Decisions needed')).toBeTruthy()
    const section = screen.getByText('Decisions needed').closest('section') as HTMLElement
    expect(within(section).getByText(decisions[0].question)).toBeTruthy()
  })
})

describe('the switchboard’s 22 sections: never a heading with nothing under it', () => {
  it('draws none of the 13 when the server sends none of them', async () => {
    me = { id: 'u-bisi', firstName: 'Bisi', role: 'MEMBER' }
    renderBoard({ ...base, myParticipantId: 'p-bisi', canEditFrame: true, readOnlyNote: null })
    await screen.findByRole('heading', { name: 'Sales org, Q3' })
    for (const heading of [
      'What could go wrong', 'Work plan', 'Timeline', 'What each person has done so far', 'Blockers',
      'Evidence index', 'Who is busy and who is free', 'What needs you in this check-in', 'What each side promised',
      'Where this could end up', 'Contradictions', 'Questions for you',
    ]) {
      expect(screen.queryByText(heading)).toBeNull()
    }
  })
})
