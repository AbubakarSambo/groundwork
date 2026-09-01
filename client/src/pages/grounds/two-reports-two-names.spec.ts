import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "REPORT SENT TO EVERYONE" ABOVE "REPORT REVEAL STATUS - WAITING".
 *
 * Reproduced on a real released report: the header strip said the report had gone to everybody,
 * and five hundred pixels below, a panel said nobody had revealed theirs. Both true. On one screen
 * they read as the product contradicting itself.
 *
 * They are different reports. The header tracks the SHARED report, released to the organisation.
 * The panel tracks each person's OWN private report, which they reveal to each other separately.
 *
 * The product already separates those words everywhere else - "Your private report" against
 * "Shared report" - and this one panel said neither. Same defect and same fix as "0 of 2 checked
 * in" over a roster showing two people checked in, and as the tile counting nine above ten cards:
 * say which thing you mean.
 */
const CODE = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('two reports do not share one name', () => {
  it('reads the real file, so an empty one cannot pass', () => {
    expect(CODE.length).toBeGreaterThan(5000)
  })

  it('the reveal panel says WHICH reports it is waiting on', () => {
    expect(CODE).toMatch(/Private reports \{activationStatus\.allActivated/)
    /* The wording that named neither. */
    expect(CODE).not.toMatch(/Report reveal status \{/)
  })

  it('and the header still speaks for the shared one, which was never wrong', () => {
    expect(CODE).toMatch(/'report sent to everyone'/)
    expect(CODE).toMatch(/report\?\.releasedAt/)
  })

  it('the two no longer use one word for two things', () => {
    /* If a future edit renames either to a bare "report", they collide again. */
    const panel = CODE.slice(CODE.indexOf('activationStatus.allActivated') - 200, CODE.indexOf('activationStatus.allActivated') + 120)
    expect(panel).toMatch(/Private/)
  })
})
