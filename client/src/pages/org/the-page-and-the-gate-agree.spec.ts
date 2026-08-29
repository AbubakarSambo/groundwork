import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * WHAT THE PLAN GATES, SAID IN ONE PLACE AND ENFORCED IN ANOTHER.
 *
 * On the free plan you can read the whole Connect page, issue a key, copy the secret and register a
 * webhook. The first thing that fails is the token exchange, in your engineer's terminal, with a
 * 403 - so everything up to that point behaves as though it worked, and the person finds out last.
 *
 * The gate is one line in the API: `mayUseTheApi` on the `oauth/token` route, and nothing else. The
 * page has to say the same thing, and the risk is not that it says nothing - it is that it says
 * something simpler and wrong, like "the API needs a plan", which would be untrue of the webhooks
 * that work either way.
 */
const PAGE = readFileSync(join(__dirname, 'IntegrationsPage.tsx'), 'utf8')
const GATE = readFileSync(
  join(__dirname, '../../../../api/src/modules/public-api/the-api-is-a-paid-thing.ts'),
  'utf8',
)
const API_CONTROLLER = readFileSync(
  join(__dirname, '../../../../api/src/modules/public-api/public-api.controller.ts'),
  'utf8',
)

describe('the page and the gate agree', () => {
  it('the page tells somebody on the free plan before they do the work', () => {
    expect(PAGE).toContain('Sending data in needs a paid plan')
    /* Shown on the absence of a plan, which is what the API checks too. */
    expect(PAGE).toMatch(/\{!plan && \(/)
  })

  it('and points at where to fix it rather than stopping at the bad news', () => {
    const banner = PAGE.slice(PAGE.indexOf('Sending data in needs a paid plan'))
    expect(banner.slice(0, 900)).toContain('/billing')
  })

  it('is right about which half the plan gates', () => {
    /*
     * The gate is applied to the token route and nowhere else. If somebody ever puts it in front of
     * webhook delivery or credential issuing, this page's promise that "nothing else is affected"
     * becomes a lie, and this fails rather than the customer finding out.
     */
    const guarded = [...API_CONTROLLER.matchAll(/mayUseTheApi\(/g)].length
    expect(guarded).toBe(1)
    /* Generous window: a long comment sits between the route and the check. */
    expect(API_CONTROLLER).toMatch(/oauth\/token[\s\S]{0,2500}mayUseTheApi/)
  })

  it('does not disable anything, because setting up before subscribing is reasonable', () => {
    /* Somebody evaluating this should be able to wire it all up and subscribe when ready. */
    const banner = PAGE.slice(PAGE.indexOf('Sending data in needs a paid plan'), PAGE.indexOf('Sending data in needs a paid plan') + 900)
    expect(banner).toContain('starts working the moment you subscribe')
    expect(GATE).toContain('isSubscribed')
  })
})
