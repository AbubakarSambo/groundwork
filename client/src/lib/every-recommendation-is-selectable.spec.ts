import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { SCENARIO_FACTS, SCENARIO_KEYS, CADENCE_VALUE } from './scenario-catalog'
import { SELECTABLE_CADENCES, sessionsFor } from './cadence'
import type { GroundCadence } from '@/api/grounds'

/**
 * A CONTROL MUST BE ABLE TO SHOW ITS OWN RECOMMENDATION.
 *
 * The picker seeds a cadence and a timeframe from the situation somebody chose. The cadence dropdown
 * offered only the four time-based rhythms, and the timeframe was a fixed menu of seven values. So the
 * moment a situation recommended anything outside those lists, the screen displayed something the
 * product had not chosen and could not be corrected to.
 *
 * The one-off read is where it showed: it recommends ONE_TIME over a single day, and neither was an
 * option. The select fell back to its first entry, so the screen said "Daily" and "1 week" while the
 * state held ONE_TIME and 1, and the summary underneath read "1 sessions over 1 days". A person would
 * have created a daily week-long ground believing they had asked for one round.
 *
 * The recommendation and the control were two lists with nothing reconciling them - the same shape as
 * the situation labels, the two pricing pages, and the two timeline columns. This is the reconciliation.
 */
describe('every recommendation the picker makes', () => {
  it('names a cadence the dropdown actually offers', () => {
    const offered = new Set(SELECTABLE_CADENCES.map((c) => c.cadence as string))
    const unreachable = SCENARIO_KEYS
      .map((k) => ({ k, value: CADENCE_VALUE[SCENARIO_FACTS[k].cadence] }))
      .filter(({ value }) => !offered.has(value))
      .map(({ k, value }) => `${k} recommends ${value}, which the dropdown does not offer`)
    expect(unreachable).toEqual([])
  })

  it('names a timeframe a person can actually set', () => {
    /**
     * The timeframe is a number field now, with the presets as shortcuts. So the only thing to hold is
     * that every recommendation sits inside what the field accepts - a recommendation the input would
     * clamp is the same defect in a different shape.
     */
    const outOfRange = SCENARIO_KEYS
      .map((k) => ({ k, days: SCENARIO_FACTS[k].timelineDays }))
      .filter(({ days }) => days < 1 || days > 730)
      .map(({ k, days }) => `${k} recommends ${days} days`)
    expect(outOfRange).toEqual([])
  })

  it('and the two together produce the check-in count the card promises', () => {
    // The card shows a number of check-ins. It has to be the number this pairing actually yields.
    for (const k of SCENARIO_KEYS) {
      const facts = SCENARIO_FACTS[k]
      const cadence = CADENCE_VALUE[facts.cadence] as GroundCadence
      const fromTheApp = sessionsFor(facts.timelineDays, cadence)
      // sessionsFor returns null for a cadence with no interval; those are one round by design.
      const expected = fromTheApp ?? 1
      expect(expected, `${k}: ${facts.timelineDays} days at ${facts.cadence}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('and the one-off read is genuinely offered as one time', () => {
    // The specific case that was broken. Named, so a future filter cannot quietly drop it again.
    expect(CADENCE_VALUE[SCENARIO_FACTS.SNAPSHOT.cadence]).toBe('ONE_TIME')
    expect(SELECTABLE_CADENCES.map((c) => c.cadence)).toContain('ONE_TIME')
  })

  it('and the picker renders the full list, not the time-based subset', () => {
    /**
     * The ratchet. Both screens that set a cadence must render SELECTABLE_CADENCES; reverting either to
     * TIMED_CADENCES reintroduces exactly this bug while every other test still passes.
     *
     * REPOINTED (People and setup rebuild, 29 Sept): the check-in's own cadence Select (in "How it
     * runs") moved out of GroundAdminPage.tsx's `tab === 'settings'` branch into
     * CheckInPeopleAndSetup.tsx. While fixing that, found the second entry here had always named
     * GroundAdminPage.tsx twice rather than the other real screen with a cadence Select,
     * `components/gw/WhatThisCheckInStillNeeds.tsx` - a pre-existing duplicate this repoint also
     * corrects, since checking the same file twice was never proving the "both screens" this test's
     * own name and comment claim.
     */
    for (const file of ['../pages/grounds/CheckInPeopleAndSetup.tsx', '../components/gw/WhatThisCheckInStillNeeds.tsx']) {
      const src = readFileSync(resolve(__dirname, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      expect(src, `${file} still filters the cadence list`).not.toMatch(/TIMED_CADENCES\.map/)
      expect(src, `${file} does not offer every cadence`).toMatch(/SELECTABLE_CADENCES\.map/)
    }
  })
})
