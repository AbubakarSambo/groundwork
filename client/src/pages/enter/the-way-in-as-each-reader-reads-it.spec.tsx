import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { TheDoor } from './TheDoor'
import { EverySituation, cardsUnder } from './EverySituation'
import { THE_GROUPS_IN_ORDER } from './the-way-in'

/*
 * THE WAY INTO A NEW CHECK-IN, AS A PERSON READS IT (U.6, B1).
 *
 * Checked against docs/prototype/screens/B1-starting-a-check-in/start.txt, new.txt and
 * all-situations.txt, word for word, on the rendered page rather than in the source.
 */

const onboardStream = vi.fn().mockResolvedValue({ reply: 'Who is it, and what were they meant to be delivering?', extracted: {} })
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function openStart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

describe('someone signed out opens /start', () => {
  beforeEach(() => { localStorage.clear(); onboardStream.mockClear() })

  it('reads the prototype’s first screen, and nothing about names, plans or steps', async () => {
    openStart()
    expect(await screen.findByRole('heading', { level: 1, name: 'What do you need updates on, or want to track?' })).toBeTruthy()
    expect(screen.getByText('A goal, a new hire, a decision. Describe it and we’ll set it up in about two minutes.')).toBeTruthy()
    for (const example of [
      'Track the team’s targets for the quarter',
      'Sales are behind and I don’t know why',
      'A new hire starts on Monday',
      'Someone isn’t delivering',
      'We have to choose a supplier',
    ]) expect(screen.getByRole('button', { name: example })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(text(screen.getByText('Rather pick from a list?', { exact: false }))).toBe('Rather pick from a list? See every situation.')
    expect(screen.getByPlaceholderText('For example: our sales targets this quarter')).toBeTruthy()

    const page = document.body.textContent ?? ''
    for (const gone of ['Give this a name', 'session planned', 'What is going on', 'Save & invite', 'Start over', 'Or pick a situation that already fits']) {
      expect(page, gone).not.toContain(gone)
    }
  })

  it('an example fills the box, and Continue sends those words to start the setup conversation', async () => {
    openStart()
    fireEvent.click(await screen.findByRole('button', { name: 'Someone isn’t delivering' }))
    expect((screen.getByPlaceholderText('For example: our sales targets this quarter') as HTMLTextAreaElement).value).toBe('Someone isn’t delivering')
    expect(onboardStream).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(onboardStream).toHaveBeenCalled())
    const [history, scenario] = onboardStream.mock.calls[0] as [{ role: string; content: string }[], string | undefined]
    expect(history[history.length - 1]).toEqual({ role: 'user', content: 'Someone isn’t delivering' })
    /* Described in their own words, so no card's situation is sent with it. */
    expect(scenario).toBeUndefined()
  })

  it('Continue does nothing while the box is empty', async () => {
    openStart()
    const go = await screen.findByRole('button', { name: 'Continue' })
    expect((go as HTMLButtonElement).disabled).toBe(true)
  })

  it('“See every situation” shows every situation under the prototype’s headings', async () => {
    openStart()
    fireEvent.click(await screen.findByRole('button', { name: 'See every situation' }))
    expect(screen.getByRole('heading', { level: 1, name: 'What do you want people to check in about?' })).toBeTruthy()
    expect(screen.getByText('Say it in your own words, or start from one of the situations below. Either way, it’s set up as you talk, and nothing is sent to anyone until you say so.')).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Something is starting', 'Goals and plans', 'Keeping a read', 'About one person', 'Something has gone off',
    ])
    const person = screen.getByRole('region', { name: 'About one person' })
    expect(within(person).getAllByRole('button').map((b) => [...b.querySelectorAll('span')].map(text))).toEqual([
      ['Help someone get back on track', 'Both sides on the concern, before the conversation.'],
      ['Support a raise, promotion, or recognition', 'The same evidence in front of both of you.'],
      ['Check in before a contract or renewal', 'An honest read of how the term went, from both sides.'],
    ])
    expect(screen.getByText('None of these fit? Describe it and we’ll work out what it is together.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Describe it' })).toBeTruthy()
  })

  it('picking a situation only picks it; “Start with this” sends its opening sentence', async () => {
    openStart()
    fireEvent.click(await screen.findByRole('button', { name: 'See every situation' }))
    fireEvent.click(screen.getByRole('button', { name: /^Help someone get back on track/ }))
    expect(onboardStream).not.toHaveBeenCalled()
    const panel = screen.getByRole('complementary', { name: 'You picked' })
    expect(within(panel).getByText('You picked')).toBeTruthy()
    expect(within(panel).getByText('Help someone get back on track')).toBeTruthy()
    expect(within(panel).getByText('Both sides on the concern, before the conversation.')).toBeTruthy()
    expect(text(panel)).toContain('It starts the conversation with: “A team member is not delivering and I need to address it. I want to make sure I have the full picture before we talk.” You can change every word.')
    expect(text(panel)).toContain('You don’t need an account to start. We ask for your email when there’s something worth keeping.')
    fireEvent.click(within(panel).getByRole('button', { name: 'Start with this' }))
    await waitFor(() => expect(onboardStream).toHaveBeenCalled())
    expect(onboardStream.mock.calls[0][1]).toBe('PIP')
  })
})

describe('someone signed in starts a check-in', () => {
  it('reads new.txt’s words, with no examples and nothing about an account', () => {
    render(<TheDoor signedIn onSend={() => {}} onSeeEverySituation={() => {}} />)
    expect(text(screen.getByRole('navigation', { name: 'Where you are' }))).toBe('Check-ins / New check-in')
    expect(screen.getByRole('heading', { level: 1, name: 'Set up a check-in' })).toBeTruthy()
    expect(screen.getByText('Describe it in your own words. Nothing is sent to anyone until you press send.')).toBeTruthy()
    expect(screen.getByLabelText('What do you want your team to check in about?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'A new hire starts on Monday' })).toBeNull()
  })

  it('the picked panel does not tell a signed-in person they need no account', () => {
    render(<EverySituation signedIn openerFor={() => 'An opening sentence.'} onSend={() => {}} onStart={() => {}} onDescribe={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^Help a new hire get started/ }))
    expect(document.body.textContent).not.toContain('You don’t need an account')
  })
})

describe('the list itself', () => {
  it('offers every card under exactly one heading, so none is lost from the list', async () => {
    const { SCENARIOS } = await import('@/pages/grounds/CreateGroundPage')
    const listed = THE_GROUPS_IN_ORDER.flatMap((g) => cardsUnder(g.key).map((c) => c.cardKey))
    expect([...listed].sort()).toEqual(SCENARIOS.map((c) => c.cardKey).sort())
  })
})
