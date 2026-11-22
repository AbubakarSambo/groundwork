import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { EntryChatPage, THE_OPENING_QUESTION } from './EntryChatPage'
import { addThroughTheTeamBox, pressTheSave } from './a-team-read-in-a-spec'

/*
 * HOTFIX, LIVE PILOT (RHEA onboarding). Two blockers in team check-in setup, as the admin read them.
 *
 * 1. Priscilla typed "Leah" and "Speranzer" with no emails, pressed "Save this", and read "This was not saved. Add an email for Leah and
 *    Speranzer, or take them off the list." Nothing could be saved or skipped. Skipping is always possible now: the save goes ahead and
 *    says who is not on the check-in yet, because inviting needs a way to reach them.
 * 2. The panel showed the chosen kind with only "It’s something else", which asked for a sentence. The list of every situation was only
 *    on the first screen. It is reachable inside setup now, and picking another kind keeps the people and everything said.
 */
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), warning: vi.fn(), success: vi.fn() } }))
vi.mock('@/api/entry', () => ({
  entryApi: {
    unfinished: vi.fn().mockResolvedValue(null),
    keepUnfinished: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), onboard: vi.fn(), classifyIntent: vi.fn().mockResolvedValue({ scenario: null }),
    chat: vi.fn(), report: vi.fn(), patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))
const asSomeone = vi.hoisted(() => ({ user: { id: 'u-priscilla', email: 'priscilla@rhea.test', firstName: 'Priscilla' } as any }))
vi.mock('@/stores/auth', () => {
  const useAuthStore: any = (sel: any) => sel({ user: asSomeone.user, isAuthenticated: true })
  useAuthStore.getState = () => ({ user: asSomeone.user, isAuthenticated: true })
  return { useAuthStore }
})
import { entryApi } from '@/api/entry'

function seed(over: { closed: boolean; names: string[]; classified?: string }) {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'GOALS', closed: over.closed, onboardingStep: 3, history: over.closed ? [{ role: 'assistant', content: 'Who is on it?' }, { role: 'user', content: over.names.join(' and ') }] : [],
    onboardingSelections: { mode: 'new', initial: 'Set goals and keep the team on track.', classifiedScenario: over.classified ?? 'GOALS', peopleNamed: over.names, brief: 'Agent activation across the counties.' },
    onboardingHistory: [
      { role: 'assistant', content: THE_OPENING_QUESTION },
      { role: 'user', content: `Set goals and keep the team on track. ${over.names.join(' and ')} are on it.` },
      { role: 'assistant', content: 'Thank you. What should they check in about?' },
    ],
  }))
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start?new=0']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

/* Changed 22 November 2026: the box is on the setup page, behind Change in the panel. */
async function toTheSaveCard() {
  fireEvent.click((await screen.findAllByRole('button', { name: /^Change/ }))[0])
  await screen.findByLabelText('Your team, one per line')
}

const NOT_ON_IT = (who: string, are = true) => `${who} ${are ? 'are' : 'is'} not on the check-in yet, because there is no email for them. Add them under People when you have their emails.`

describe('a name with no email never stops the save', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); asSomeone.user = { id: 'u-priscilla', email: 'priscilla@rhea.test', firstName: 'Priscilla' } })

  it('two names and no emails: one press saves, nobody is invited, and the sentence says who is not on it', async () => {
    seed({ closed: false, names: ['Leah', 'Speranzer'] })
    open()
    await toTheSaveCard()
    await addThroughTheTeamBox('Leah\nSperanzer')
    await pressTheSave()
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    expect((vi.mocked(entryApi.commit).mock.calls[0][0] as any).contributors).toEqual([])
    expect(toast.info).toHaveBeenCalledWith(NOT_ON_IT('Leah and Speranzer'), expect.anything())
    expect(document.body.textContent).not.toMatch(/This was not saved/)
  })

  it('a mixed box: the one with an email is invited, the one with only a phone and the one with nothing are said to be left off', async () => {
    seed({ closed: false, names: ['Leah', 'Speranzer', 'Brian'] })
    open()
    await toTheSaveCard()
    await addThroughTheTeamBox('Leah, leah@rhea.test\nSperanzer, +254 712 345 678\nBrian')
    await pressTheSave()
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const sent = (vi.mocked(entryApi.commit).mock.calls[0][0] as any).contributors
    expect(sent.map((c: any) => c.email)).toEqual(['leah@rhea.test'])
    expect(toast.info).toHaveBeenCalledWith(NOT_ON_IT('Speranzer and Brian'), expect.anything())
  })

  it('a name from the conversation that was written over is said once, in the same press, in the same words', async () => {
    seed({ closed: false, names: ['Leah', 'Speranzer'] })
    open()
    await toTheSaveCard()
    await addThroughTheTeamBox('Leah, leah@rhea.test')
    await pressTheSave()
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    expect(toast.info).toHaveBeenCalledWith(NOT_ON_IT('Speranzer', false), expect.anything())
  })
})

