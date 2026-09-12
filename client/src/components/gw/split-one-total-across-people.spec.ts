import { describe, it, expect } from 'vitest'
import { rowsFromPaste } from './split-one-total-across-people'

describe('what somebody actually pastes', () => {
  it('reads a CSV export', () => {
    expect(rowsFromPaste('Name, Closed, Months\nMusa, 31, 48')).toEqual([
      ['Name', 'Closed', 'Months'], ['Musa', '31', '48'],
    ])
  })

  it('reads a spreadsheet copy, which arrives tab separated', () => {
    /* Selecting cells in Excel or Sheets and pressing copy gives tabs, and that is at least as
       likely as a saved file. */
    expect(rowsFromPaste('Name\tClosed\nMusa\t31')).toEqual([['Name', 'Closed'], ['Musa', '31']])
  })

  it('strips the quotes a CSV puts round a cell', () => {
    expect(rowsFromPaste('"Sales Rep","Units Closed"\n"Musa","31"')[1]).toEqual(['Musa', '31'])
  })

  it('drops blank lines rather than reading them as people', () => {
    expect(rowsFromPaste('Name,Closed\n\nMusa,31\n\n')).toHaveLength(2)
  })

  it('reads nothing out of nothing', () => {
    expect(rowsFromPaste('')).toEqual([])
    expect(rowsFromPaste('   \n  ')).toEqual([])
  })
})
