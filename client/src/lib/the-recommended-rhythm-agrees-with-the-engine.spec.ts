import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { SCENARIO_FACTS, SCENARIO_KEYS, CADENCE_VALUE, RECOMMENDED_MOMENT, recommendedSessions } from './scenario-catalog'

/**
 * THE RECOMMENDED RHYTHM IS WRITTEN TWICE, AND MUST NOT BE ABLE TO DISAGREE.
 *
 * The engine holds `RECOMMENDED_CADENCE` and `DEFAULT_TIMELINE_DAYS` in `grounds.service.ts`, because
 * that is what a check-in is created with. The picker holds the same two values in `scenario-catalog.ts`,
 * because the card has to SHOW them before anything exists to create - the whole point of calling it
 * a recommendation is that the lead reads it and can change it.
 *
 * WHY NOT ONE SHARED MODULE, which is the obvious answer. They are separate packages with separate
 * builds; importing across them means either a build-time coupling or a copied file that drifts
 * exactly as badly. What prevents the harm is not sharing the data, it is making disagreement fail -
 * the same shape as the pricing-page guard, for the same reason.
 *
 * WHAT WENT WRONG WITHOUT THIS. Before the engine had a cadence map at all, the client hardcoded
 * `timelineDays = 90` and `cadence = 'FORTNIGHTLY'` and always sent both, so the engine's per-scenario
 * timeline was never reached on the path people actually use. A 14-day shock ran for 90 days. Nothing
 * failed: each file was internally consistent and nothing compared them.
 */
const ENGINE = resolve(__dirname, '../../../api/src/modules/grounds/grounds.service.ts')

/** Engine situations that are never offered as a card. */
const NOT_A_CARD = ['HELP_TEAM_UNDERSTAND']

describe('the rhythm the card promises', () => {
  it('reads the engine from where this expects it', () => {
    expect(existsSync(ENGINE), `${ENGINE} is gone - move this check with it, do not delete it`).toBe(true)
  })

  const src = existsSync(ENGINE) ? readFileSync(ENGINE, 'utf8') : ''

  /** Pull a `KEY: Cadence.X,` / `KEY: 90,` map out of the engine by its declaration name. */
  const engineMap = (decl: string, pattern: RegExp) => {
    const start = src.indexOf(decl)
    if (start < 0) return {}
    const body = src.slice(start, src.indexOf('};', start))
    const out: Record<string, string> = {}
    for (const m of body.matchAll(pattern)) out[m[1]] = m[2]
    /* The anchor's situation is not a card: nobody picks it, it is reached only from /start/team
       behind its own switch, so the card catalogue rightly does not hold it. Every card is still
       compared below. */
    for (const k of NOT_A_CARD) delete out[k]
    return out
  }

  const cadences = engineMap('RECOMMENDED_CADENCE', /^\s*([A-Z_]+):\s*Cadence\.([A-Z_]+),/gm)
  const timelines = engineMap('DEFAULT_TIMELINE_DAYS', /^\s*([A-Z_]+):\s*(\d+),/gm)

  it('found both maps in the engine, or this test proves nothing', () => {
    // A silent empty parse would make every assertion below pass vacuously, which is the one
    // failure mode a file-reading guard has.
    expect(Object.keys(cadences).length).toBe(SCENARIO_KEYS.length)
    expect(Object.keys(timelines).length).toBe(SCENARIO_KEYS.length)
  })

  for (const key of SCENARIO_KEYS) {
    it(`${key} is created at the cadence its card promises`, () => {
      const shown = CADENCE_VALUE[SCENARIO_FACTS[key].cadence]
      expect(
        cadences[key],
        `the card for ${key} says "${SCENARIO_FACTS[key].cadence}" (${shown}) and the engine creates it ${cadences[key]}`,
      ).toBe(shown)
    })

    it(`${key} runs for as long as its card promises`, () => {
      expect(
        Number(timelines[key]),
        `the card for ${key} says ${SCENARIO_FACTS[key].timelineDays} days and the engine uses ${timelines[key]}`,
      ).toBe(SCENARIO_FACTS[key].timelineDays)
    })
  }

  it('recommends the same moment the engine would create', () => {
    /**
     * The third copied value, for the same reason as the other two: the picker pre-selects it before
     * anything is created, and the engine sets it on grounds opened from the public entry flow. Two
     * maps that must not disagree, so they are compared rather than trusted.
     */
    const moments = engineMap('RECOMMENDED_MOMENT', /^\s*([A-Z_]+):\s*GroundMoment\.([A-Z_]+),/gm)
    expect(Object.keys(moments).length).toBe(SCENARIO_KEYS.length)
    const disagree = SCENARIO_KEYS
      .filter((k) => moments[k] !== RECOMMENDED_MOMENT[k])
      .map((k) => `${k}: card says ${RECOMMENDED_MOMENT[k]}, engine creates ${moments[k]}`)
    expect(disagree).toEqual([])
  })

  it('and the check-in count on the card is arithmetic, not a guess', () => {
    // Spot-checks the two the engine's own guard was written for, from the client's side.
    expect(recommendedSessions('ACUTE_SHOCK')).toBe(14)
    expect(recommendedSessions('NEW_ADVISOR')).toBe(12)
    expect(recommendedSessions('SNAPSHOT')).toBe(1)
  })
})