describe('the other kinds of check-in are reachable while setting one up', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  for (const who of [
    { name: 'an admin', user: { id: 'u-priscilla', email: 'priscilla@rhea.test', firstName: 'Priscilla', role: 'ADMIN' } },
    { name: 'a lead', user: { id: 'u-amina', email: 'amina@rhea.test', firstName: 'Amina', role: 'MEMBER' } },
  ]) {
    it(`for ${who.name}, "It’s something else" opens the list of every situation, and a pick changes only the kind`, async () => {
      asSomeone.user = who.user
      seed({ closed: false, names: ['Leah', 'Speranzer'] })
      open()
      const panel = (await screen.findByRole('complementary', { name: 'What is set so far' }))
      expect(panel.textContent).toContain('Leah')
      fireEvent.click(within(panel).getByRole('button', { name: 'It’s something else' }))

      /* The list, not a request to type a sentence. */
      expect(await screen.findByRole('heading', { name: 'What do you want people to check in about?' })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Something is starting' })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'About one person' })).toBeTruthy()
      expect(document.body.textContent).not.toContain('Then tell me in a sentence what it is')

      fireEvent.click(within(screen.getByRole('region', { name: 'About one person' })).getAllByRole('button')[0])
      const picked = screen.getByRole('complementary', { name: 'You picked' })
      expect(picked.textContent).toContain('Everything you have said so far is kept. Only the kind of check-in changes.')
      fireEvent.click(within(picked).getByRole('button', { name: 'Use this kind of check-in' }))

      /* The kind changed; the people, the brief and the conversation are all still there, and nothing was sent to the server. */
      await waitFor(() => expect(screen.queryByRole('heading', { name: 'What do you want people to check in about?' })).toBeNull())
      const after = screen.getByRole('complementary', { name: 'What is set so far' })
      expect(after.textContent).not.toContain('Set goals and keep the team on track')
      expect(after.textContent).toContain('Leah')
      expect(after.textContent).toContain('Speranzer')
      expect(document.body.textContent).toContain('Thank you. What should they check in about?')
      expect(document.body.textContent).toMatch(/Everything you have told me so far is kept\./)
      expect(entryApi.commit).not.toHaveBeenCalled()
      /* And it can be changed again. */
      expect(within(after).getByRole('button', { name: 'It’s something else' })).toBeTruthy()
    })
  }

  it('"Describe it" and "Keep it as it is" both close the list; describing keeps everything said and asks what it is', async () => {
    seed({ closed: false, names: ['Leah', 'Speranzer'] })
    open()
    fireEvent.click(within(await screen.findByRole('complementary', { name: 'What is set so far' })).getByRole('button', { name: 'It’s something else' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Keep it as it is' }))
    expect(screen.queryByRole('heading', { name: 'What do you want people to check in about?' })).toBeNull()
    fireEvent.click(within(screen.getByRole('complementary', { name: 'What is set so far' })).getByRole('button', { name: 'It’s something else' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Describe it' }))
    expect(await screen.findByText('Then tell me in a sentence what it is, and I will set it up for that.')).toBeTruthy()
    expect(document.body.textContent).toContain('Thank you. What should they check in about?')
  })
})
