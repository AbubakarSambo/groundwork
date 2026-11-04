import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * A SETUP LEFT ON ANOTHER DEVICE OPENS HERE, AS IT WAS LEFT (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is ever
 * lost").
 *
 * Round 5: the field programme lead pressed "Carry on" and /start opened with only its first question; the startup lead came back to a
 * team box asking for every email he had already typed. The setup was kept only on the device. For a signed-in lead it is kept on the
 * server too now, with the team box as written, and /start on a device with nothing kept opens the server's copy.
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    unfinished: vi.fn(),
    keepUnfinished: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    report: vi.fn(() => new Promise(() => {})),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => {
  const state = { user: { id: 'u-akello', email: 'akello@startup.test', firstName: 'Akello' }, isAuthenticated: true }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))
import { entryApi } from '@/api/entry'

const HIS_TEAM = [
  'David Mutebi, david@startup.test',
  'Aisha Nakato, aisha@startup.test',
  'Robert Okello, robert@startup.test',
  'Grace Ninsiima, grace@startup.test',
].join('\n')

const STILL_TALKING = {
  scenario: '', closed: false, onboardingStep: 2, history: [],
  onboardingSelections: { mode: 'new', initial: 'Get the school fees app released.', peopleNamed: ['David Mutebi', 'Aisha Nakato', 'Robert Okello', 'Grace Ninsiima'] },
  onboardingHistory: [
    { role: 'assistant', content: 'Who is working on getting the app ready for release?' },
    { role: 'user', content: 'David Mutebi is our lead developer. Aisha Nakato is the product manager. Robert Okello is our designer. Grace Ninsiima is marketing lead.' },
    { role: 'assistant', content: 'How long do you expect the release to take from here?' },
  ],
}

const ENDED_WITH_HIS_TEAM_TYPED = {
  ...STILL_TALKING, closed: true, onboardingStep: 7,
  history: STILL_TALKING.onboardingHistory,
  teamText: HIS_TEAM,
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a lead opens /start on a device that has nothing kept', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('opens the setup he left elsewhere, with everything he said', async () => {
    vi.mocked(entryApi.unfinished).mockResolvedValue(STILL_TALKING as any)
    open()
    expect(await screen.findByText(/David Mutebi is our lead developer/)).toBeTruthy()
    expect(screen.getByText('How long do you expect the release to take from here?')).toBeTruthy()
  })

  it('brings back the team box as he wrote it, emails and all, so nothing is asked again', async () => {
    vi.mocked(entryApi.unfinished).mockResolvedValue(ENDED_WITH_HIS_TEAM_TYPED as any)
    open()
    /* Changed in F5 (stage 5): setup ends in the panel, with his four listed and one button; the box opens from Change. */
    expect(await screen.findByRole('button', { name: 'Send 4 invitations' })).toBeTruthy()
    expect(screen.getByText('David Mutebi, david@startup.test')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    const box = (await screen.findByLabelText('Your team, one per line')) as HTMLTextAreaElement
    expect(box.value).toBe(HIS_TEAM)
  })

  it('keeps what he writes in the box on the server as he writes it', async () => {
    vi.mocked(entryApi.unfinished).mockResolvedValue({ ...ENDED_WITH_HIS_TEAM_TYPED, teamText: '' } as any)
    open()
    fireEvent.click(await screen.findByText(/Invite and finish/))
    const box = await screen.findByLabelText('Your team, one per line')
    fireEvent.change(box, { target: { value: HIS_TEAM } })
    await waitFor(() => {
      const kept = vi.mocked(entryApi.keepUnfinished).mock.calls.map((c) => c[0] as any)
      expect(kept[kept.length - 1]?.teamText).toBe(HIS_TEAM)
    })
  })
})

describe('a signed-in lead with nothing left anywhere', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('opens a new setup at its first question', async () => {
    vi.mocked(entryApi.unfinished).mockResolvedValue(null)
    open()
    /* Changed in F5: the signed-in way in reads start.txt's question. */
    expect(await screen.findByRole('heading', { name: 'What do you need updates on, or want to track?' })).toBeTruthy()
  })
})
