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
    await screen.findByText(/wants to hear your version/i)
    fireEvent.click(screen.getByRole('button', { name: /Add my version/i }))
    await waitFor(() => expect(mockedNavigate).toHaveBeenCalled())
    const [path, opts] = mockedNavigate.mock.calls[0]
    expect(path).toBe('/checkin/ci-1')
    expect(opts?.state?.groundId).toBe('g-1')
    expect(opts?.state?.sessionNumber).toBe(1)
  })

  it('falls back to the ground participant page when no open check-in exists', async () => {
    ;(participantsApi.accept as any).mockResolvedValue({
      accessToken: 'jwt-1', user: { id: 'u-p', email: 'p@x.test' }, groundId: 'g-1', checkInId: null,
    })
    renderInvite()
    await screen.findByText(/wants to hear your version/i)
    fireEvent.click(screen.getByRole('button', { name: /Add my version/i }))
    await waitFor(() => expect(mockedNavigate).toHaveBeenCalledWith('/grounds/g-1/p', { replace: true }))
  })

  it('keeps the privacy assurance and frames sign-in as a benefit, not a toll', async () => {
    renderInvite()
    await screen.findByText(/wants to hear your version/i)
    expect(screen.getByText(/Nobody ever reads what you write/i)).toBeTruthy()
    expect(screen.getByText(/come back any time to add to/i)).toBeTruthy()
    expect(screen.getByText(/see the shared report once everyone has checked in/i)).toBeTruthy()
  })

  it('the inline entry-pipeline chat is gone (no onboarding cards, no chat input)', async () => {
    renderInvite()
    await screen.findByText(/wants to hear your version/i)
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
