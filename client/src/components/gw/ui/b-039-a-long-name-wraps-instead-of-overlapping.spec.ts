import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * B-039: AN 80-CHARACTER INVITED NAME OVERLAPPED THE ROW'S OTHER TEXT instead of wrapping or
 * truncating. `.gwui-person-cell`'s text column already has `min-width: 0` so it CAN shrink, and
 * `.gwui-person-email` already has `overflow-wrap: anywhere` for the same reason one column over -
 * but `.gwui-person-name`, the row's own name line, did not, so one long unspaced run (no space
 * long enough to wrap on its own) overflowed its column and sat on top of the row's other cells.
 */
const css = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8')

describe('the people table’s own name line wraps a long name', () => {
  it('.gwui-person-name carries overflow-wrap, the same as .gwui-person-email', () => {
    const rule = css.match(/\.gwui-person-name\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toContain('overflow-wrap: anywhere')
  })
})
