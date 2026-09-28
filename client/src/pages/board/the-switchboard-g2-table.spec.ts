import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  SWITCHBOARD_GROUPS, SWITCHBOARD_SITUATIONS, EXAMPLE_SWITCHBOARD_ROW,
} from './the-switchboard-g2-table'

/**
 * U.10 REVIEW ITEM 1: THE G2 TABLE, AS DATA, CHECKED AGAINST THE PROTOTYPE'S OWN TEXT.
 *
 * docs/prototype/screens/B1-starting-a-check-in/switchboard.txt is a plain-text scrape of the
 * prototype page. Every group heading, every situation name, and the "Help someone get back on
 * track" legend (Switched on / Optional / Off by design) appear in it verbatim, so this checks the
 * transcription line by line rather than trusting it by eye.
 */
const SWITCHBOARD_TXT = readFileSync(
  join(__dirname, '../../../../docs/prototype/screens/B1-starting-a-check-in/switchboard.txt'),
  'utf8',
)

describe('the switchboard’s 24 situations, against the prototype’s own text', () => {
  it('has exactly the prototype’s 24 situations', () => {
    expect(SWITCHBOARD_SITUATIONS.length).toBe(24)
  })

  it('every group heading is in the prototype’s text', () => {
    for (const { group } of SWITCHBOARD_GROUPS) expect(SWITCHBOARD_TXT).toContain(group)
  })

  it('every situation name is in the prototype’s text', () => {
    for (const situation of SWITCHBOARD_SITUATIONS) expect(SWITCHBOARD_TXT).toContain(situation)
  })

  it('the example row’s switched-on sections are all in the prototype’s "Switched on" list', () => {
    for (const s of EXAMPLE_SWITCHBOARD_ROW.switchedOn) expect(SWITCHBOARD_TXT).toContain(s)
  })

  it('the example row’s optional sections match the prototype’s "Optional" line', () => {
    expect(SWITCHBOARD_TXT).toContain(EXAMPLE_SWITCHBOARD_ROW.optional.join(', '))
  })

  it('the example row’s off-by-design reasons are the prototype’s own words', () => {
    for (const { why } of EXAMPLE_SWITCHBOARD_ROW.offByDesign) expect(SWITCHBOARD_TXT).toContain(why)
  })
})
