/**
 * A toast does not survive a navigation, and this one was raised on a page the admin is navigated
 * away from a moment later. So a list of five people silently became three, and the page they land
 * on said nothing about it.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { rememberWhoWasNotInvited, whoWasNotInvited, thatIsDealtWith, whatToSayAboutThem } from './who-was-not-invited'

const failed = [
  { email: 'ada@acme.test', because: 'Your plan is full at 10 people.' },
  { email: 'sam@acme.test', because: 'This email is already a participant on this check-in' },
]

beforeEach(() => localStorage.clear())

describe('who was not invited', () => {
  it('survives the navigation that loses the toast', () => {
    rememberWhoWasNotInvited('g1', failed)
    expect(whoWasNotInvited('g1')).toEqual(failed)
  })

  it('is kept against one check-in, not globally', () => {
    rememberWhoWasNotInvited('g1', failed)
    expect(whoWasNotInvited('g2')).toEqual([])
  })

  it('keeps the server\'s own reason per person, because a count is the work it was meant to save', () => {
    rememberWhoWasNotInvited('g1', failed)
    expect(whoWasNotInvited('g1')[0].because).toMatch(/plan is full/)
  })

  it('stores nothing when everybody was invited', () => {
    rememberWhoWasNotInvited('g1', [])
    expect(whoWasNotInvited('g1')).toEqual([])
    expect(localStorage.getItem('gw_not_invited_g1')).toBeNull()
  })

  it('is cleared when the admin says they have dealt with it', () => {
    rememberWhoWasNotInvited('g1', failed)
    thatIsDealtWith('g1')
    expect(whoWasNotInvited('g1')).toEqual([])
  })

  it('names people rather than counting them', () => {
    expect(whatToSayAboutThem(failed)).toMatch(/2 people you added were not invited/)
    expect(whatToSayAboutThem([failed[0]])).toMatch(/One person/)
    expect(whatToSayAboutThem(failed)).toMatch(/nothing has been sent to them/)
    expect(whatToSayAboutThem([])).toBe('')
  })

  it('survives a reload, which is what a toast cannot do', () => {
    rememberWhoWasNotInvited('g1', failed)
    /* A fresh read with no in-memory state is exactly what a reload is. */
    expect(whoWasNotInvited('g1')).toHaveLength(2)
  })
})

describe('and both pages are wired to it', () => {
  const read = (rel: string) =>
    fs.readFileSync(path.join(__dirname, rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('the wizard writes it down as well as toasting', () => {
    const wizard = read('CreateGroundPage.tsx')
    expect(wizard).toContain('rememberWhoWasNotInvited(ground.id, failed)')
    /* Before the navigation, or the page it is for never sees it. */
    expect(wizard.indexOf('rememberWhoWasNotInvited')).toBeLessThan(wizard.indexOf('navigate(`/grounds/${ground.id}`)'))
  })

  it('and the check-in page reads it, names them, and can clear it', () => {
    const page = read('GroundAdminPage.tsx')
    expect(page).toContain('whoWasNotInvited(id)')
    expect(page).toContain('whatToSayAboutThem(notInvited)')
    expect(page).toContain('thatIsDealtWith(id!)')
  })
})
