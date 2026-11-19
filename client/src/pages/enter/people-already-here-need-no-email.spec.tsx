import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * PEOPLE ALREADY IN THE ORGANISATION NEED NO EMAIL, AND THE BOX IS THE ONE LIST (round 6: the family business and clinic admins added
 * their team on People first; Ben Juma, Diana Omondi and Emeka Obi did not reach the check-in).
 *
 * Setup's reading now knows who is already here, so "my team" puts them in the people named, and the box offers them by name. A name in
 * the box that is a colleague is saved as that colleague, with the address the organisation already has: nothing is typed again. A
 * colleague picked from the list goes into the same box, so there is one list, kept with the setup.
 */
vi.mock('@/api/entry', () => ({
  entryApi: {
    unfinished: vi.fn().mockResolvedValue(null),
    keepUnfinished: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), onboard: vi.fn(), classifyIntent: vi.fn(), chat: vi.fn(),
    report: vi.fn(() => new Promise(() => {})),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({
  authApi: {
    entrySave: vi.fn(),
    colleagues: vi.fn().mockResolvedValue([
      { id: 'c-ben', name: 'Ben Juma', role: 'MEMBER', team: 'Stores' },
      { id: 'c-diana', name: 'Diana Omondi', role: 'MEMBER', team: 'Deliveries' },
      { id: 'c-karanja', name: 'Karanja Mumbi', role: 'MEMBER', team: null },
    ]),
  },
}))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => {
  const state = { user: { id: 'u-wanjiru', email: 'wanjiru@family.test', firstName: 'Wanjiru' }, isAuthenticated: true }
  const useAuthStore: any = (sel: any) => sel(state)
  useAuthStore.getState = () => state
  return { useAuthStore }
})
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))
import { entryApi } from '@/api/entry'

function seedHerSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT', closed: false, onboardingStep: 3, history: [],
    /* What the reading made of "my team, the people I added": the two of them, by the names on People. */
    onboardingSelections: { mode: 'new', initial: 'Stock and deliveries keep going wrong.', peopleNamed: ['Ben Juma', 'Diana Omondi'] },
    onboardingHistory: [
      { role: 'assistant', content: 'Who is involved?' },
      { role: 'user', content: 'My team, the people I added on People.' },
    ],
  }))
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a lead who added her team on People first', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('finds them in the box by name, and the save takes them as those colleagues with nothing typed again', async () => {
    seedHerSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))
    /* Changed in F5 (stage 5): both are colleagues, so nobody needs an email and setup ends on one button. */
    expect(await screen.findByText('Ben Juma')).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: 'Send 2 invitations' }))

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.contributors).toContainEqual(expect.objectContaining({ colleagueId: 'c-ben' }))
    expect(payload.contributors).toContainEqual(expect.objectContaining({ colleagueId: 'c-diana' }))
    expect(screen.queryByText(/This was not saved/)).toBeNull()
  })

  it('a colleague picked from the list goes into the same box, kept with the setup, and is saved with the rest', async () => {
    seedHerSetup()
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'End session' }))
    /* Changed in F5 (stage 5): the full setup, with the picker, opens from Change beside the name. */
    fireEvent.click((await screen.findAllByRole('button', { name: 'Change' }))[0])
    /* Waits for exactly one: while the setup panel swaps in, a slow runner briefly has two boxes with this name, and
       findBy would fail on "multiple elements" instead of retrying. */
    let box!: HTMLTextAreaElement
    await waitFor(() => { box = screen.getByLabelText('Your team, one per line') as HTMLTextAreaElement })
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Karanja Mumbi' }))
    const picker = screen.getByRole('listbox').closest('div')!.parentElement as HTMLElement
    fireEvent.click(within(picker).getByRole('button', { name: /^Add/ }))

    await waitFor(() => expect(box.value.split('\n')).toEqual(['Ben Juma', 'Diana Omondi', 'Karanja Mumbi']))
    expect(JSON.parse(localStorage.getItem('gw_entry_session')!).teamText.split('\n')).toContain('Karanja Mumbi')
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.contributors.filter((c: any) => c.colleagueId).map((c: any) => c.colleagueId).sort()).toEqual(['c-ben', 'c-diana', 'c-karanja'])
  })
})
