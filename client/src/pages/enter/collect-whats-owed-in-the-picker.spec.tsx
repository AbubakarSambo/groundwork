import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { EverySituation, cardsUnder } from './EverySituation'
import { THE_GROUPS_IN_ORDER } from './the-way-in'
import {
  COLLECT_WHATS_OWED_CARD, COLLECT_WHATS_OWED_GROUP, COLLECT_WHATS_OWED_OPENER, COLLECT_WHATS_OWED_FOR_EXAMPLE, soundsLikeCollectingWhatsOwed,
} from '@/lib/collect-whats-owed'
import { scenarioLabel } from '@/lib/scenario-catalog'

/**
 * "COLLECT WHAT'S OWED" IN THE SCENARIO PICKER (Release 2, pull request 1 of 3). Offered only where the organisation's Release
 * 2 switch is on, as the server says on GET /grounds/situations-offered; everywhere else, every situation reads exactly as it
 * did. The server refuses a new check-in with it where the switch is off, so this is never the guard.
 */
const behindTheSwitch = [{ card: COLLECT_WHATS_OWED_CARD, group: COLLECT_WHATS_OWED_GROUP, forExample: COLLECT_WHATS_OWED_FOR_EXAMPLE }]

function renderList(alsoOffered?: typeof behindTheSwitch) {
  const onStart = vi.fn()
  render(
    <EverySituation
      signedIn
      openerFor={(card) => (card.cardKey === 'COLLECTIONS' ? COLLECT_WHATS_OWED_OPENER : 'An opener.')}
      onSend={vi.fn()}
      onStart={onStart}
      onDescribe={vi.fn()}
      {...(alsoOffered ? { alsoOffered } : {})}
    />,
  )
  return { onStart }
}

describe('with the switch off, the picker stays exactly as it is', () => {
  it('no heading holds a card it did not hold before, and nothing says "Collect what’s owed"', () => {
    for (const g of THE_GROUPS_IN_ORDER) {
      expect(cardsUnder(g.key).map((c) => c.cardKey)).toEqual(cardsUnder(g.key, []).map((c) => c.cardKey))
      expect(cardsUnder(g.key).some((c) => c.scenario === 'COLLECTIONS')).toBe(false)
    }
    renderList()
    expect(screen.queryByText('Collect what’s owed')).toBeNull()
  })
})

describe('with the switch on', () => {
  it('"Collect what’s owed" is the last card under "Keeping a read", with its one line', () => {
    renderList(behindTheSwitch)
    const reading = screen.getByRole('region', { name: 'Keeping a read' })
    const cards = within(reading).getAllByRole('button')
    expect(cards[cards.length - 1].textContent).toBe('Collect what’s owedWhich bills are due, what has been paid with proof, and what is in the way.')
    for (const g of THE_GROUPS_IN_ORDER.filter((x) => x.key !== 'reading')) {
      expect(within(screen.getByRole('region', { name: g.heading })).queryByText('Collect what’s owed')).toBeNull()
    }
  })

  it('picking it shows its examples in full sentences and the sentence it starts with', () => {
    const { onStart } = renderList(behindTheSwitch)
    fireEvent.click(screen.getByRole('button', { name: /Collect what’s owed/ }))
    const panel = screen.getByRole('complementary', { name: 'You picked' })
    expect(within(panel).getByText('Fee notes go out late, and nobody knows which clients have paid.')).toBeTruthy()
    expect(within(panel).getByText('Borrowers repay each week, and you only hear about the ones who stop.')).toBeTruthy()
    expect(within(panel).getByText(`It starts the conversation with: “${COLLECT_WHATS_OWED_OPENER}” You can change every word.`)).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Start with this' }))
    expect(onStart).toHaveBeenCalledWith(COLLECT_WHATS_OWED_CARD, COLLECT_WHATS_OWED_OPENER)
  })

  it('the check-in it makes is named "Collect what’s owed" wherever a scenario is named', () => {
    expect(scenarioLabel('COLLECTIONS')).toBe('Collect what’s owed')
  })
})

describe('the detection words, read on what the lead typed, only where the switch is on', () => {
  it('hears what is owed being collected, and nothing else', () => {
    expect(soundsLikeCollectingWhatsOwed('Follow up the fee notes our clients owe')).toBe(true)
    expect(soundsLikeCollectingWhatsOwed('Our borrowers repay weekly')).toBe(true)
    expect(soundsLikeCollectingWhatsOwed('Track the team’s targets for the quarter')).toBe(false)
    expect(soundsLikeCollectingWhatsOwed('A new hire starts on Monday')).toBe(false)
  })
})
