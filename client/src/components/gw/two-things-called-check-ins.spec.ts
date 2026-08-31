import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE RAIL LISTED CHECK-INS AND THEN OFFERED A LINK CALLED CHECK-INS.
 *
 * "Admin has my check-ins and then where to check in." The top of the rail is a live list of the
 * check-ins somebody is in; the nav item below it said the same word and went to a page of the same
 * thing. The page is not redundant - it holds what the rail does not show - but the name was.
 */
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')

describe('two things are not both called check-ins', () => {
  it('the nav item says which check-ins it means', () => {
    expect(SHELL).toContain("label: 'All check-ins'")
  })

  it('and still goes to the list page, which was never the problem', () => {
    const nav = SHELL.slice(SHELL.indexOf("label: 'All check-ins'"), SHELL.indexOf("label: 'All check-ins'") + 120)
    expect(nav).toContain("to: '/grounds'")
  })

  it('nothing else in the rail is called plain "Check-ins"', () => {
    expect(SHELL).not.toMatch(/label: 'Check-ins'/)
  })
})
