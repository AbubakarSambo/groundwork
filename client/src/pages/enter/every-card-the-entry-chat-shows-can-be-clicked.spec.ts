import { describe, it, expect } from 'vitest'
import { SITUATION_CARDS, whatThisCardSays, groupOf } from './EntryChatPage'
import { SCENARIOS } from '@/pages/grounds/CreateGroundPage'
import { SCENARIO_GROUPS } from '@/lib/scenario-catalog'

/**
 * THE ENTRY CHAT DRAWS THE CATALOGUE'S CARDS AND SENDS ITS OWN SENTENCES, SO THE TWO MUST MEET.
 *
 * The two pickers route differently on purpose: `/grounds/new` sends a scenario KEY and has a
 * Continue button, `/start` sends a SENTENCE that starts the conversation and has no Continue. That
 * is one field the catalogue does not carry, which is why the entry chat keeps a lookup.
 *
 * A LOOKUP IS SAFE AND A SECOND LIST WAS NOT. The entry chat used to hold its own twenty-two cards
 * with their own labels, details and groups, and it fell eight cards behind the other picker without
 * anybody noticing. What is left is a sentence per label - and a card whose sentence is missing is
 * now a card that renders and does nothing when clicked, silently. Hence this.
 */
const OFFERED = SCENARIOS.filter((c) => c.scenario !== 'OPEN_READ')

describe('every card the entry chat shows can be clicked', () => {
  it('found both, or this proves nothing', () => {
    expect(OFFERED.length).toBeGreaterThan(20)
    expect(SITUATION_CARDS.length).toBeGreaterThan(20)
  })

  it('has a sentence to send for every card it renders', () => {
    const mute = OFFERED.filter((c) => !whatThisCardSays(c.label)?.trim()).map((c) => c.label)
    expect(mute).toEqual([])
  })

  it('and every sentence reads as something a person would say about themselves', () => {
    /* It is posted into the conversation as the person's own first message, so a label or a
       fragment would appear in the transcript as though they had typed it. */
    const tooShort = OFFERED.filter((c) => (whatThisCardSays(c.label) ?? '').split(' ').length < 6)
    expect(tooShort.map((c) => c.label)).toEqual([])
  })

  it('files every card in a group the dropdown offers, or it is unreachable', () => {
    /*
     * THE FAILURE THIS PREVENTS. The picker shows one group at a time, chosen from a dropdown, so a
     * card whose group is not in that dropdown renders nowhere at all - no error, no empty state,
     * simply a situation that cannot be picked. That is how PIP was missing from this picker once
     * already.
     */
    const offered = new Set(SCENARIO_GROUPS.filter((g) => g.key !== 'open').map((g) => g.key as string))
    expect(OFFERED.filter((c) => !offered.has(groupOf(c))).map((c) => c.label)).toEqual([])
  })
})
