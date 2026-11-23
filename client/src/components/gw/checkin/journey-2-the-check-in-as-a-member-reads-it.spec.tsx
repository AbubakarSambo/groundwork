import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TheEndCard } from './TheEndCard'
import { TheCheckInHeader } from './TheCheckInHeader'
import { ConversationCard } from '@/components/gw/ui/ConversationCard'
import { Bubble } from '@/components/gw/ui/Bubble'
import { Composer } from '@/components/gw/ui/Composer'
import { InTheDesignSystem } from '@/components/gw/ui/the-design-system'

/**
 * JOURNEY 2, A MEMBER'S FIRST CHECK-IN, AS SHE READS IT (Hafsah, 23 November 2026; docs/prototype/screens/B3-the-check-in).
 *
 * The conversation is drawn from the design system's blocks: the way back above one card, the card's title with Pause on the
 * right, the bubbles, and the box to type in with "+", the field and send. The end card is what was written down, each line with
 * "That's not right" on its right, what happens next, and one main button. These read the words a person sees and count the
 * buttons she can press, not the classes alone.
 */
const inTheDesignSystem = (ui: React.ReactNode) => render(<InTheDesignSystem.Provider value={true}>{ui}</InTheDesignSystem.Provider>)

describe('the conversation, as check-in-start.jpg draws it', () => {
  it('has the way back above the card, the title and Pause in the card, the bubbles, and the box with +, the field and send', () => {
    const back = vi.fn()
    inTheDesignSystem(
      <ConversationCard
        back={<button type="button" onClick={back}>← Sales team, Q4</button>}
        header={<TheCheckInHeader title="Your check-in" onEnd={() => {}} endLabel="Pause" />}
        footer={<Composer value="" onChange={() => {}} onSend={() => {}} onPlus={() => {}} sendLabel="Send message" />}
      >
        <Bubble mine={false}>Which customers have you been working with since our last check-in?</Bubble>
        <Bubble mine>I visited three shops this week.</Bubble>
      </ConversationCard>,
    )
    expect(screen.getByRole('button', { name: '← Sales team, Q4' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Your check-in' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveClass('ds-btn-link')
    expect(screen.getByText('I visited three shops this week.')).toHaveClass('ds-bub-me')
    expect(screen.getByText(/Which customers/)).toHaveClass('ds-bub-them')
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveAttribute('placeholder', 'Type your answer')
    expect(screen.getByRole('button', { name: 'Add a photo, a document or some text' })).toHaveClass('ds-btn-second')
    expect(screen.getByRole('button', { name: 'Send message' })).toHaveClass('ds-btn-main')
  })

  it('says "That’s everything for today" under the title once the conversation has closed', () => {
    inTheDesignSystem(<TheCheckInHeader title="Your check-in" underTitle="That’s everything for today" />)
    expect(screen.getByText('That’s everything for today')).toHaveClass('ds-text-meta')
  })
})

describe('the end card, as check-in-end-card.jpg draws it', () => {
  const card = () => inTheDesignSystem(
    <TheEndCard
      engine={{
        inYourRecord: [
          { says: 'Mama Njeri signed an order for 40 cartons on Tuesday.', how: 'You gave this from memory. Nothing written backs it yet.', mark: 'said' },
          { says: 'I will visit Duka Bora again on Thursday with the price list.', how: 'You said you will do this. I will ask you how it went.', mark: 'promise' },
        ],
        next: ['If you have something written for any of these, such as a message or a photo, add it. Then that line counts as proven.'],
      }}
      nextOpens="Your next check-in opens on Monday 30 November at 8am."
      finishing={false}
      onFinish={() => {}}
      onChange={() => {}}
    />,
  )

  it('reads what goes in the record, line by line, each with where it comes from and a way to say it is wrong', () => {
    card()
    expect(screen.getByRole('heading', { name: 'What goes in your record' })).toBeTruthy()
    const rows = screen.getAllByRole('listitem').filter((li) => li.classList.contains('ds-row'))
    expect(rows.map((r) => r.textContent)).toEqual([
      'Mama Njeri signed an order for 40 cartons on Tuesday.You gave this from memory. Nothing written backs it yet.That’s not right',
      'I will visit Duka Bora again on Thursday with the price list.You said you will do this. I will ask you how it went.That’s not right',
    ])
    /* Rule 9: the row's action is a link on its right, never a button on every row. */
    for (const r of rows) expect(within(r).getByRole('button', { name: 'That’s not right' })).toHaveClass('ds-btn-link')
  })

  it('says when the next one opens as one line, what happens next as a short list, then one main button', () => {
    card()
    expect(screen.getByText('Your next check-in opens on Monday 30 November at 8am.').tagName).toBe('P')
    expect(screen.getByRole('heading', { name: 'What happens next' })).toBeTruthy()
    expect(screen.getByText(/^If you have something written/).tagName).toBe('LI')
    const main = screen.getAllByRole('button').filter((b) => b.classList.contains('ds-btn-main'))
    expect(main.map((b) => b.textContent)).toEqual(['That’s right, finish'])
  })
})
