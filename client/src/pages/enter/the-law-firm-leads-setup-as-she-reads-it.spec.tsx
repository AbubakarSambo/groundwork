import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FillsInAsYouTalk, type WhatSetupKnows } from './FillsInAsYouTalk'
import { withTheNamedAdded, aLineFor } from '@/components/gw/TheTeamBox'

vi.mock('@/api/entry', () => ({ entryApi: { peopleOnLines: vi.fn() } }))

/*
 * PLAN ROUND 32, THE LAW FIRM LEAD, AS SHE READS IT. The card under setup's first reply gave her no way to accept it, so she pressed
 * "It’s something else" and lost the conversation; and after she gave her team's emails in the chat the panel still said "Add their
 * emails here when you have them".
 */
/* Was "the card under the first reply": the kind of check-in is said in the summary now, not on a card in the conversation (Hafsah,
   3 November evening). Confirming it is answering the reply's own question in words; "It’s something else" is beside the kind. */
describe('the kind of check-in, in the summary', () => {
  const known: WhatSetupKnows = {
    name: '', situation: 'Keep a read on live work', meaning: 'What moved, what’s stuck and what changed, every week.', cadence: 'WEEKLY', cadenceChosen: false,
    workingDays: [], startsOn: '', endsOn: '', mentioned: [], added: [],
  }
  it('names the kind and what it means, and offers It’s something else, with no Confirmed button and no card', () => {
    const onSomethingElse = vi.fn()
    const { container } = render(<FillsInAsYouTalk {...known} onSomethingElse={onSomethingElse} />)
    expect(container.textContent).toContain('Keep a read on live work')
    expect(container.textContent).toContain('What moved, what’s stuck and what changed, every week.')
    expect(container.textContent).not.toMatch(/This sounds like|of 4 set|[✓○]/)
    expect(screen.queryByRole('button', { name: 'Confirmed' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'It’s something else' }))
    expect(onSomethingElse).toHaveBeenCalled()
  })

  it('on a phone is one line, "2 people · Keep a read on live work", that opens to the same summary', () => {
    const { container } = render(<FillsInAsYouTalk {...known} people={['Faith Wairimu, faith@kamau.test', 'Peter Mutua, peter@kamau.test']} asOneLine />)
    expect(container.querySelector('summary')?.textContent).toBe('2 people · Keep a read on live work')
    expect(container.textContent).toContain('Faith Wairimu, faith@kamau.test')
  })
})

describe('the panel, after the team is given in the chat', () => {
  const nothingYet: WhatSetupKnows = {
    name: '', situation: '', cadence: 'WEEKLY', cadenceChosen: true, workingDays: [], startsOn: '', endsOn: '', mentioned: [], added: [],
  }
  const asThePageReadsIt = (text: string) => {
    const lines = text.split('\n').filter(Boolean)
    return { people: lines.filter((l) => l.includes('@')), noEmailYet: lines.filter((l) => !l.includes('@')).map((l) => l.split(',')[0]) }
  }

  it('says who is in it, with their emails, once the chat has given them', () => {
    const namesFirst = withTheNamedAdded('', ['Brian Otieno', 'Aisha Mohamed', 'David Kiprop'].map((name) => aLineFor({ name })))
    const first = render(<FillsInAsYouTalk {...nothingYet} {...asThePageReadsIt(namesFirst)} />)
    expect(first.container.textContent).toContain('Add their emails here when you have them.')
    first.unmount()

    const withEmails = withTheNamedAdded(namesFirst, [
      aLineFor({ name: 'Brian Otieno', email: 'brian@kamau-advocates.test', phone: '+254711400102' }),
      aLineFor({ name: 'Aisha Mohamed', email: 'aisha@kamau-advocates.test', phone: '+254711400103' }),
      aLineFor({ name: 'David Kiprop', email: 'david@kamau-advocates.test', phone: '+254711400104' }),
    ])
    const { container } = render(<FillsInAsYouTalk {...nothingYet} {...asThePageReadsIt(withEmails)} />)
    expect(container.textContent).not.toContain('Add their emails')
    expect(container.textContent).toContain('3 people')
    expect(container.textContent).toContain('Brian Otieno, brian@kamau-advocates.test, +254711400102')
  })

  it('never writes over a line the lead typed herself', () => {
    expect(withTheNamedAdded('Brian Otieno, brian@other.test', ['Brian Otieno, brian@kamau-advocates.test'])).toBe('Brian Otieno, brian@other.test')
  })
})
