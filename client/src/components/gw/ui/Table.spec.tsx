import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Table } from './Table'

const columns = [
  { key: 'name', header: 'Trader', rowHeader: true },
  { key: 'sales', header: 'Sales', numeric: true },
  { key: 'step', header: 'Next step' },
]
const rows = [{ name: 'Amina', sales: 'Not said yet', step: 'Not said yet' }]

describe('Table, stacked on a phone', () => {
  it('gives each stacked cell its column name, so "Not said yet" says what is not said', () => {
    const { container } = render(<Table caption="Traders" columns={columns} rows={rows} phone="stack" />)
    /* The row also carries one line that says its gaps once (a-long-table-says-its-shape-and-its-gaps.spec.tsx); it is not a cell of a column. */
    expect(Array.from(container.querySelectorAll('td:not(.gwui-table-gaps)')).map((n) => n.getAttribute('data-label'))).toEqual(['Sales', 'Next step'])
    expect(container.querySelector('th[scope="row"]')?.getAttribute('data-label')).toBeNull()
  })
  it('draws no label where the header is hidden on purpose, or when the table scrolls', () => {
    const a = render(<Table caption="Traders" columns={columns} rows={rows} phone="stack" hideHeader />)
    expect(a.container.querySelector('[data-label]')).toBeNull()
    const b = render(<Table caption="Traders" columns={columns} rows={rows} />)
    expect(b.container.querySelector('[data-label]')).toBeNull()
  })
  it('is drawn by the stylesheet on a phone only, and the name is not a second copy in the text', () => {
    const { container } = render(<Table caption="Traders" columns={columns} rows={rows} phone="stack" />)
    expect(container.querySelectorAll('td')[0].textContent).toBe('Not said yet')
    const css = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8')
    const phone = css.slice(css.indexOf('@media (max-width: 640px) {\n  .gwui-table-wrap'))
    expect(phone).toContain('.gwui-table-stack td[data-label]::before { content: attr(data-label)')
  })
})
