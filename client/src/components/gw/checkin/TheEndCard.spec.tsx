import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
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
    /* Changed in F5: "Change something" is gone; when nothing is written, the sentence itself says how to add what is missing. */
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'I did not find anything in your answers to write down yet. If something is missing, tell me.')).toBeTruthy()
    expect(screen.queryByText('Change something')).toBeNull()
  })
  /* F5: "That’s not right" on each line, in place of one "Change something" for the whole card. */
  it('puts “That’s not right” on each line, and pressing it goes back with that line', () => {
    const onChange = vi.fn()
    render(
      <TheEndCard
        engine={{ inYourRecord: [{ says: 'Green Mart has a quote.', how: 'You said this.', mark: 'said' }, { says: 'I will visit Westgate on Friday.', how: 'You said you will do this. I will ask you how it went.', mark: 'said' }] }}
        leadName={null} nextOpens={null} finishing={false} onFinish={() => {}} onChange={onChange}
      />
    )
    const buttons = screen.getAllByRole('button', { name: 'That’s not right' })
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[1])
    expect(onChange).toHaveBeenCalledWith('I will visit Westgate on Friday.')
    expect(screen.queryByText('Change something')).toBeNull()
    expect(screen.getByRole('button', { name: 'That’s right, finish' })).toBeTruthy()
  })
  it('with no card at all, says it could not be shown and that finishing writes it', () => {
    draw({ engine: null })
    /* Changed in F5: the way back to the conversation is in the sentence, since "Change something" is gone. */
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'I could not show you what I wrote down just now. It is written from your answers when you finish. If something is missing, tell me.')).toBeTruthy()
  })
})
