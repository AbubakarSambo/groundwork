import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { toast } from 'sonner'
import { addThroughTheTeamBox } from './a-team-read-in-a-spec'

/**
 * NOTHING ANYONE SAYS IN SETUP IS EVER LOST (Hafsah's blocker, 31 October 2026: "Treat that as a blocker, ahead of everything else ...
 * prove in the next round that nothing anyone says in setup is ever lost").
 *
 * Round 4's law firm lead named her four people in the setup conversation and pressed "Save this". While the save ran she typed all
 * four, with emails and numbers, into the team box and pressed "Add everyone". The check-in was made with only her on it: the save
 * had sent only the people already moved out of the box, and the box stayed open while the save ran. She typed all four a third time
 * on People and setup.
 *
 * Now the lines in the box are the team, and "Save this" takes them, with names and phone numbers. A line with no email stops the save
 * with one sentence naming who needs one, and nothing is saved half-way. While the save runs the box takes no typing.
 *
 * REWRITTEN from "finds them in the team box ... presses once" (the same day): that spec pressed "Add everyone" before "Save this", the
 * separate step the law firm lead's save did not wait for, and checked the numbers through a second request after the save, which a
 * save finished from the email link never made. The numbers now travel in the save itself.
 */
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), warning: vi.fn(), success: vi.fn() } }))
vi.mock('@/api/entry', () => ({
  entryApi: {
    peopleOnLines: vi.fn(async (t: string) => (await import('./a-team-read-in-a-spec')).readLikeTheServer(t)),
    opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    commit: vi.fn().mockResolvedValue({ groundId: 'g-created' }),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-wanjiku', email: 'wanjiku@law.test', firstName: 'Wanjiku' }, isAuthenticated: true }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))

const NAMED = ['David Omondi', 'Sarah Njeri', 'Kevin Kimani', 'Grace Wambui']
const PHONES: Record<string, string> = {
  'David Omondi': '+254 722 129 895', 'Sarah Njeri': '+254 733 239 992', 'Kevin Kimani': '+254 700 340 089', 'Grace Wambui': '+254 711 450 186',
}
const emailOf = (n: string) => `${n.split(' ')[0].toLowerCase()}@law.test`
const lineFor = (n: string, withEmail: boolean) => [n, ...(withEmail ? [emailOf(n)] : []), PHONES[n]].join(', ')

function seedTheLawFirmsSetup() {
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: 'NEW_PROJECT', closed: true, onboardingStep: 7,
    history: [{ role: 'assistant', content: 'Who else is part of this?' }, { role: 'user', content: 'David Omondi, Sarah Njeri, Kevin Kimani and Grace Wambui.' }],
    report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
    groundName: 'Court deadlines and fee notes',
    onboardingSelections: { mode: 'new', initial: 'Court deadlines and fee notes.', peopleNamed: NAMED, peoplePhones: PHONES },
  }))
}

async function openTheSaveCard() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.click(await screen.findByText(/Invite and finish/))
  return (await screen.findByLabelText('Your team, one per line')) as HTMLTextAreaElement
}

describe('a lead who named four people in the setup conversation presses Save', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

  it('finds all four in the box with their numbers, and there is no separate press before saving', async () => {
    seedTheLawFirmsSetup()
    const box = await openTheSaveCard()
    expect(box.value.split('\n')).toEqual(NAMED.map((n) => lineFor(n, false)))
    expect(screen.queryByText('Add everyone')).toBeNull()
    /* What the people block says now counts the box: four are on it, not "You have not added anybody else yet". */
    expect(screen.queryByText(/You have not added anybody else yet/)).toBeNull()
    expect(screen.getByText(/^Everyone in the box above is on the check-in when you save it\. Nobody is invited before you save this check-in\. How many people you can add depends on your plan, not on the check-in\.$/)).toBeTruthy()
  })

  /* Changed in the team-skip hotfix (live pilot): this pinned "the save stops naming the two and nothing is saved". Skipping is always
     possible now, so the save goes ahead with the two who can be reached and says who is not on the check-in yet, in the same press. */
  it('with two emails in the box and two prefilled without, one press saves the two and says the other two are not on it yet', async () => {
    seedTheLawFirmsSetup()
    const box = await openTheSaveCard()
    addThroughTheTeamBox([lineFor(NAMED[0], true), lineFor(NAMED[1], true), lineFor(NAMED[2], false), lineFor(NAMED[3], false)].join('\n'))
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))

    const { entryApi } = await import('@/api/entry')
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.contributors.map((c: any) => c.email)).toEqual(['david@law.test', 'sarah@law.test'])
    expect(toast.info).toHaveBeenCalledWith('Kevin Kimani and Grace Wambui are not on the check-in yet, because there is no email for them. Add them under People when you have their emails.', expect.anything())
    expect(screen.queryByText(/This was not saved/)).toBeNull()
    expect(box.disabled).toBeDefined()
  })

  it('with every email given, all four reach the save with their names and phone numbers', async () => {
    seedTheLawFirmsSetup()
    await openTheSaveCard()
    addThroughTheTeamBox(NAMED.map((n) => lineFor(n, true)).join('\n'))
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))

    const { entryApi } = await import('@/api/entry')
    await waitFor(() => expect(entryApi.commit).toHaveBeenCalledTimes(1))
    const payload = vi.mocked(entryApi.commit).mock.calls[0][0] as any
    expect(payload.contributors).toHaveLength(4)
    for (const n of NAMED) {
      expect(payload.contributors).toContainEqual({ email: emailOf(n), displayName: n, phone: PHONES[n] })
    }
    /* The numbers go in the save; no second request is made after it. */
    const { groundsApi } = await import('@/api/grounds')
    expect(groundsApi.addTheirWhatsAppNumber).not.toHaveBeenCalled()
  })

  it('cannot type into the box while the save runs, so nothing typed then misses the save', async () => {
    seedTheLawFirmsSetup()
    const { entryApi } = await import('@/api/entry')
    let finish: (v: any) => void = () => {}
    vi.mocked(entryApi.commit).mockImplementationOnce(() => new Promise((r) => { finish = r }) as any)
    const box = await openTheSaveCard()
    addThroughTheTeamBox(NAMED.map((n) => lineFor(n, true)).join('\n'))
    fireEvent.click(screen.getByRole('button', { name: 'Save this' }))

    await waitFor(() => expect(entryApi.commit).toHaveBeenCalled())
    expect(box.disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeTruthy()
    finish({ groundId: 'g-created' })
  })
})
