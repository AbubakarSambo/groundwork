import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/*
 * "GET UPDATES FROM YOUR TEAM", AS THE LEAD READS IT AND AS IT IS SENT (U.6 review).
 *
 * Rendered, filled in the way a lead fills it in, and pressed. What reaches the API is what the lead
 * later reads on the check-in's header and in the rail.
 */
const commit = vi.fn().mockResolvedValue({ groundId: 'g1' })
const entrySave = vi.fn().mockResolvedValue({})
vi.mock('@/api/entry', () => ({ entryApi: { commit: (...a: unknown[]) => commit(...a) } }))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: (...a: unknown[]) => entrySave(...a) } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let who: { isAuthenticated: boolean; user: { email: string } | null } = { isAuthenticated: true, user: { email: 'amara@acme.com' } }
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel(who) }))

async function openIt() {
  const { default: AskYourTeamOneThing } = await import('./AskYourTeamOneThing')
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><AskYourTeamOneThing /></MemoryRouter>
    </QueryClientProvider>,
  )
}

function fillIn(question: string) {
  fireEvent.change(document.getElementById('team-emails')!, { target: { value: 'tunde@acme.com, bisi@acme.com' } })
  fireEvent.change(document.getElementById('the-one-line')!, { target: { value: question } })
}

describe('the name the check-in is given', () => {
  beforeEach(() => { commit.mockClear(); who = { isAuthenticated: true, user: { email: 'amara@acme.com' } } })

  /* Read live: "What moved this week, and what is stuck?" was named "What moved this week, and what". */
  it('is the whole question the lead wrote, not its first few words', async () => {
    await openIt()
    fillIn('What moved this week, and what is stuck?')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(commit).toHaveBeenCalled())
    expect(commit.mock.calls[0][0].groundLabel).toBe('What moved this week, and what is stuck?')
  })

  it('is the topic when the question is too long to be a name', async () => {
    await openIt()
    fillIn('What did you finish this week, what is still open, what is blocking you, and who could help you with it?')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(commit).toHaveBeenCalled())
    expect(commit.mock.calls[0][0].groundLabel).toBe('Get updates from your team')
  })
})
