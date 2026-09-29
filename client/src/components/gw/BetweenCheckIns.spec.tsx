import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { BetweenCheckIns } from './BetweenCheckIns'
import { useAskStore } from '@/stores/ask'

/**
 * BETWEEN CHECK-INS (docs/prototype/screens/B3-the-check-in/between-check-ins.jpg/.txt).
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: { myNotes: vi.fn().mockResolvedValue([]), addMyNote: vi.fn(), deleteMyNote: vi.fn() },
}))

function mount(props: Partial<Parameters<typeof BetweenCheckIns>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BetweenCheckIns groundLabel="Sales team, Q3" nextOpensSaying="Your next check-in opens tomorrow at 4pm." groundId="g1" {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('between check-ins', () => {
  it('says the check-in\'s name, that nothing is open, and when the next one is, the prototype\'s own words', () => {
    mount()
    expect(screen.getByText('Sales team, Q3')).toBeTruthy()
    expect(screen.getByText('No check-in open right now')).toBeTruthy()
    expect(screen.getByText('Your next check-in opens tomorrow at 4pm. Anything I can help with in the meantime?')).toBeTruthy()
  })

  it('says just the question when nothing is scheduled yet', () => {
    mount({ nextOpensSaying: null })
    expect(screen.getByText('Anything I can help with in the meantime?')).toBeTruthy()
  })

  it('offers the four chips', () => {
    mount()
    for (const label of ['What am I missing?', 'Review my goals', 'What did I say I’d do?', 'Add a note for tomorrow']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
  })

  it('three chips ask Ask Groundwork that exact question', async () => {
    mount()
    for (const label of ['What am I missing?', 'Review my goals', 'What did I say I’d do?']) {
      useAskStore.setState({ open: false, pendingMessage: null })
      await userEvent.click(screen.getByRole('button', { name: label }))
      expect(useAskStore.getState().open).toBe(true)
      expect(useAskStore.getState().pendingMessage).toBe(label)
    }
  })

  it('"Add a note for tomorrow" opens the private note box, not Ask Groundwork', async () => {
    useAskStore.setState({ open: false, pendingMessage: null })
    mount()
    expect(screen.queryByPlaceholderText('Note something for your next check-in…')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Add a note for tomorrow' }))
    expect(useAskStore.getState().open).toBe(false)
    expect(await screen.findByPlaceholderText('Note something for your next check-in…')).toBeTruthy()
  })

  it('the note box, once opened, still says notes are private and not part of the record', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: 'Add a note for tomorrow' }))
    expect(await screen.findByText(/Notes are yours alone/)).toBeTruthy()
  })
})
