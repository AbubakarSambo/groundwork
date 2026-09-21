import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A SHARED REPORT NEEDS TWO PEOPLE, AND THE PAGE SAYS SO.
 *
 * Eighteen per cent of check-ins had fewer than two participants; none of them has a released report
 * and none ever will, because the release rule refuses below two. The owner got their private report
 * and then waited for a second half the product had already decided cannot arrive, and the screen
 * said "forming" (fix plan B17). Both pages and the list row now say the truth and who changes it.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (f: string) => strip(readFileSync(join(__dirname, f), 'utf8'))

describe('a check-in with one person on it', () => {
  it('is told on the party page that the shared report compares two accounts', () => {
    const page = read('GroundParticipantPage.tsx')
    /* Counted the way the server counts a round: a managing-only lead is in session 1 (see who-is-in-this-round). */
    expect(page).toMatch(/whoIsInRound\(\(ground\.participants \?\? \[\]\) as any\[\],[\s\S]{0,140}?\)\.length < 2 && \(/)
    expect(page).toContain('The shared report compares two accounts.')
  })

  it('and on the lead page, with the way to add somebody beside it', () => {
    const page = read('GroundAdminPage.tsx')
    const report = page.slice(page.indexOf("{tab === 'report' && ("), page.indexOf('<TheReportIsAListOfSessions'))
    expect(report).toContain('The shared report compares two accounts. Add somebody and this will build.')
    expect(report).toMatch(/<TextAction onClick=\{\(\) => setTab\('checkins'\)\}/)
  })

  it('and on the list row, without opening it', () => {
    const list = read('GroundsListPage.tsx')
    expect(list).toContain('Needs a second person for a shared report')
    expect(list).toMatch(/filter\(\(p: any\) => !p\.managingOnly\)\.length < 2 && <span/)
  })

  it('which matches the rule the server releases by', () => {
    const grounds = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'grounds', 'grounds.service.ts'), 'utf8'))
    expect(grounds).toContain('if (active.length < 2) return false;')
  })
})
