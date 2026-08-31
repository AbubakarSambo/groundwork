import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A MEMBER USED TO FILL IN EIGHT STEPS TO BE TOLD NO.
 *
 * Once opening a check-in became limited to leads, "Start a check-in" was still on every screen for
 * everybody: the rail, and the list. Somebody who cannot open one went through the whole form and
 * was refused on submit. The refusal was right; the journey was a waste of their afternoon.
 *
 * Found by walking the journey as each kind of person, not by reading the rule.
 */
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
const LIST = readFileSync(join(__dirname, '..', '..', 'pages', 'grounds', 'GroundsListPage.tsx'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('the button is not shown to somebody it would refuse', () => {
  it('in the rail', () => {
    /*
     * Measured from the element, not from the label: stripping the comment that explains this
     * pulls the guard and the label further apart than a fixed window survives.
     */
    const near = strip(SHELL)
    const i = near.indexOf('Start a check-in')
    const opens = near.lastIndexOf('user?.mayOpenCheckIns !== false', i)
    expect(opens).toBeGreaterThan(-1)
    expect(near.slice(opens, i)).not.toContain('</button>')
  })

  it('and on the list', () => {
    /*
     * There is more than one way to reach /grounds/new from this page - the header action and
     * the empty-state action both need the guard. Checking only the first occurrence let the
     * second one through unnoticed.
     */
    const near = strip(LIST)
    const needle = "navigate('/grounds/new')"
    let i = near.indexOf(needle)
    let count = 0
    while (i !== -1) {
      count++
      expect(near.slice(Math.max(0, i - 300), i)).toContain('user?.mayOpenCheckIns !== false')
      i = near.indexOf(needle, i + needle.length)
    }
    expect(count).toBeGreaterThan(0)
  })

  it('and an older session that does not carry the answer still sees it', () => {
    /*
     * `!== false` rather than `=== true`. A client running against a session minted before this
     * existed has `undefined`, and hiding the product's main action on a stale token would be a
     * worse failure than showing a button that occasionally refuses.
     *
     * REVISITED, AND KEPT. The reason this trade-off exists is a stored user that could be stale
     * indefinitely - which is no longer the case, since the app now re-reads /auth/me on every load
     * and merges the answer. So `=== true` would be safe in the steady state, and it would close the
     * hole where a lost field re-offers the button to everybody, which has happened twice.
     *
     * It is still not worth it. `=== true` hides the button for the moment between hydration and
     * that refetch resolving, so the product's main action appears late on every load for everybody
     * - a certain cost paid constantly, against an uncertain one paid rarely. The real defence is
     * upstream: the field must not go missing. That is asserted in the API, where every endpoint
     * returning a user is required to route through one shape.
     */
    expect(strip(SHELL)).not.toContain('user?.mayOpenCheckIns === true')
    expect(strip(LIST)).not.toContain('user?.mayOpenCheckIns === true')
  })
})
