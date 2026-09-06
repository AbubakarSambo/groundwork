/**
 * "Nothing matches that filter" and "there is nothing here" are different facts.
 *
 * An empty table cannot tell them apart, and getting it wrong sends somebody
 * looking for data that was never missing — or worse, reporting to the team
 * that the pipeline is empty when they have Overdue selected.
 *
 * The failure needs no bug to happen: filter a list of four down to none, and
 * the table renders its own "no opportunities open" line, which is a true
 * sentence about a different question.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OpsTable } from './OpsTable'

const columns = [{ head: 'Name', cell: (r: { name: string }) => r.name }]

describe('an empty table', () => {
  it('says the list is empty when it really is', () => {
    render(
      <OpsTable
        rows={[]}
        columns={columns}
        keyOf={(r) => r.name}
        empty="No opportunities open."
      />,
    )
    expect(screen.getByText('No opportunities open.')).toBeTruthy()
  })

  it('but says the filter matched nothing when there are rows behind it', () => {
    render(
      <OpsTable
        rows={[]}
        columns={columns}
        keyOf={(r) => r.name}
        filteredOutOf={4}
        empty="No opportunities open."
      />,
    )
    expect(screen.queryByText('No opportunities open.')).toBeNull()
    expect(screen.getByText(/None of the 4 here match that/)).toBeTruthy()
  })

  it('and tells them how to get back, because a dead end needs an exit', () => {
    render(
      <OpsTable rows={[]} columns={columns} keyOf={(r) => r.name} filteredOutOf={4} empty="none" />,
    )
    expect(screen.getByText(/Try All/)).toBeTruthy()
  })

  it('and says nothing at all when there are rows to show', () => {
    render(
      <OpsTable
        rows={[{ name: 'Meridian Care' }]}
        columns={columns}
        keyOf={(r) => r.name}
        filteredOutOf={4}
        empty="No opportunities open."
      />,
    )
    expect(screen.getByText('Meridian Care')).toBeTruthy()
    expect(screen.queryByText(/match that/)).toBeNull()
  })
})
