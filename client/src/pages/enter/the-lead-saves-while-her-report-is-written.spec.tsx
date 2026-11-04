import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/*
 * THE LEAD SAVES WHILE HER REPORT IS STILL BEING WRITTEN (Hafsah's speed brief, 3 November 2026). The report at the end of setup
 * takes 17 to 28 seconds, and Save stayed greyed out until it landed. For a signed-in lead, Save works at once now: she reads the
 * setup she is saving (its name, schedule and people) while the report is written, and the server keeps that same report on her
 * check-in when it lands. Read as the signed-in lead.
 */
let releaseTheReport: (r: { report: any }) => void = () => undefined
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(),
    report: vi.fn(() => new Promise((r) => { releaseTheReport = r })),
    onboard: vi.fn(),
    classifyIntent: vi.fn().mockResolvedValue({ scenario: null, confidence: 'low' }),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created', contributors: [], failedInvites: [] }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u1', email: 'tendai@kijani.test', firstName: 'Tendai' }, isAuthenticated: true }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'OKR_ALIGNMENT',
    closed: false,
    history: [
      { role: 'assistant', content: 'Who on the team carries how much of that?' },
      { role: 'user', content: 'Tunde, Ngozi, Emeka and Halima, 15 million each.' },
    ],
    onboardingStep: 7,
    onboardingSelections: { mode: 'new', initial: 'Sales team to hit 60 million naira', peopleNamed: ['Tunde', 'Ngozi', 'Emeka', 'Halima'] },
    onboardingHistory: [
      { role: 'assistant', content: 'What brings you here?' },
      { role: 'user', content: 'I run a sales team of four in Lagos.' },
    ],
    groundName: 'Lagos sales, Q4',
  }))
})

async function endTheSession() {
  await waitFor(() => expect(screen.getAllByText('Tunde, Ngozi, Emeka and Halima, 15 million each.').length).toBeGreaterThan(0))
  fireEvent.click(screen.getByRole('button', { name: 'End session' }))
  const dialog = await screen.findByRole('dialog', { name: 'End this session?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'End session' }))
}

describe('the signed-in lead, while her report is being written', () => {
  it('reads that she does not have to wait, sees what she is saving, and Save works', async () => {
    const { entryApi } = await import('@/api/entry')
    renderPage()
    await endTheSession()
    await waitFor(() => expect(entryApi.report).toHaveBeenCalled())
    expect(await screen.findByText('This one takes about half a minute. You do not have to wait for it. Save now, and your report is kept with your check-in when it is ready.')).toBeTruthy()
    /* What she is saving is on the card already: the name and the setup. */
    expect(screen.getByText('Set up a check-in')).toBeTruthy()
    const save = screen.getByRole('button', { name: 'Save this' }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    /* No report yet, so none is sent; the report call carried the same setup key the save did, which is how the server keeps it. */
    const body = (entryApi.commit as any).mock.calls[0][0]
    expect(body.reportSummary).toBeUndefined()
    const reportCall = (entryApi.report as any).mock.calls[0]
    expect(reportCall[6]).toBe(body.setupKey)
    expect(typeof body.setupKey).toBe('string')
  })

  it('a report that lands after she saved is not drawn again or kept on this device', async () => {
    const { toast } = await import('sonner')
    renderPage()
    await endTheSession()
    fireEvent.click(await screen.findByRole('button', { name: 'Save this' }))
    const { entryApi } = await import('@/api/entry')
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const before = localStorage.getItem('gw_entry_session')
    releaseTheReport({ report: { alignmentStatus: 'Clear', whatGroundworkSaw: 'This is what you said in session 1. Nobody else has checked in yet.', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] } })
    await new Promise((r) => setTimeout(r, 20))
    expect(localStorage.getItem('gw_entry_session')).toBe(before)
    expect(toast.error).not.toHaveBeenCalled()
  })
})
