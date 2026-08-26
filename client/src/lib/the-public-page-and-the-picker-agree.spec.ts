import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { SCENARIO_LABELS, SCENARIO_KEYS, SCENARIO_GROUPS, COACH_CARD } from './scenario-catalog'

/**
 * THE SITUATIONS ON THE PUBLIC PAGE ARE THE SITUATIONS IN THE PRODUCT.
 *
 * There were four hand-maintained lists of these, not three. The use-cases page was the one nobody
 * counted: it still carried the vocabulary the app had moved off - "New project", "Many people in the
 * same role", "A shock just hit", "You and someone see it differently" - along with five group headings
 * the app no longer uses. It was also missing two situations entirely: the new manager, which the app
 * had split out of the co-founder card, and the pulse check, which did not exist when the page was
 * written.
 *
 * So somebody could read the public page, pick the situation they recognised, sign up, and not find it.
 * That is the same drift the label catalog was built to end, on the one surface the catalog could not
 * reach - marketing is a separate package with a separate build.
 *
 * WHY A TEST AND NOT A SHARED MODULE, the same answer as the two pricing pages: importing across two
 * builds means either a build-time coupling or a copied file that drifts exactly as badly. What
 * prevents the harm is making disagreement fail.
 *
 * WHAT IS DELIBERATELY NOT ASSERTED. The page's descriptions are its own - marketing copy has a
 * different job from a picker card, and forcing them to match would make the public page read like a
 * form. Only the NAMES have to agree, because a name is what somebody carries from one to the other.
 */
const PAGE = resolve(__dirname, '../../../marketing/src/pages/use-cases.astro')

describe('the public use-cases page', () => {
  it('is where this expects it', () => {
    expect(existsSync(PAGE), `${PAGE} has moved - move this check with it rather than deleting it`).toBe(true)
  })

  const html = existsSync(PAGE) ? readFileSync(PAGE, 'utf8') : ''
  const titles = [...html.matchAll(/<div class="gw-case-title">([^<]+)<\/div>/g)].map((m) => m[1].trim())

  it('found its cards, or this test proves nothing', () => {
    expect(titles.length).toBeGreaterThan(10)
  })

  it('offers every situation the product supports', () => {
    /**
     * COHORT_CHECK is offered twice in the app - as the ongoing read and as onboarding a group - so the
     * page carries both names and only the catalog one is required here.
     */
    const missing = SCENARIO_KEYS
      .filter((k) => k !== 'OPEN_READ')
      .filter((k) => !titles.includes(SCENARIO_LABELS[k]))
      .map((k) => `${k} ("${SCENARIO_LABELS[k]}")`)
    expect(missing).toEqual([])
  })

  it('and calls each one what the product calls it', () => {
    /**
     * The retired names, by name. A page saying "A shock just hit" while the app says "Something
     * serious just happened" sends somebody looking for a card that is not there.
     */
    const retired = [
      'New hire starting', 'New project', 'A new partner, cofounder, or manager',
      'New advisor or board member', 'Workplan and budget', 'Board and leadership strategy',
      'Many people in the same role', 'Raise, promotion, or recognition', 'Contract or renewal',
      'You and someone see it differently', 'A shock just hit',
    ]
    const stale = retired.filter((r) => titles.includes(r))
    expect(stale).toEqual([])
  })

  it('groups them the way the product groups them', () => {
    // Five old headings against the app's six was its own quiet mismatch.
    const missing = SCENARIO_GROUPS
      .filter((g) => g.key !== 'open')
      .filter((g) => !html.includes(g.heading))
      .map((g) => g.heading)
    expect(missing).toEqual([])
  })

  it('and does not advertise asking for a coach as a situation', () => {
    /**
     * It is not one. Nothing is created and nobody is invited, so it must not sit in a list of
     * situations on the public page any more than it sits in SCENARIO_FACTS.
     */
    expect(titles).not.toContain(COACH_CARD.label)
  })
})
