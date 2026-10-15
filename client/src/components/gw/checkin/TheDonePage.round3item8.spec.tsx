import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TheDonePage } from './TheDonePage'
import { groundsApi } from '@/api/grounds'

/**
 * REVIEW ROUND 3, ITEM 8: THE DONE PAGE.
 */
vi.mock('@/api/grounds', () => ({
  groundsApi: { get: vi.fn(), getMyCheckinStatus: vi.fn(async () => ({ checkIns: [] })) },
}))
vi.mock('@/api/conversation', () => ({
  conversationApi: { artifact: vi.fn(async () => ({ artifact: null })) },
}))

const GROUND = {
  participants: [
    { id: 'p-lead', partyType: 'INITIATOR', userId: 'u-lead', user: { firstName: 'Wairimu', lastName: 'Kamau' }, managingOnly: false },
    { id: 'p-me', partyType: 'PARTICIPANT', userId: 'u-me', managingOnly: false },
  ],
  aTeamReportComes: true,
  viewerIsInitiator: false,
  leadFirstName: 'Wairimu',
  leadAnswersToo: true,
  report: { id: 'r1', releasedAt: '2026-09-20T10:00:01.000Z' },
  checkIns: [{ id: 'ci1', specificityDimensions: { delivery: 'specific', evidence: 'vague', enablement: 'specific', coverage: 'directional', commitment: 'specific' } }],
}

function renderDonePage() {
  ;(groundsApi.get as any).mockResolvedValue(GROUND)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TheDonePage firstName="Aisha" checkInId="ci1" groundId="g1" sessionNumber={2} myUserId="u-me" isInitiator={false} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the Done page', () => {
  it('the team\'s report card carries a "Shared" tag once it has released', async () => {
    renderDonePage()
    expect(await screen.findByText('Shared')).toBeTruthy()
    expect(screen.queryByText('Not shared yet')).toBeNull()
  })

  it('"For tomorrow" (the approved rename of "That\'s saved") is a soft green panel with its own heading inside it', async () => {
    renderDonePage()
    const heading = await screen.findByRole('heading', { name: 'For tomorrow' })
    /* Its own panel, not a Section heading sitting above a separate plain white Panel. The soft green is a class now. */
    const panel = heading.parentElement as HTMLElement
    expect(panel).toHaveClass('gwui-done-tomorrow')
    expect(panel.contains(screen.getByText(/also answers a check-in/))).toBe(true)
    /* Why answering matters folds behind one line inside it (the light prototype's s68). */
    expect(screen.getByText(/also answers a check-in/).closest('details')).toBeTruthy()
  })

  it('the five things read as one short line each, with just the tick or ring visible', async () => {
    renderDonePage()
    await screen.findByText('How checkable today’s check-in was')
    /* The old trailing sentence is gone from what a sighted reader sees (a visible node, outside
       an sr-only span)... */
    const visibleFound = screen.queryAllByText(/Groundwork found this\./).filter(n => !n.closest('.gwui-sr-only'))
    const visibleMissing = screen.queryAllByText(/Groundwork did not pick this up this time\./).filter(n => !n.closest('.gwui-sr-only'))
    expect(visibleFound).toHaveLength(0)
    expect(visibleMissing).toHaveLength(0)
    /* ...but a screen reader still gets the same fact, in a visually-hidden span - the found/missing
       distinction never depends on the ring's colour alone. */
    const srOnly = document.querySelectorAll('.gwui-sr-only')
    const texts = Array.from(srOnly).map(n => n.textContent)
    expect(texts.some(t => t?.includes('Groundwork found this.'))).toBe(true)
  })

  it('the count stays hidden (request 45)', async () => {
    renderDonePage()
    await screen.findByText('How checkable today’s check-in was')
    expect(screen.queryByText(/of 5/)).toBeNull()
  })
})
