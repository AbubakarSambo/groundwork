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

/** USER JOURNEYS, F-10: the card said "Below is what I wrote down" over two sections that were not her answers. It now says what is true of its first part. */
describe('TheEndCard, what it says where her answers should be', () => {
  const draw = (props: Partial<React.ComponentProps<typeof TheEndCard>>) =>
    render(<TheEndCard engine={null} leadName={null} nextOpens={null} finishing={false} onFinish={() => {}} onChange={() => {}} {...props} />)

  it('while the card is still being written, says so', () => {
    draw({ beingWritten: true })
    expect(screen.getByText('I am still writing down what you said. It takes a few seconds.')).toBeTruthy()
  })
  it('with her answers, shows them as the first part and says nothing else about it', () => {
    draw({ engine: { inYourRecord: [{ says: 'You will chase the payment provider on Friday.', how: 'You said you will do this. I will ask you how it went.' }] } })
    expect(screen.getByText('1. What is now in your record')).toBeTruthy()
    expect(screen.getByText('You will chase the payment provider on Friday.')).toBeTruthy()
    expect(screen.queryByText(/did not find anything|could not show you/)).toBeNull()
  })
  it('with a card that holds nothing, says that in a plain sentence', () => {
    draw({ engine: { inYourRecord: [], next: [] } })
    expect(screen.getByText('I did not find anything in your answers to write down yet. If something is missing, choose “Change something” and tell me.')).toBeTruthy()
  })
  it('with no card at all, says it could not be shown and that finishing writes it', () => {
    draw({ engine: null })
    expect(screen.getByText('I could not show you what I wrote down just now. It is written from your answers when you finish.')).toBeTruthy()
  })
})
