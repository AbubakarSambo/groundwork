import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EntryChatPage } from './EntryChatPage'

/**
 * "WHAT IS IT?" HAD A PLACEHOLDER AND NO ACCESSIBLE NAME (U.8 review, found on the way).
 *
 * A placeholder is not a label: it disappears the instant somebody types, and screen readers do
 * not reliably announce it as the field's name to begin with. The onboarding chat's "+ Doc" panel
 * asked "What is this? e.g. the onboarding guide I shared" only as a placeholder, so a screen-reader
 * user reached an unlabelled text box. Given `aria-label="What is it?"`, matching the equivalent
 * field on the check-in composer's own Paste text panel (ChatPage.tsx), which already has a real
 * <label>.
 */

vi.mock('@/api/entry', () => ({
  entryApi: { opener: vi.fn().mockResolvedValue({ reply: '' }), chat: vi.fn(), report: vi.fn(), onboard: vi.fn(), classifyIntent: vi.fn() },
}))
vi.mock('@/api/auth', () => ({ authApi: { entrySave: vi.fn() } }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ user: null, isAuthenticated: false }) }))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('gw_entry_session', JSON.stringify({
    scenario: '',
    history: [],
    closed: false,
    onboardingStep: 1,
    onboardingSelections: { mode: 'new', initial: 'We are starting a new project' },
    onboardingHistory: [
      { role: 'assistant', content: 'What brings you here?' },
      { role: 'user', content: 'We are starting a new project.' },
      { role: 'assistant', content: 'Got it. Who is on the team with you?' },
    ],
  }))
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/start']}>
        <EntryChatPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the "What is it?" field in the onboarding chat\'s document panel', () => {
  it('has an accessible name, not only a placeholder', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /Add a document \(paste or upload\)/ }))
    expect(screen.getByRole('textbox', { name: 'What is it?' })).toBeTruthy()
  })
})
