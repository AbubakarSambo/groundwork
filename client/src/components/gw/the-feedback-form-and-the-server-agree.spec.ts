import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE FEEDBACK FORM AND THE SERVER SPEAK THE SAME WORDS. W-UX-C.
 *
 * Every piece of feedback anybody ever sent from inside the product was rejected with a 400, and the
 * table has held zero rows for its whole life. Three separate disagreements, all of them the same
 * kind:
 *
 *   the widget sent          the DTO required
 *   tab: 'build'             tab in ['reaction','build_request','something_went_wrong']
 *   buildPick: '...'         pill (required, from a fixed list)
 *   (no pill at all)         pill
 *
 * And not one of the widget's option strings appeared in the server's list. Two vocabularies for one
 * field, each written carefully, neither aware of the other - which is the shape of nearly every
 * fault this whole pass has turned up.
 *
 * An earlier fix had already removed the catch that swallowed the failure, precisely so somebody
 * would find out. Nobody did, because nobody clicked it. This spec is what finds out instead.
 */
const SERVER = readFileSync(
  join(__dirname, '../../../../api/src/modules/feedback/feedback.controller.ts'), 'utf8',
)
const WIDGET = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')

/** The strings inside a `const NAME = [...]` array, server or client, in order. */
function optionsOf(src: string, name: string): string[] {
  /**
   * `\s*` and not a literal " = [": the widget aligns its declarations, so `BUILD_OPTIONS    = [`
   * matched nothing and this returned an empty array - which the emptiness check below caught on the
   * first run. Two empty arrays comparing equal is exactly how a parity guard rots into a pass.
   */
  const m = new RegExp(`${name}\\s*=\\s*\\[`).exec(src)
  if (!m) return []
  const at = m.index + m[0].length
  const body = src.slice(at, src.indexOf(']', at))
  return [...body.matchAll(/'([^']+)'/g)].map(x => x[1])
}

describe('the options a person can pick are the options the server accepts', () => {
  it('the reaction options match, in the same words', () => {
    expect(optionsOf(WIDGET, 'REACTION_OPTIONS')).toEqual(optionsOf(SERVER, 'REACTION_PILLS'))
  })

  it('the build options match, in the same words', () => {
    expect(optionsOf(WIDGET, 'BUILD_OPTIONS')).toEqual(optionsOf(SERVER, 'BUILD_PILLS'))
  })

  it('and neither list is empty, so a passing test means agreement and not absence', () => {
    /** Two empty arrays are equal. That is the way this guard would rot into meaninglessness. */
    expect(optionsOf(WIDGET, 'REACTION_OPTIONS').length).toBeGreaterThan(3)
    expect(optionsOf(WIDGET, 'BUILD_OPTIONS').length).toBeGreaterThan(3)
  })
})

describe('and the envelope matches too', () => {
  it('every tab name the widget sends is one the server allows', () => {
    const allowed = optionsOf(SERVER, 'VALID_TABS')
    expect(allowed).toContain('reaction')
    for (const sent of ['build_request', 'something_went_wrong']) {
      expect(WIDGET).toContain(`'${sent}'`)
      expect(allowed).toContain(sent)
    }
  })

  it('a pill is always sent, because the server requires one', () => {
    /** The original defect: `pill` was never sent at all, on any of the three tabs. */
    expect(WIDGET).toMatch(/const pill =/)
    expect(WIDGET).toMatch(/payload = \{[\s\S]{0,200}?pill,/)
  })

  it('the free-text tab has a pill of its own rather than none', () => {
    expect(WIDGET).toContain("'Something went wrong'")
    expect(SERVER).toContain("WENT_WRONG_PILL = 'Something went wrong'")
  })

  it('and it goes through the api module, not a raw post', () => {
    expect(WIDGET).toContain('feedbackApi.submit(payload)')
    expect(WIDGET).not.toMatch(/apiClient\.post\('\/feedback'/)
  })
})
