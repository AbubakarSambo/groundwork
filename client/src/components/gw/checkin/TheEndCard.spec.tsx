import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TheEndCard } from './TheEndCard'

/**
 * THE END CARD, AGAINST check-in-end-card.jpg.
 *
 * GROUP 3 REVIEW, BATCH B: "What happens next" is a real <ul>/<li>, but Tailwind's preflight
 * resets every list to `list-style:none`, so it rendered with no bullet at all - the one visual
 * difference the prototype's own picture shows against ours. `.gwui-ci-endcard-next` now sets
 * `list-style: disc` back.
 */
describe('TheEndCard', () => {
  it('"What happens next" draws as a bulleted list, not plain unmarked lines', () => {
    render(
      <TheEndCard
        engine={{ inYourRecord: [], next: ['A line of what happens next.'] }}
        leadName={null}
        nextOpens="Your next check-in opens tomorrow at 4pm."
        finishing={false}
        onFinish={() => {}}
        onChange={() => {}}
      />
    )
    const item = screen.getByText('Your next check-in opens tomorrow at 4pm.')
    const list = item.closest('ul')
    expect(list).toBeTruthy()
    expect(list).toHaveClass('gwui-ci-endcard-next')
  })
})
