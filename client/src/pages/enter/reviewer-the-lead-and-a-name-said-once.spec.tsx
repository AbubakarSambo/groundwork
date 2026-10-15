import { describe, it, expect } from 'vitest'
import { notYetAdded, theRows } from './FillsInAsYouTalk'
import { anEntryAsASentence } from './EntryChatPage'

/* Reviewer, 14 October: the setup card read "You mentioned David Mutua and You." and the invite list "Kevin Omondi (Kevin Omondi)." */
describe('as the lead reads her set-up', () => {
  it('the lead herself is never somebody still to add', () => {
    expect(notYetAdded({ mentioned: ['David Mutua', 'You'], added: [] })).toEqual(['David Mutua'])
    const who = theRows({ name: 'Litigation daily', mentioned: ['David Mutua', 'You'], added: [] } as any).find((r) => r.label && r.value?.startsWith('You mentioned'))
    expect(who?.value).toBe('You mentioned David Mutua.')
  })

  it('a name already shown as the address is said once', () => {
    expect(anEntryAsASentence('kevin@kilima.test - Kevin Omondi - He is a member of your sales team.', () => 'Kevin Omondi'))
      .toBe('Kevin Omondi. Groundwork noted “He is a member of your sales team”.')
    expect(anEntryAsASentence('kevin@kilima.test - Kevin Omondi - He is a member of your sales team.'))
      .toBe('kevin@kilima.test (Kevin Omondi). Groundwork noted “He is a member of your sales team”.')
  })
})
