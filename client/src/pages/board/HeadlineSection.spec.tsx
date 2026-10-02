import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeadlineSection } from './TheSwitchboardsSections'

/**
 * BOARD REVIEW, SALES PIECE A, ITEM 2: "WHERE EACH TARGET STANDS" BESIDE THE HEADLINE.
 *
 * board-as-lead.jpg draws the headline question and its answer beside a second panel, "Where each
 * target stands", each target with one word ("Met", "Close", "Behind"...). This checks that heading
 * actually appears on the page once there is a target to say anything about, and that the big
 * serif answer slot shows nothing - never `howItIsGoing.latestSummary` standing in for it - when
 * the engine has not answered the question yet (`headline.answer` is `null`, request 111).
 */
describe('HeadlineSection: "Where each target stands" beside the question', () => {
  it('shows the side panel once a bar is served', () => {
    render(
      <HeadlineSection
        headline={{
          question: 'Will we sign 12 shops for kitchen appliances in Nairobi by 13 December?',
          answer: null,
          bars: [{ objectiveId: 'o1', now: 12, target: 12, filled: 100, word: 'Met' }],
        } as any}
        objectives={[{ id: 'o1', name: 'Sign 12 shops.' } as any]}
      />,
    )
    expect(screen.getByText('Where each target stands')).toBeTruthy()
    expect(screen.getByText('Met')).toBeTruthy()
  })

  it('shows no big answer at all when the engine has not answered yet - never a summary standing in for it', () => {
    render(
      <HeadlineSection
        headline={{
          question: 'Will we sign 12 shops for kitchen appliances in Nairobi by 13 December?',
          answer: null,
          bars: [],
        } as any}
        objectives={[]}
      />,
    )
    expect(screen.getByText('Will we sign 12 shops for kitchen appliances in Nairobi by 13 December?')).toBeTruthy()
    // No answer paragraph, and no side panel with nothing to show in it.
    expect(screen.queryByText('Where each target stands')).toBeNull()
  })

  it('shows the given answer when the engine has one', () => {
    render(
      <HeadlineSection
        headline={{ question: 'Will we reach 25 sales by 30 September?', answer: 'Not yet. 21 are sold.', bars: [] } as any}
        objectives={[]}
      />,
    )
    expect(screen.getByText('Not yet. 21 are sold.')).toBeTruthy()
  })
})
