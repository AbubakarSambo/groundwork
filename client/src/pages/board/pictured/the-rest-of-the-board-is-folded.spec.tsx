import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThePicturedBoard } from './ThePicturedBoard'
import { RELEASE_4_ORDERS } from '../release-4-orders'

/**
 * Was: the board's sections start folded under their headings (Hafsah, 24 October 2026). Hafsah ruled on 13 November 2026, after the
 * pilot, that lists of people, deals, targets and deliveries are open tables, so no section of the board starts folded any more. This
 * now proves the opposite: every section's heading is a plain heading, not a button that opens, and the folding code is gone.
 */
describe('the board draws every section open', () => {
  it('has no heading that has to be pressed to read its section', () => {
    const board: any = { kindOfWork: 'support desk', groundId: 'g', heading: { heading: 'Where each target stands' } }
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ThePicturedBoard order={RELEASE_4_ORDERS['support desk']} b={board} groundId="g" sessionRows={[]} renderActions={() => null} overTime={null}
            recommendations={[]} onAnswerRecommendation={() => undefined} recommendationBusy={false} onRecordTheDecision={() => undefined} navigate={() => undefined} />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.queryAllByRole('button', { expanded: false })).toHaveLength(0)
    expect(document.querySelector('.pb-folded')).toBeNull()
  })
  it('keeps no folding rule in the board stylesheet', () => {
    const css = readFileSync(join(__dirname, 'pictured-board.css'), 'utf8')
    expect(css).not.toContain('pb-folded')
    expect(css).not.toContain('pb-fold-the-rest')
  })
})
