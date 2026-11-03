import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThisSoundsLike } from './ThisSoundsLike'
import { FillsInAsYouTalk, type WhatSetupKnows } from './FillsInAsYouTalk'
import { withTheNamedAdded, aLineFor } from '@/components/gw/TheTeamBox'

vi.mock('@/api/entry', () => ({ entryApi: { peopleOnLines: vi.fn() } }))

/*
 * PLAN ROUND 32, THE LAW FIRM LEAD, AS SHE READS IT. The card under setup's first reply gave her no way to accept it, so she pressed
 * "It’s something else" and lost the conversation; and after she gave her team's emails in the chat the panel still said "Add their
 * emails here when you have them".
 */
describe('the card under the first reply', () => {
  it('offers Confirmed and It’s something else, whatever has been said since', () => {
    const onConfirm = vi.fn()
    const { container } = render(<ThisSoundsLike scenario="KEEP_READ" confirmed={false} onConfirm={onConfirm} onSomethingElse={() => {}} />)
    expect(container.textContent).toMatch(/^This sounds like/)
    expect(screen.getByRole('button', { name: 'Confirmed' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'It’s something else' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmed' }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('once confirmed, keeps what it says and no buttons', () => {
    render(<ThisSoundsLike scenario="KEEP_READ" confirmed onConfirm={() => {}} onSomethingElse={() => {}} />)
    expect(screen.getByText('This sounds like')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
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
