import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EveryTicketAndWhatShowsIt } from './TheTicketsBoard'

/**
 * THE TICKETS FAMILY'S ONE TABLE (support.jpg, ops.jpg, eng.jpg), as the lead reads it. A row for every ticket, incident or task, the
 * details of each kind read from what the person said, "Not said yet" where nobody has, a bar for the count and for a task's stage,
 * and a dot or a bar filled only where a document backs the line.
 */
const draw = (kind: string, section: any, me: string | null = null) =>
  render(<MemoryRouter><EveryTicketAndWhatShowsIt section={section} kindOfWork={kind} groundId="g-1" me={me} /></MemoryRouter>)

describe('support tickets', () => {
  const section = { section: 'Deal grid', rows: [
    { id: 't1', kind: 'ticket', name: '#4812, Double charge after a plan change', stage: 'Waiting on engineering', owner: 'Grace Wambui', ownerParticipantId: 'p1', mark: 'said', saidBy: 'Grace Wambui', fields: { Queue: 'Billing', Cause: 'Billing bug after a plan change', 'Seen before': '9 tickets this week', 'Next step': 'Refund manually while the fix waits' } },
    { id: 't2', kind: 'ticket', name: '#4790, Password reset loop', owner: 'Tom Otieno', ownerParticipantId: 'p2', mark: 'proven', fields: {} },
  ] }
  it('has one row for each ticket, with the queue under the agent and the cause as said', () => {
    draw('support desk', section)
    expect(screen.getByRole('heading', { name: 'Every ticket, and what shows it' })).toBeTruthy()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows).toHaveLength(3)
    const first = rows[1].textContent ?? ''
    for (const t of ['#4812, Double charge after a plan change', 'Grace', 'Billing', 'Waiting on engineering', 'Billing bug after a plan change', '9 tickets this week', 'Grace said it', 'Refund manually while the fix waits']) expect(first).toContain(t)
  })
  it('says what nobody has said, and fills the dot only for the ticket a document backs', () => {
    const { container } = draw('support desk', section)
    const second = within(screen.getByRole('table')).getAllByRole('row')[2].textContent ?? ''
    expect(second).toContain('Not said yet')
    expect(second).toContain('A document backs it')
    expect(container.querySelectorAll('.gwui-table-dot-on')).toHaveLength(1)
  })
  it('draws the count as one bar, filled for what a document backs, with no sentence repeating it', () => {
    const { container } = draw('support desk', section)
    expect(screen.queryByText('2 tickets on record. 1 has a document behind it.')).toBeNull()
    const bar = screen.getByRole('img', { name: '2 tickets, 1 shown by a document' })
    expect((bar.querySelector('.pb-bar-done') as HTMLElement).style.width).toBe('50%')
    expect(container.querySelector('details')).toBeNull()
  })
})

describe('where a ticket stands, for a kind with no stages', () => {
  it('is what the person said about where it stands, in the table, with no row of chips repeating it', () => {
    draw('support desk', { rows: [{ id: 't', kind: 'ticket', name: '#4801, API timeout', owner: 'Otieno Ouma', ownerParticipantId: 'p', mark: 'said', fields: { 'Where it stands': 'Passed to engineering' } }] })
    expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toContain('Passed to engineering')
    expect(screen.queryByText('Passed to engineering 1')).toBeNull()
  })
})

describe('incidents', () => {
  it('shows the site, impact, cause, fix and prevention as said', () => {
    draw('distribution operations', { rows: [{ id: 'i1', kind: 'incident', name: 'Forklift 3 stopped', owner: 'Fatuma Said', ownerParticipantId: 'p1', mark: 'said', fields: { Site: 'Mombasa', Impact: '2.5h down; 14 orders late', Fix: 'Topped up fluid', Prevention: 'Replace seals' } }] }, 'p1')
    const row = within(screen.getByRole('table')).getAllByRole('row')[1].textContent ?? ''
    for (const t of ['You', 'Mombasa', '2.5h down; 14 orders late', 'Topped up fluid', 'Replace seals']) expect(row).toContain(t)
    expect(row).toContain('Not said yet')
  })
})

describe('engineering tasks', () => {
  const section = { stages: ['Worked on', 'Written', 'Merged', 'Tested', 'Deployed', 'Used'], rows: [
    { id: 'k1', kind: 'task', name: 'Payment integration', stage: 'Tested', owner: 'Aisha Bello', ownerParticipantId: 'p1', mark: 'said', fields: { Done: '60% done', Change: 'Callback fix' } },
    { id: 'k2', kind: 'task', name: 'Login fix', stage: 'Tested', owner: 'Miriam Njeri', ownerParticipantId: 'p2', mark: 'proven', fields: {} },
  ] }
  it('draws a stage bar for each task, filled only where a document backs it, and a ringed bar for a percent somebody said', () => {
    const { container } = draw('engineering release', section)
    /* The stage bars only: a percent somebody said is now drawn with the same bar, and is read below. */
    const bars = [...container.querySelectorAll('.pb-hbar[aria-label*=", stage "]')] as HTMLElement[]
    expect(bars).toHaveLength(2)
    expect(bars[0].querySelector('.pb-in')).toBeNull()
    expect(bars[1].querySelector('.pb-in')).not.toBeNull()
    expect(parseFloat((bars[0].querySelector('.pb-out') as HTMLElement).style.width)).toBeCloseTo(66.67, 1)
    const pct = screen.getByRole('img', { name: 'Done, 60 of 100, said and not shown by a document' })
    /* Drawn as the stage bar's ring, since the track form's ring could not be seen in a table cell: ringed to 60%, nothing filled. */
    expect((pct.querySelector('.pb-out') as HTMLElement).style.width).toBe('60%')
    expect(pct.querySelector('.pb-in')).toBeNull()
  })
  it('has no row of stage chips: each task’s stage is in the table', () => {
    draw('engineering release', section)
    expect(screen.queryByText('Tested 2')).toBeNull()
  })
})

it('draws nothing for a kind that is not in the family, or for no records', () => {
  const { container } = draw('sales team', { rows: [{ id: 'x', kind: 'deal', name: 'A deal' }] })
  expect(container.textContent).toBe('')
  const again = draw('support desk', { rows: [] })
  expect(again.container.textContent).toBe('')
})
