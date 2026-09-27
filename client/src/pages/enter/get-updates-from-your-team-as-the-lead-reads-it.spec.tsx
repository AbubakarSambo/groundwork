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

describe('your email', () => {
  beforeEach(() => { commit.mockClear(); entrySave.mockClear() })

  /*
   * Read live, signed in: the box showed the lead's address, "Send" stayed greyed with "Add your own
   * email, so the report has somewhere to go.", and typing it again made two addresses in one box.
   */
  it('signed in, says where the report goes, and Send counts that address without asking for it', async () => {
    who = { isAuthenticated: true, user: { email: 'amara@acme.com' } }
    await openIt()
    expect(document.body.textContent).toContain('The report goes to you at amara@acme.com.')
    expect(screen.queryByPlaceholderText('you@work.com')).toBeNull()
    fillIn('What moved this week, and what is stuck?')
    const send = screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement
    expect(send.disabled).toBe(false)
    expect(document.body.textContent).not.toContain('Add your own email')
    fireEvent.click(send)
    await waitFor(() => expect(commit).toHaveBeenCalled())
  })

  it('signed out, is a box the lead fills in, and Send waits for it', async () => {
    who = { isAuthenticated: false, user: null }
    await openIt()
    fillIn('What moved this week, and what is stuck?')
    const box = screen.getByPlaceholderText('you@work.com') as HTMLInputElement
    expect(box.value).toBe('')
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true)
    expect(document.body.textContent).toContain('Add your own email, so the report has somewhere to go.')
    expect(document.body.textContent).toContain('Where the report goes. You do not have to sign in first. We will email you your way in.')
    /* U.6 review: it read "Adds one line to the invite: we are trying this out…". */
    expect(document.body.textContent).toContain('This adds one sentence to the invite. It reads “We are trying this out to see if this new tool can help us be aligned, and your answers go into one summary that gives us a shared picture.”')
    expect(document.body.textContent).not.toContain('invite:')
    fireEvent.change(box, { target: { value: 'amara@acme.com' } })
    const send = screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement
    expect(send.disabled).toBe(false)
    fireEvent.click(send)
    await waitFor(() => expect(entrySave).toHaveBeenCalled())
    expect(entrySave.mock.calls[0][0]).toBe('amara@acme.com')
  })
})
