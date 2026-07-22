import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'
import { useEntryStore } from '@/stores/entry'
import { authApi } from '@/api/auth'

/**
 * Ground-name guard: the ground name set on the setup screen (after email
 * is sent) updated the server draft via PATCH but NOT the local commit body
 * (gw_commit_payload), and the server overlay lets a non-empty body field
 * override the fresher draft - so the stale body label "My first ground"
 * won at commit and every participant surface showed it. The post-email
 * sync now mirrors the label into gw_commit_payload. Revert -> the commit
 * body keeps the stale "My first ground" -> this bites.
 */

vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn().mockResolvedValue({ draftToken: 'd-token' }) } }))
vi.mock('@/api/entry', () => ({
  entryApi: {
    opener: vi.fn().mockResolvedValue({ reply: '' }),
    chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn(),
    patchDraft: vi.fn().mockResolvedValue({ ok: true }),
  },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}><EntryChatPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GROUND-NAME: setup-screen rename reaches the commit body', () => {
  beforeEach(() => {
    localStorage.clear()
    // a finished, closed session so the save card renders
    localStorage.setItem('gw_entry_session', JSON.stringify({
      scenario: 'NEW_PROJECT', closed: true, onboardingStep: 7,
      history: [{ role: 'assistant', content: 'hi' }, { role: 'user', content: 'ship it' }],
      report: JSON.stringify({ alignmentStatus: 'Clear', whatGroundworkSaw: 'x', alignmentBasis: '', areasRequiringAlignment: [], alignmentReached: [], honestClose: { aligned: '', open: '', revisit: '', risk: '' }, mentionedPeople: [], suggestedParties: [] }),
      onboardingSelections: { mode: 'new', initial: 'New project' },
    }))
    // stale commit body captured at entry-save, before the rename
    localStorage.setItem('gw_commit_payload', JSON.stringify({ groundLabel: 'My first ground', history: [], contributors: [] }))
  })

  it('mirrors the renamed ground label into gw_commit_payload after email is sent', async () => {
    renderPage()
    // send the email -> emailSent + draftToken
    const emailInput = await screen.findByPlaceholderText('your@email.com')
    fireEvent.change(emailInput, { target: { value: 'me@example-test.invalid' } })
    fireEvent.keyDown(emailInput, { key: 'Enter' })
    await waitFor(() => expect(authApi.entrySave).toHaveBeenCalled())
    // rename on the setup screen
    useEntryStore.setState({ groundName: 'Groundwork project' })
    // the sync effect is debounced ~800ms
    await waitFor(() => {
      const body = JSON.parse(localStorage.getItem('gw_commit_payload') || '{}')
      expect(body.groundLabel).toBe('Groundwork project')
    }, { timeout: 2500 })
  })
})
