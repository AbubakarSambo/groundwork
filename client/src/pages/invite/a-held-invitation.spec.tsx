import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitePage } from './InvitePage'

/**
 * A GUEST HELD FOR A SEAT OPENS THEIR INVITATION (U.4 third review). The page showed the whole
 * invitation and only refused after "Answer today's check-in now". It now opens on the refusal, with
 * no invitation, no answer button and no "You make your account afterwards".
 *
 * U.20 fifth review (Hafsah, pictured at 1440px): the server's one sentence used to be the whole
 * heading, two sentences long. `heldForASeatCard` (InvitePage.tsx) splits it into a short heading
 * and the sentence under it, the prototype's own two-line pattern - same meaning, full sentences.
 */
const participantsApi = vi.hoisted(() => ({ preview: vi.fn(), accept: vi.fn(), freshLink: vi.fn() }))
vi.mock('@/api', () => ({ participantsApi }))
vi.mock('@/api/participants', () => ({ participantsApi }))
vi.mock('@/stores/auth', () => ({ useAuthStore: (sel: any) => sel({ setAuth: vi.fn() }) }))

const SAYING = 'This check-in cannot start for you yet, because there is no seat for you on the plan. You will get your invitation as soon as there is one.'

beforeEach(() => { vi.clearAllMocks() })

describe('a held invitation', () => {
  it('opens straight on the refusal, and offers nothing to press', async () => {
    ;(participantsApi.preview as any).mockResolvedValue({ heldForASeat: true, saying: SAYING })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/invite?token=tok']}>
          <Routes><Route path="/invite" element={<InvitePage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'This check-in cannot start for you yet' })).toBeTruthy()
    expect(screen.getByText('There is no seat for you on the plan yet. You will get your invitation as soon as there is one.')).toBeTruthy()
    expect(container.textContent).not.toMatch(/invited you|Your part in this|You make your account afterwards|About two minutes/)
    expect(screen.queryByRole('button')).toBeNull()
    expect(participantsApi.accept).not.toHaveBeenCalled()
  })
})
