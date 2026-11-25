import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AskGroundwork } from './AskGroundwork'
import { askApi } from '@/api/ask'
import { groundsApi } from '@/api/grounds'

/**
 * "GROUNDWORK IS WRITING…" IN ASK (Hafsah, 9 October). Ask's own three-dot indicator, with no
 * words, is replaced by the shared part, speaking as Ask under its own name. Fails before this
 * change: the old markup said nothing, only three bare dots.
 */
vi.mock('@/stores/auth', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1', organizationName: 'Kijani Foods' } }),
}))
vi.mock('@/api/grounds', () => ({ groundsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/api/documents', () => ({ documentsApi: { list: vi.fn(), upload: vi.fn() } }))
vi.mock('@/api/ask', () => ({ askApi: { mine: vi.fn(), ask: vi.fn(), answer: vi.fn() } }))

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AskGroundwork />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Ask Groundwork: the writing indicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(askApi.mine as any).mockResolvedValue({
      canAsk: true, about: [], turns: [], askName: 'Ask Kijani Foods',
      caption: 'Ask about the company, your work or your check-ins.', addLine: '', welcome: null, starters: [],
    })
    ;(groundsApi.list as any).mockResolvedValue([])
  })

  it('shows "Ask Kijani Foods is writing…" while a reply is pending, and clears it once the reply lands', async () => {
    let resolveAsk!: (v: unknown) => void
    ;(askApi.ask as any).mockReturnValue(new Promise((resolve) => { resolveAsk = resolve }))
    mount()
    const field = await screen.findByPlaceholderText(/^Ask (a question|about this check-in)$/)
    /* The box is there while Ask loads, waiting; it takes a question once Ask is ready (UPDATED 23 November, journey 6: its hint no longer waits for the load). */
    await waitFor(() => expect(field).not.toBeDisabled())
    await userEvent.type(field, 'What is our runway?')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText('Ask Kijani Foods is writing…')).toBeTruthy()
    resolveAsk({ blocks: [{ type: 'text', body: 'About five months.' }], composedBy: 'model', lane: 'test' })
    expect(await screen.findByText('About five months.')).toBeTruthy()
    expect(screen.queryByText('Ask Kijani Foods is writing…')).toBeNull()
  })

  it('clears the indicator when the question fails, and the existing failure message shows', async () => {
    let rejectAsk!: (e: unknown) => void
    ;(askApi.ask as any).mockReturnValue(new Promise((_resolve, reject) => { rejectAsk = reject }))
    mount()
    const field = await screen.findByPlaceholderText(/^Ask (a question|about this check-in)$/)
    /* The box is there while Ask loads, waiting; it takes a question once Ask is ready (UPDATED 23 November, journey 6: its hint no longer waits for the load). */
    await waitFor(() => expect(field).not.toBeDisabled())
    await userEvent.type(field, 'What is our runway?')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText('Ask Kijani Foods is writing…')).toBeTruthy()
    rejectAsk({ response: { data: {} } })
    await waitFor(() => expect(screen.queryByText('Ask Kijani Foods is writing…')).toBeNull())
    expect(await screen.findByText('That did not send. What you wrote is still here, so you can try again.')).toBeTruthy()
  })
})
