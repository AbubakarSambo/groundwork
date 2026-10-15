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
    const item = screen.getByText('A line of what happens next.')
    const list = item.closest('ul')
    expect(list).toBeTruthy()
    expect(list).toHaveClass('gwui-ci-endcard-next')
  })

  /* sales-first.md, section 5: when the next one opens is one line above the fold, said once, not a bullet inside it. */
  it('says when the next check-in opens as one line, outside the fold, once', () => {
    render(
      <TheEndCard
        engine={{ inYourRecord: [{ says: 'Green Mart has a quote.', how: 'You said this. A photo of the quote would prove it.', mark: 'said' }], next: [] }}
        leadName="Wairimu"
        nextOpens="Your next check-in opens tomorrow at 8am."
        finishing={false}
        onFinish={() => {}}
        onChange={() => {}}
      />
    )
    const line = screen.getByText('Your next check-in opens tomorrow at 8am.')
    expect(line.closest('ul')).toBeNull()
    expect(line.closest('details')).toBeNull()
    expect(screen.getAllByText('Your next check-in opens tomorrow at 8am.')).toHaveLength(1)
    expect(screen.getByText('Why answering matters, and what happens next').closest('summary')).toBeTruthy()
    expect(screen.getByText(/Wairimu also answers a check-in/).closest('details')).toBeTruthy()
    expect(screen.queryByText(/^\d\. /)).toBeNull()
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
    /* The approved rename (sales-first.md), with no number. */
    expect(screen.getByText('What goes in your record')).toBeTruthy()
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
