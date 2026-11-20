import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AnswerFirstPage } from './AnswerFirstPage'

/**
 * THE OPEN LINK, FROM THE FIRST QUESTION TO THE LAST, AS SOMEBODY WITH THE LINK READS IT (Hafsah, 15 November 2026, audit rows 18, 19, 20).
 * The question and the box are there at once, with no Start button; the first answer starts the conversation. The name, organisation and
 * email (her decision of 23 September: all three, of everybody) and the phone number are asked in the chat, one line at a time.
 */
const api = { whatThisIs: vi.fn(), start: vi.fn(), say: vi.fn(), finish: vi.fn() }
vi.mock('@/api/entry', () => ({ openLinkApi: { whatThisIs: (...a: unknown[]) => api.whatThisIs(...a), start: (...a: unknown[]) => api.start(...a), say: (...a: unknown[]) => api.say(...a), finish: (...a: unknown[]) => api.finish(...a) } }))
vi.mock('@/lib/how-long-setup-takes', () => ({ useACheckInTakes: () => 'about two minutes', inASentence: (t: string) => t }))

function open() {
  return render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/answer?t=j']}><AnswerFirstPage /></MemoryRouter></QueryClientProvider>)
}
async function type(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  vi.clearAllMocks()
  try { window.localStorage.clear() } catch { /* none */ }
  api.whatThisIs.mockResolvedValue({ groundLabel: 'Get updates from your team', theQuestion: 'What shipped this week?', askedBy: 'Hafsah', scenario: 'TEAM_UPDATES', schedule: null })
  api.start.mockResolvedValue({ key: 'k1', reply: 'What shipped this week?' })
  api.say.mockResolvedValue({ reply: 'Thank you. That is all I need.', sessionComplete: true })
  api.finish.mockResolvedValue({ at: 'ama@x.test', willGetTheReport: true })
})

describe('the open link before the first answer', () => {
  it('shows the question and the box at once, with one plain line and no Start button', async () => {
    open()
    expect(await screen.findByRole('heading', { level: 1, name: 'What shipped this week?' })).toBeTruthy()
    expect(screen.getByRole('textbox')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Start/ })).toBeNull()
    expect(screen.getByText('It takes about two minutes. You will get the report at the end.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/shared picture|consolidated/)
    expect(api.start).not.toHaveBeenCalled()
  })

  it('starts the conversation with the first answer, not by opening the link', async () => {
    open()
    await screen.findByRole('heading', { level: 1, name: 'What shipped this week?' })
    await type('We shipped the new quote form')
    await waitFor(() => expect(api.say).toHaveBeenCalledWith('k1', 'We shipped the new quote form'))
    expect(api.start).toHaveBeenCalledTimes(1)
  })
})

describe('the last three things, asked in the chat', () => {
  it('asks the name, the organisation, the email and the phone as lines, then finishes with all of them', async () => {
    open()
    await screen.findByRole('heading', { level: 1, name: 'What shipped this week?' })
    await type('We shipped the new quote form')
    expect(await screen.findByText('Last thing. What is your name?')).toBeTruthy()
    expect(screen.queryByLabelText('Your name')).toBeNull()
    await type('Ama Mensah')
    expect(await screen.findByText('And which organisation are you with?')).toBeTruthy()
    await type('Coamana')
    expect(await screen.findByText('Where should I send the report?')).toBeTruthy()
    await type('not an address')
    expect(await screen.findByText(/That does not look like an email address/)).toBeTruthy()
    expect(api.finish).not.toHaveBeenCalled()
    await type('ama@x.test')
    expect(await screen.findByText('What is your phone number? You can skip this.')).toBeTruthy()
    await type('+254 712 345 678')
    await waitFor(() => expect(api.finish).toHaveBeenCalledWith('k1', 'ama@x.test', 'Ama Mensah', true, 'Coamana'))
    expect(await screen.findByText('The report goes to ama@x.test at the end.')).toBeTruthy()
  })

  it('lets the phone be skipped, and still finishes', async () => {
    open()
    await screen.findByRole('heading', { level: 1, name: 'What shipped this week?' })
    await type('We shipped it')
    await screen.findByText('Last thing. What is your name?')
    await type('Ama Mensah'); await screen.findByText('And which organisation are you with?')
    await type('Coamana'); await screen.findByText('Where should I send the report?')
    await type('ama@x.test'); await screen.findByText('What is your phone number? You can skip this.')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(api.finish).toHaveBeenCalledWith('k1', 'ama@x.test', 'Ama Mensah', true, 'Coamana'))
  })
})
