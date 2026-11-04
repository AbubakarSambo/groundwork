import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { MARKETING_URL } from '@/lib/marketing'

/**
 * A SIGNED-IN LEAD WALKS THE WAY IN, AND STAYS IN THE APP WITH HER WORDS (milestone 1's smoke run, 3 November 2026).
 *
 * Wanjiru, an admin who had just signed up, pressed "Start a check-in", typed what her law firm needs, and ended up on the live
 * marketing site and then the live sign-in. Two things made that: the rail's logo on a build with no marketing site of its own went to
 * the production one (lib/marketing.ts now decides that once), and the walker pressed the logo when the example's curly apostrophe did
 * not match its straight one (and, a step earlier, tried to type into the logo, so her words never reached the box). This walks every
 * way she can send, as she reads it, including a first send that fails.
 */
const onboardStream = vi.fn()
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(),
    classifyIntent: vi.fn().mockResolvedValue({ scenario: null }),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-wanjiru', email: 'wanjiru@kamau-advocates.test', firstName: 'Wanjiru' }, isAuthenticated: true }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))

const HER_WORDS = 'I run a small law firm in Nairobi. Our fee notes go unpaid for months and we keep missing court filing deadlines.'
const THE_REPLY = 'Who on your team handles the court filings?'

let where = ''
function WhereSheIs() { where = useLocation().pathname; return null }

function openStart() {
  const startedAt = window.location.href
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /><WhereSheIs /></MemoryRouter>
    </QueryClientProvider>,
  )
  return startedAt
}
const theBox = () => screen.findByLabelText('What do you need updates on, or want to track?') as Promise<HTMLTextAreaElement>

async function sheIsStillHereWith(words: string, startedAt: string) {
  await waitFor(() => expect(screen.getByText(THE_REPLY)).toBeTruthy())
  expect(document.body.textContent).toContain(words)
  expect(onboardStream.mock.calls[0][0].some((t: { role: string; content: string }) => t.role === 'user' && t.content === words)).toBe(true)
  expect(where).toBe('/start')
  expect(window.location.href).toBe(startedAt)
}

describe('a signed-in lead at /start', () => {
  beforeEach(() => {
    localStorage.clear()
    onboardStream.mockReset().mockResolvedValue({ reply: THE_REPLY, extracted: {} })
  })

  it('types and presses Enter: her words are in the conversation and she is still in the app', async () => {
    const startedAt = openStart()
    const box = await theBox()
    fireEvent.change(box, { target: { value: HER_WORDS } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await sheIsStillHereWith(HER_WORDS, startedAt)
  })

  it('types and presses Continue: the same', async () => {
    const startedAt = openStart()
    fireEvent.change(await theBox(), { target: { value: HER_WORDS } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await sheIsStillHereWith(HER_WORDS, startedAt)
  })

  it('presses an example, then Continue: the example is what is sent', async () => {
    const startedAt = openStart()
    await theBox()
    fireEvent.click(screen.getByRole('button', { name: 'Track the team’s targets for the quarter' }))
    expect((await theBox()).value).toBe('Track the team’s targets for the quarter')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await sheIsStillHereWith('Track the team’s targets for the quarter', startedAt)
  })

  it('when the first send fails, her words are back in the box and the page says so', async () => {
    onboardStream.mockReset().mockRejectedValue(new Error('stream failed: 500'))
    const startedAt = openStart()
    fireEvent.change(await theBox(), { target: { value: HER_WORDS } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByText('That did not send. Your message is back in the box. Try again.')).toBeTruthy())
    /* She is in the setup conversation now, and the box under it holds what she wrote. */
    expect(screen.getByRole('heading', { level: 1, name: 'Set up a check-in' })).toBeTruthy()
    expect((document.querySelector('textarea') as HTMLTextAreaElement).value).toBe(HER_WORDS)
    expect(where).toBe('/start')
    expect(window.location.href).toBe(startedAt)
  })
})

describe('the logo on a build with no marketing site of its own', () => {
  it('stays in this app rather than going to the live site', () => {
    /* This test run is such a build, like the local bed and staging. */
    expect(MARKETING_URL).toBe('/')
  })
})
