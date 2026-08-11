import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * EVERY SITUATION ON THE HOME PAGE GOES SOMEWHERE, AND EVERY SITUATION IS ON IT.
 *
 * Two failures, one cause: the home page used its own display text as the routing
 * key (`?scenario=` + the lowercased label). So the wording was load-bearing.
 * Improving a label meant either breaking the link or adding another alias to
 * SCENARIO_FROM_LABEL, and the safe move was to leave the copy alone - which is
 * exactly what happened. This list fell out of step with the /entry picker, and a
 * person met "New partner or co-founder" in one place and "A new partner,
 * cofounder, or manager" in the other for the same thing.
 *
 * The labels are now free text and the params are explicit, so this holds the two
 * things that can now silently break instead:
 *
 *   1. A param that resolves to nothing. Lands on /grounds/new with no scenario,
 *      which does not error - it just quietly starts the wrong kind of ground.
 *   2. A scenario nothing on the home page can reach. Found this way rather than by
 *      reading: CRISIS_ALIGNMENT ("A big decision") was in the /entry picker and had
 *      no route from the home page at all. Sixteen of seventeen resolved, and a
 *      missing entry looks like nothing.
 *
 * Read from source rather than imported, because both lists are inline in their
 * components and neither is exported.
 */

const HOME = readFileSync(join(__dirname, 'HomePage.tsx'), 'utf8')
const CREATE = readFileSync(join(__dirname, '../grounds/CreateGroundPage.tsx'), 'utf8')
const TYPES = readFileSync(join(__dirname, '../../types/index.ts'), 'utf8')

/** The `param:` values in the home page's situation list. */
const params = [...HOME.matchAll(/\{\s*param:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) =>
  m[1].replace(/\\'/g, "'"),
)

/** SCENARIO_FROM_LABEL, as a key -> scenario map. */
const routes = (() => {
  const body = CREATE.slice(
    CREATE.indexOf('const SCENARIO_FROM_LABEL'),
    CREATE.indexOf('function scenarioFromParam'),
  )
  const out = new Map<string, string>()
  for (const m of body.matchAll(/'((?:[^'\\]|\\.)*)'\s*:\s*'([A-Z_]+)'/g)) {
    out.set(m[1].replace(/\\'/g, "'"), m[2])
  }
  for (const m of body.matchAll(/"([^"]+)"\s*:\s*'([A-Z_]+)'/g)) out.set(m[1], m[2])
  return out
})()

/** Every scenario the product has. */
const scenarios = [...TYPES.slice(TYPES.indexOf('export type GroundScenario'), TYPES.indexOf('export type GroundMoment'))
  .matchAll(/'([A-Z_]+)'/g)].map((m) => m[1])

describe('the home page situation list', () => {
  it('was read at all, so a rename of the field cannot empty this file out', () => {
    // Without this, changing `param:` to something else makes `params` empty and
    // every assertion below passes over nothing.
    expect(params.length).toBeGreaterThanOrEqual(17)
    expect(routes.size).toBeGreaterThanOrEqual(17)
    expect(scenarios.length).toBeGreaterThanOrEqual(17)
  })

  it('sends every situation to a scenario that resolves', () => {
    const dead = params.filter((p) => !routes.has(p))
    expect({
      dead,
      whatToDo:
        'Each of these is a ?scenario= value with no entry in SCENARIO_FROM_LABEL. It does not error - it starts the wrong kind of ground. Add the key, or fix the param.',
    }).toMatchObject({ dead: [] })
  })

  it('and can reach every scenario the product has', () => {
    const reachable = new Set(params.map((p) => routes.get(p)))
    const unreachable = scenarios.filter((s) => !reachable.has(s))
    expect({
      unreachable,
      whatToDo:
        'Each of these is a scenario nobody can start from the home page. CRISIS_ALIGNMENT was in this state and the /entry picker offered it, so it was reachable from one entrance and not the other. Add it to the list, or take it out of GroundScenario.',
    }).toMatchObject({ unreachable: [] })
  })

  it('keeps the display text out of the routing, which is what caused the drift', () => {
    // The old line was `?scenario=${encodeURIComponent(c.label.toLowerCase())}`.
    // If it goes back, every label becomes load-bearing again.
    expect(HOME).toMatch(/scenario=\$\{encodeURIComponent\(c\.param\)\}/)
    expect(HOME).not.toMatch(/c\.label\.toLowerCase\(\)/)
  })
})
