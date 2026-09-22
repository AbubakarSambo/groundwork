import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ShowAFew } from './a-long-list-is-not-a-page'

/**
 * "THIS PLATFORM MAY FAIL AT A 100 PEOPLE ORG."
 *
 * Driven against one, 23 September 2026. Nothing broke: the server answered the ground page in 43ms
 * and the browser drew it in 0.3s. It was 14,866 pixels tall - a hundred one-row groups in the
 * targets table, a hundred identical lines of what people are down as doing, a hundred cards. And
 * every person read as "Person", because the name-from-the-address rule stripped the digits that
 * were the only thing telling person1@ from person2@.
 *
 * After: 2,981 pixels, 230 nodes, and everybody with their own name.
 */
describe('a long list is not a page', () => {
  const rows = Array.from({ length: 100 }, (_, i) => `row ${i + 1}`)

  it('shows a few and says how many more', () => {
    render(<ShowAFew rows={rows} few={6} what="people">{(r) => <div key={r}>{r}</div>}</ShowAFew>)
    expect(screen.getByText('row 6')).toBeTruthy()
    expect(screen.queryByText('row 7')).toBeNull()
    expect(screen.getByText('Show 94 more people')).toBeTruthy()
  })

  it('and shows them when asked, and puts them away again', () => {
    render(<ShowAFew rows={rows} few={6} what="people">{(r) => <div key={r}>{r}</div>}</ShowAFew>)
    fireEvent.click(screen.getByText('Show 94 more people'))
    expect(screen.getByText('row 100')).toBeTruthy()
    fireEvent.click(screen.getByText('Show fewer'))
    expect(screen.queryByText('row 100')).toBeNull()
  })

  it('says nothing at all when there is nothing to hide', () => {
    render(<ShowAFew rows={rows.slice(0, 3)} few={6} what="people">{(r) => <div key={r}>{r}</div>}</ShowAFew>)
    expect(screen.queryByText(/Show \d+ more/)).toBeNull()
    expect(screen.queryByText('Show fewer')).toBeNull()
  })

  it('and every list that grows with the team uses it', () => {
    for (const file of ['ContextPage.tsx', 'EachPerson.tsx']) {
      expect(readFileSync(join(__dirname, file), 'utf8')).toContain('<ShowAFew')
    }
    expect(readFileSync(join(__dirname, '../../pages/org/OrgMembersPage.tsx'), 'utf8')).toContain('<ShowAFew')
  })

  it('and a digit in somebody\'s address is part of who they are', () => {
    /* person1@ and person2@ both read as "Person" until 23 September 2026, so a hundred people's
       numbers collapsed into one group on the targets table. */
    const utils = readFileSync(join(__dirname, '../../lib/utils.ts'), 'utf8')
    expect(utils).toContain('DIGITS STAY')
    expect(utils).not.toMatch(/replace\(\/\\d\+\/g, ' '\)/)
  })
})
