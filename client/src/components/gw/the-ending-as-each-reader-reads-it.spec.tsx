import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ResolutionPanel, type WhereThePanelSits } from './ResolutionPanel'
import { resolutionApi } from '@/api/resolution'
import { useAuthStore } from '@/stores/auth'

vi.mock('@/api/resolution', () => ({
  resolutionApi: { get: vi.fn(), propose: vi.fn(), counter: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/**
 * HOW A CHECK-IN ENDS, AS EACH READER READS IT (U.11, B6).
 *
 * The words are the prototype's (docs/prototype/screens/B6-ending-a-check-in/*.txt) wherever it has
 * them. Wairimu runs "Kwame, first 90 days". Kwame is in it. Grace is an admin who is not in it.
 * Decisions rule 6: the person sees the decision and its reasons; nobody sees a label on a person.
 */
const REASON = 'He brought in 5 new accounts against a goal of 4, and he has raised problems the same day since week 8.'

function state(reader: 'wairimu' | 'kwame' | 'grace', closed: boolean) {
  return {
    resolution: closed
      ? { id: 'r1', groundId: 'g1', endState: 'KEEP', closedAt: '2026-09-30T10:00:00Z', reason: REASON }
      : null,
    confirmations: [
      { participantId: 'p1', label: 'Wairimu', partyType: 'INITIATOR', endState: closed ? 'KEEP' : null, confirmed: closed },
      { participantId: 'p2', label: 'Kwame', partyType: 'PARTICIPANT', endState: null, confirmed: false },
    ],
    confirmedCount: closed ? 1 : 0,
    totalActive: 2,
    options: [
      { value: 'KEEP', label: 'Keep the hire' },
      { value: 'EXTEND', label: 'Extend evaluation period' },
    ],
    groundStatus: closed ? 'CLOSED' : 'ACTIVE',
    leadDecides: true,
    viewerIsLead: reader === 'wairimu',
    viewerIsParty: reader !== 'grace',
  }
}

function renderAs(reader: 'wairimu' | 'kwame' | 'grace', closed: boolean, opts: { place?: WhereThePanelSits; nearTheEnd?: boolean; lastSessionDone?: boolean } = {}) {
  ;(resolutionApi.get as any).mockResolvedValue(state(reader, closed))
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ResolutionPanel groundId="g1" {...opts} />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

/* Wait until the server's answer has been read and drawn, so an empty panel is really empty and not
   still loading. */
async function settled() {
  await waitFor(() => expect(resolutionApi.get).toHaveBeenCalled())
  await new Promise((r) => setTimeout(r, 30))
}

const LABELS_ON_PEOPLE = /\b(PIP|at risk|exit|underperform|low performer)\b/i

beforeEach(() => vi.clearAllMocks())

describe('Wairimu, who runs it, on the ending page', () => {
  it('reads the prototype’s page, and decides with a reason', async () => {
    const { container } = renderAs('wairimu', false)
    expect(await screen.findByText('How does this end?')).toBeTruthy()
    expect(screen.getByText(
      'This one is yours to decide. Kwame can see the possible outcomes and where things stand, and what each of you shared stays whichever way you go.',
    )).toBeTruthy()
    expect(screen.getByText('The outcome')).toBeTruthy()
    expect(screen.getByLabelText('Why, in a sentence or two')).toBeTruthy()
    expect(screen.getByText('Kwame reads this with the outcome.')).toBeTruthy()
    expect(screen.getByText('Save the outcome and end it')).toBeTruthy()
    /* B-081: "account" is banned wherever a person reads about their own words - this line used
       "correct their account", the one spot the earlier fix (request 194/item 4) missed. */
    expect(screen.getByText(
      'Ending means nobody can add to it. Both of you keep your own history, and Kwame can still correct what they said.',
    )).toBeTruthy()
    expect(screen.getByText('What Kwame sees now')).toBeTruthy()
    expect(screen.getByText(
      '“These are the outcomes this check-in can reach. Wairimu decides which one it is. Your words are kept either way, and you can still correct or add to them.”',
    )).toBeTruthy()
    expect(container.textContent).not.toMatch(LABELS_ON_PEOPLE)
  })

  it('reads how it ended, with her own reason, once it has ended', async () => {
    renderAs('wairimu', true)
    expect(await screen.findByText('How this ended')).toBeTruthy()
    expect(screen.getByText('Keep the hire')).toBeTruthy()
    expect(screen.getByText('You decided this on 30 September.')).toBeTruthy()
    expect(screen.getByText('Your reason')).toBeTruthy()
    expect(screen.getByText(REASON)).toBeTruthy()
    expect(screen.queryByText('Save the outcome and end it')).toBeNull()
  })
})

describe('Kwame, the person it is about', () => {
  it('reads the outcomes and who decides, and is never handed a button to decide it', async () => {
    const { container } = renderAs('kwame', false)
    expect(await screen.findByText(
      'These are the outcomes this check-in can reach. Wairimu decides which one it is. Your words are kept either way, and you can still correct or add to them.',
    )).toBeTruthy()
    expect(screen.getByText('Keep the hire')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Keep the hire/ })).toBeNull()
    expect(screen.queryByText('Save the outcome and end it')).toBeNull()
    expect(screen.queryByLabelText('Why, in a sentence or two')).toBeNull()
    expect(screen.queryByText(/What Kwame sees now/)).toBeNull()
    expect(container.textContent).not.toMatch(LABELS_ON_PEOPLE)
  })

  it('reads the decision with Wairimu’s reason once it has ended', async () => {
    const { container } = renderAs('kwame', true)
    expect(await screen.findByText('How this ended')).toBeTruthy()
    expect(screen.getByText('Keep the hire')).toBeTruthy()
    expect(screen.getByText('Wairimu decided this on 30 September.')).toBeTruthy()
    expect(screen.getByText('Wairimu’s reason')).toBeTruthy()
    expect(screen.getByText(REASON)).toBeTruthy()
    expect(screen.getByText('You can still correct your words.')).toBeTruthy()
    expect(container.textContent).not.toMatch(LABELS_ON_PEOPLE)
  })
})

describe('Grace, an admin who only reads it', () => {
  it('reads the outcomes and who decides, and is not told about an account she does not have', async () => {
    renderAs('grace', false)
    expect(await screen.findByText(
      'These are the outcomes this check-in can reach. Wairimu decides which one it is.',
    )).toBeTruthy()
    expect(screen.queryByText(/Your account/)).toBeNull()
    expect(screen.queryByText('Save the outcome and end it')).toBeNull()
  })

  it('reads the decision and its reason once it has ended', async () => {
    renderAs('grace', true)
    expect(await screen.findByText('Wairimu decided this on 30 September.')).toBeTruthy()
    expect(screen.getByText(REASON)).toBeTruthy()
    expect(screen.queryByText(/Your account/)).toBeNull()
  })
})

describe('on the board', () => {
  it('the top tells Wairimu the last session is done and takes her to the ending page', async () => {
    renderAs('wairimu', false, { place: 'board-top', nearTheEnd: true, lastSessionDone: true })
    expect(await screen.findByText('The last check-in is done')).toBeTruthy()
    expect(screen.getByText('It’s yours to decide how this ends.')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Decide how it ends' })
    expect(link.getAttribute('href')).toBe('/grounds/g1/end')
    expect(screen.queryByLabelText('Why, in a sentence or two')).toBeNull()
  })

  it('the top says nothing to Kwame while it is open, and nothing to anyone early on', async () => {
    const kwame = renderAs('kwame', false, { place: 'board-top', nearTheEnd: true, lastSessionDone: true })
    await settled()
    expect(kwame.container.textContent).toBe('')
    kwame.unmount()
    const early = renderAs('wairimu', false, { place: 'board-top', nearTheEnd: false })
    await settled()
    expect(early.container.textContent).toBe('')
  })

  it('once it has ended, the top shows everyone how it ended, and the foot shows it no second time', async () => {
    for (const reader of ['wairimu', 'kwame', 'grace'] as const) {
      const top = renderAs(reader, true, { place: 'board-top', nearTheEnd: true })
      expect(await screen.findByText('How this ended')).toBeTruthy()
      expect(screen.getByText(REASON)).toBeTruthy()
      top.unmount()
      const foot = renderAs(reader, true, { place: 'board-bottom', nearTheEnd: true })
      await settled()
      expect(foot.container.textContent).toBe('')
      foot.unmount()
    }
  })

  it('the foot shows Kwame the outcomes near the end, and not Wairimu, who decides on the ending page', async () => {
    renderAs('kwame', false, { place: 'board-bottom', nearTheEnd: true })
    expect(await screen.findByText(/Wairimu decides which one it is/)).toBeTruthy()
    const lead = renderAs('wairimu', false, { place: 'board-bottom', nearTheEnd: true })
    await settled()
    expect(lead.container.textContent).toBe('')
  })
})

/**
 * B-071: the server's own label for the lead's confirmation is "You" when the reader IS the lead
 * (`whatEachLabelIsCalled`, `readerIsYou: true`) - right wherever the panel addresses her directly,
 * wrong in "What everyone else sees now", a literal quote of somebody else's screen, where Amani
 * never reads "You" about Wairimu. Reproduced with the server's real label, not a test-only name.
 */
function stateWithTheLeadsOwnLabelAsYou(closed: boolean) {
  return {
    resolution: closed
      ? { id: 'r1', groundId: 'g1', endState: 'KEEP', closedAt: '2026-09-30T10:00:00Z', reason: REASON }
      : null,
    confirmations: [
      { participantId: 'p1', label: 'You', partyType: 'INITIATOR', endState: closed ? 'KEEP' : null, confirmed: closed },
      { participantId: 'p2', label: 'Kwame', partyType: 'PARTICIPANT', endState: null, confirmed: false },
    ],
    confirmedCount: closed ? 1 : 0,
    totalActive: 2,
    options: [
      { value: 'KEEP', label: 'Keep the hire' },
      { value: 'EXTEND', label: 'Extend evaluation period' },
    ],
    groundStatus: closed ? 'CLOSED' : 'ACTIVE',
    leadDecides: true,
    viewerIsLead: true,
    viewerIsParty: true,
  }
}

describe('B-071: the lead reads what Amani sees, and it is never "You decides"', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false } as any)
  })

  it('Wairimu, with her own real name known to the app, reads her own name in "What everyone else sees now", not "You"', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'wairimu@msingi.test', firstName: 'Wairimu', lastName: 'Njoroge', role: 'LEAD', organizationId: 'o1' },
      token: 't',
      isAuthenticated: true,
    } as any)
    ;(resolutionApi.get as any).mockResolvedValue(stateWithTheLeadsOwnLabelAsYou(false))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <ResolutionPanel groundId="g1" />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('What Kwame sees now')).toBeTruthy()
    expect(screen.getByText(
      '“These are the outcomes this check-in can reach. Wairimu Njoroge decides which one it is. Your words are kept either way, and you can still correct or add to them.”',
    )).toBeTruthy()
    expect(screen.queryByText(/You decides|You decide which one it is/)).toBeNull()
  })

  it('falls back to "Whoever runs it decides" rather than "You decides" when her own name has not loaded yet', async () => {
    ;(resolutionApi.get as any).mockResolvedValue(stateWithTheLeadsOwnLabelAsYou(false))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <ResolutionPanel groundId="g1" />
        </QueryClientProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('What Kwame sees now')).toBeTruthy()
    expect(screen.getByText(
      '“These are the outcomes this check-in can reach. Whoever runs it decides which one it is. Your words are kept either way, and you can still correct or add to them.”',
    )).toBeTruthy()
    expect(screen.queryByText(/You decides|You decide which one it is/)).toBeNull()
  })
})
