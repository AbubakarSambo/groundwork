import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * SETUP, AS KATO READS IT, FROM THE SERVER'S ONE READING (fix plan, release batch 1, group 5; round 39, 4 November 2026).
 *
 * Kato gave his team with their emails and numbers, was asked the same things again and again, and when he said "Just show me the board
 * now" no reply came. Here the server's reading is what the panel shows and what goes back with the next message, and the turn the
 * model closes on shows the product's last line and the one button.
 */
const onboardStream = vi.fn()
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(),
    classifyIntent: vi.fn().mockResolvedValue({ scenario: null }),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
    peopleOnLines: vi.fn().mockResolvedValue([]),
    onboardStream: (...a: unknown[]) => onboardStream(...a),
  },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn(), colleagues: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/billing', () => ({ billingApi: { checkCanCreateGround: vi.fn().mockResolvedValue({ allowed: true }) } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: { id: 'u-kato', email: 'kato@startup.test', firstName: 'Kato' }, isAuthenticated: true }) }))
vi.mock('@/api/grounds', () => ({ groundsApi: { get: vi.fn(), addTheirWhatsAppNumber: vi.fn() } }))

const HIS_WORDS = 'We are building a school fees app for Uganda and we are stuck on user adoption.'
const WHAT_THE_SERVER_KNOWS = {
  mode: 'recurring',
  initial: 'Getting more schools and parents using the school fees app',
  peopleNamed: ['Mugisha Okello', 'Nalule Kazibwe'],
  peopleEmails: { 'Mugisha Okello': 'mugisha@startup.test', 'Nalule Kazibwe': 'nalule@startup.test' },
  peoplePhones: { 'Mugisha Okello': '+256-772-332372', 'Nalule Kazibwe': '+256-771-222275' },
  goals: ['20 schools signed up', '1000 parents making payments'],
  classifiedScenario: 'PULSE_CHECK',
  kindName: 'Keep a read on live work',
}
const SETUP_IS_DONE = 'That’s everything I need to start. Send the invitations when you are ready.'

function openStart() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}
async function send(words: string) {
  const box = document.querySelector('textarea') as HTMLTextAreaElement
  fireEvent.change(box, { target: { value: words } })
  fireEvent.keyDown(box, { key: 'Enter' })
}

describe('setup reads one server reading', () => {
  beforeEach(() => { localStorage.clear(); onboardStream.mockReset() })

  it('the panel shows what the server knows, the team whole, and it goes back with the next message', async () => {
    onboardStream
      .mockResolvedValueOnce({ reply: 'Where do things stand today, as far as you know?', extracted: WHAT_THE_SERVER_KNOWS, ready: false, needsPeople: false })
      .mockResolvedValueOnce({ reply: 'Is anything wrong?', extracted: WHAT_THE_SERVER_KNOWS, ready: false, needsPeople: false })
    openStart()
    fireEvent.change(await screen.findByLabelText('What do you need updates on, or want to track?'), { target: { value: HIS_WORDS } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByText('Where do things stand today, as far as you know?')).toBeTruthy())
    await waitFor(() => expect(document.body.textContent).toContain('Mugisha Okello, mugisha@startup.test, +256-772-332372'))
    expect(document.body.textContent).toContain('Nalule Kazibwe, nalule@startup.test, +256-771-222275')
    expect(document.body.textContent).toContain('Keep a read on live work')

    await send('Ask Mugisha. That is his job.')
    await waitFor(() => expect(onboardStream).toHaveBeenCalledTimes(2))
    const soFar = onboardStream.mock.calls[1][4] as Record<string, unknown>
    expect(soFar).toMatchObject(WHAT_THE_SERVER_KNOWS)
  })

  it('the turn the model closes on shows the product’s last line and the button to send, not an empty screen', async () => {
    onboardStream
      .mockResolvedValueOnce({ reply: 'You have set up a check-in for Mugisha and Nalule. Is anything wrong?', extracted: WHAT_THE_SERVER_KNOWS, ready: false, needsPeople: false })
      .mockResolvedValueOnce({ reply: `\n\n${SETUP_IS_DONE}`, extracted: WHAT_THE_SERVER_KNOWS, ready: true, needsPeople: false })
    openStart()
    fireEvent.change(await screen.findByLabelText('What do you need updates on, or want to track?'), { target: { value: HIS_WORDS } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(screen.getByText(/Is anything wrong\?/)).toBeTruthy())
    await send('Just show me the board now.')
    await waitFor(() => expect(document.body.textContent).toContain(SETUP_IS_DONE))
    expect(await screen.findByRole('button', { name: 'Send 2 invitations' })).toBeTruthy()
  })
})
