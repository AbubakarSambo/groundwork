import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { InvitePage } from './InvitePage'
import { participantsApi } from '@/api'

/**
 * ONE-PATH guard (design decision): participants go through the REAL
 * conversation engine, never the entry pipeline. Accepting the invite signs
 * them in and lands them directly in /checkin/:id on the initiator's ground
 * (the existing session-1 check-in row - no second row, no navigation).
 * The old inline invite-page chat (participantApi.chat) and its solo entry
 * report (entryApi.report / "not cross-referenced with any other account
 * yet") are gone from this path. Reintroduce either -> this bites.
 */

const mockedNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockedNavigate }
})
vi.mock('@/api', () => ({ participantsApi: { preview: vi.fn(), accept: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const PREVIEW = {
  groundLabel: 'Groundwork project',
  initiatorName: 'Sarah Okonkwo',
  leadFirstName: 'Sarah',
  scenario: 'NEW_PROJECT',
  roleAsDescribed: null,
  alreadyAccepted: false,
}

function renderInvite() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/invite?token=tkn-1']}>
        <Routes><Route path="/invite" element={<InvitePage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ONE-PATH: invite accept lands in the real engine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(participantsApi.preview as any).mockResolvedValue(PREVIEW)
    ;(participantsApi.accept as any).mockResolvedValue({
      accessToken: 'jwt-1',
      user: { id: 'u-p', email: 'p@x.test' },
      groundId: 'g-1',
      checkInId: 'ci-1',
      existingAccount: false,
    })
  })

  it('accepting routes straight into /checkin/:id on the right ground (seamless handoff)', async () => {
    renderInvite()
    await screen.findByText('Sarah invited you to “Groundwork project”')
    fireEvent.click(screen.getByRole('button', { name: /Answer today’s check-in now/i }))
    await waitFor(() => expect(mockedNavigate).toHaveBeenCalled())
    const [path, opts] = mockedNavigate.mock.calls[0]
    expect(path).toBe('/checkin/ci-1')
    expect(opts?.state?.groundId).toBe('g-1')
    expect(opts?.state?.sessionNumber).toBe(1)
  })

  it('falls back to the check-in participant page when no open check-in exists', async () => {
    ;(participantsApi.accept as any).mockResolvedValue({
      accessToken: 'jwt-1', user: { id: 'u-p', email: 'p@x.test' }, groundId: 'g-1', checkInId: null,
    })
    renderInvite()
    await screen.findByText('Sarah invited you to “Groundwork project”')
    fireEvent.click(screen.getByRole('button', { name: /Answer today’s check-in now/i }))
    await waitFor(() => expect(mockedNavigate).toHaveBeenCalledWith('/grounds/g-1/p', { replace: true }))
  })

  /* U.3: the invitation now reads as the prototype's (join-invite.txt). The old
     top box ("builds the shared report") and footer ("come back any time to add to") are replaced by
     the prototype's box and "About two minutes. You make your account afterwards."
     U.20 fifth review (Hafsah, pictured at 1440px): "What happens to what you write" no longer
     prints in full on the page (it made the page twice the prototype's length, which has none of
     it) - it is a plain link that opens the same four claims in the shared Modal, so this test now
     opens it before checking the words are still there.

     UPDATED 29 September, item 11 conflict A: the callout is now built from the check-in's own
     scenario (`whoCanReadThis`), not a fixed sentence, and the two held sentences ("Nobody else
     reads your answers.", "Wairimu reads the report, not your words.") are dropped for good, not
     just held - they are not true once admins and the people in a check-in can read it (decision 1).
     NEW_PROJECT is not a performance plan, a promotion or a renewal, so the admins sentence is
     included. The old "Nobody you work with reads it" panel said the opposite of decision 1 and is
     replaced by "Who can read what you write", carrying the same true sentence as the callout. */
  it('keeps the privacy panel once, reachable from a link, and says what the prototype says', async () => {
    renderInvite()
    await screen.findByText('Sarah invited you to “Groundwork project”')
    expect(screen.getByText(/The people in this check-in, including your manager, can see what you say in it\. Admins in your organisation can read every check-in\. Your own report and your questions to Ask\s+Groundwork stay private\./)).toBeTruthy()
    expect(screen.queryByText('Nobody you work with reads it')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'What happens to what you write' }))
    expect(screen.getByText('Who can read what you write')).toBeTruthy()
    expect(screen.getAllByText(/Admins in your organisation can read every check-in\./).length).toBe(2)
    expect(screen.queryByText(/Nobody else reads your answers/i)).toBeNull()
    expect(screen.queryByText(/reads the report, not your words/i)).toBeNull()
    expect(screen.getByText('About two minutes. You make your account afterwards.')).toBeTruthy()
  })

  it('the inline entry-pipeline chat is gone (no onboarding cards, no chat input)', async () => {
    renderInvite()
    await screen.findByText('Sarah invited you to “Groundwork project”')
    expect(screen.queryByText(/Type anything to continue/i)).toBeNull()
    expect(screen.queryByPlaceholderText(/Type your/i)).toBeNull()
  })

  it('source-level: InvitePage no longer imports the entry pipeline', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'InvitePage.tsx'), 'utf8')
    expect(src).not.toMatch(/from '@\/api\/entry'/)
    expect(src).not.toMatch(/participantApi\.chat\(/)
    expect(src).not.toMatch(/entryApi\.report\(/)
    expect(src).not.toMatch(/not been cross-referenced with any other account/)
  })
})
