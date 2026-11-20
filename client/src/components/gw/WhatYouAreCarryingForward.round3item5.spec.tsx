import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WhatYouAreCarryingForward } from './WhatYouAreCarryingForward'

vi.mock('@/api/grounds', () => ({ groundsApi: { setMySoloReportShared: vi.fn() } }))

/**
 * REVIEW ROUND 3, ITEM 5: "Drop the dark navy 'Summary' card", and "What you shared: Your goal
 * is…" (the engine's colon-opening, stripped the way withoutTheColonOpening already handles it
 * elsewhere).
 */
function mount(report: Record<string, unknown>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WhatYouAreCarryingForward
          groundId="g1"
          mySoloReport={{ report, shared: false }}
          refetchSoloReport={() => {}}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('what you are carrying forward', () => {
  it('is not a dark navy card', () => {
    const { container } = mount({ summary: 'What you shared: You have finished the refund endpoint.' })
    const card = screen.getByText(/finished the refund endpoint/).closest('div')
    // Walk up to the card that carries the background colour.
    let node: HTMLElement | null = card
    let sawDark = false
    while (node) {
      if (node.style.background === 'var(--gw-dark)') sawDark = true
      node = node.parentElement
    }
    expect(sawDark).toBe(false)
    expect(container.querySelector('[style*="var(--gw-dark)"]')).toBeNull()
  })

  it('does not show the engine\'s raw "What you shared:" colon-opening', () => {
    mount({ summary: 'What you shared: You have finished the refund endpoint.' })
    expect(screen.queryByText(/^What you shared:/)).toBeNull()
    expect(screen.getByText(/Here is what you shared\. You have finished the refund endpoint\./)).toBeTruthy()
  })

  /*
   * RE-REVIEW BUG: the heading carried a second, clipped fragment beside it - "the line the next
   * session opens from" - which is not a sentence and repeats what the line underneath the
   * heading already says in full ("From your own check-in only. Only you can see it unless you
   * choose to share it."). Dropped rather than forced into a sentence that would only repeat it.
   */
  it('does not show the clipped fragment beside the heading', () => {
    mount({ summary: 'What you shared: You have finished the refund endpoint.' })
    expect(screen.queryByText('the line the next check-in opens from')).toBeNull()
  })
})
