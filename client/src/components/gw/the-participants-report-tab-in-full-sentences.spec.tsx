import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { SharedReportForAParty } from './SharedReportForAParty'
import { WhatYouAreCarryingForward } from './WhatYouAreCarryingForward'

/**
 * U.9 REVIEW FIX 13: THE PARTICIPANT'S REPORT TAB, IN FULL SENTENCES.
 *
 * "Your sessions · 1 / each one has its own report", "Session 1 / Finished 27 Sept 2026 · specific
 * in places" and "The shared picture / the written report, everyone's" each joined two facts with
 * a dot rather than saying them as sentences. Also fixed: "Amani Wekesa · amani.u8@example.test" in
 * the share-confirmation list put an email address on screen for its own sake.
 */
vi.mock('@/api/grounds', () => ({ groundsApi: { setMySoloReportShared: vi.fn() } }))

function renderReportTab(props: Partial<React.ComponentProps<typeof SharedReportForAParty>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SharedReportForAParty
          groundId="g1"
          report={{ releasedAt: '2026-09-27T10:00:00.000Z' }}
          ground={{
            boardRenders: false,
            checkIns: [{ id: 'c1', sessionNumber: 1, status: 'COMPLETED', completedAt: '2026-09-27T10:00:00.000Z', participantId: 'p2' }],
            participants: [{ id: 'p2', userId: 'u-miriam' }],
          }}
          onOpenBoard={() => {}}
          /*
           * U.9 THIRD REVIEW, ITEM 6: A LEVEL STRING, NOT A RAW SCORE. `specificityBySession` used
           * to carry a continuous 0-1 figure from a different field than the one the session's own
           * meter reads, which could disagree with it for the same session - see
           * how-checkable-was-that-session.ts. It now carries the same `specificityLevel` the
           * meter reads; 'directional' is the same band the old 0.5 score fell into.
           */
          specificityBySession={{ 1: 'directional' }}
          viewerUserId="u-miriam"
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the participant’s "Your sessions" list reads as sentences', () => {
  it('says how many sessions, and each row as its own sentences, not dot-joined fragments', () => {
    renderReportTab()
    expect(screen.getByText('Your sessions')).toBeTruthy()
    expect(screen.getByText('You have one finished session, with its own report.')).toBeTruthy()
    expect(screen.getByText('Session 1')).toBeTruthy()
    expect(screen.getByText('You checked in on 27 Sept 2026.')).toBeTruthy()
    expect(screen.getByText('What you said was specific in places.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Finished 27 Sept 2026 · /)
    expect(document.body.textContent).not.toContain('Your sessions · 1')
  })
})

describe('the share-confirmation list never shows an email address', () => {
  it('names who will read it, without their address stitched on with a dot', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <WhatYouAreCarryingForward
          groundId="g1"
          mySoloReport={{ report: { summary: 'x' }, shared: false }}
          refetchSoloReport={() => {}}
          otherParties={[{ id: 'p3', name: 'Amani Wekesa', email: 'amani.u8@example.test' }]}
        />
      </QueryClientProvider>,
    )
    fireEvent.click(screen.getByText('Share with everyone'))
    expect(screen.getByText('Amani Wekesa')).toBeTruthy()
    expect(screen.queryByText(/amani\.u8@example\.test/)).toBeNull()
  })
})
