import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * WHAT GATES SENDING DATA IN, SAID IN ONE PLACE AND ENFORCED IN ANOTHER.
 *
 * You can read the whole Connect page, issue a key, copy the secret and register a webhook without
 * having been let in. The first thing that fails is the token exchange, in your engineer's terminal,
 * with a 403 - so everything up to that point behaves as though it worked, and the person finds out
 * last.
 *
 * The gate is one line in the API: `mayUseTheApi` on the `oauth/token` route, and nothing else. The
 * page has to say the same thing, and the risk is not that it says nothing - it is that it says
 * something simpler and wrong.
 *
 * IT SAID THE WRONG THING FOR REAL. The banner read "Sending data in needs a paid plan" for as long
 * as a subscription was the gate, and stayed true only until the gate changed. A stale version of it
 * would have sent somebody to buy something that is now free, which is the worst direction for this
 * particular message to be wrong in. That is what this spec is for.
 */
const PAGE = readFileSync(join(__dirname, 'IntegrationsPage.tsx'), 'utf8')
const GATE = readFileSync(
  join(__dirname, '../../../../api/src/modules/public-api/access-is-asked-for-not-bought.ts'),
  'utf8',
)
const API_CONTROLLER = readFileSync(
  join(__dirname, '../../../../api/src/modules/public-api/public-api.controller.ts'),
  'utf8',
)

describe('the page and the gate agree', () => {
  /*
   * UPDATED (30 September, the shared-parts rebuild): "Sending data in needs to be asked for" was
   * never text a person reads - it only ever lived inside this file's own comment, explaining why an
   * earlier heading ("Sending data in needs to be asked for") was replaced with the one actually
   * drawn, "Put check-ins inside your own product" (named for what somebody wants, not for what the
   * system does about it). This spec checked a comment, not the screen; it now checks the real
   * heading, which carries exactly the same gate.
   */
  it('the page tells somebody who has not been let in, before they do the work', () => {
    expect(PAGE).toContain('Put check-ins inside your own product')
    /* Shown on the access request, which is what the API checks too. */
    expect(PAGE).toMatch(/!approved && \(/)
  })

  it('and says nothing about paying, because paying is no longer what this gates', () => {
    const banner = PAGE.slice(PAGE.indexOf('Put check-ins inside your own product'))
    expect(banner.slice(0, 1400)).not.toMatch(/paid plan|subscribe|\/billing|See the plans/)
  })

  it('and lets them ask right there rather than stopping at the bad news', () => {
    const banner = PAGE.slice(PAGE.indexOf('Put check-ins inside your own product'))
    /* The terms sit between the bad news and the button now, so the window is wider. */
    expect(banner.slice(0, 5200)).toContain('Ask for access')
  })

  it('is right about which half is gated', () => {
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

  it('draws nothing an engineer would copy from until access is approved', () => {
    /* 10 Sep 2026: reversed. The page used to let an organisation set everything up before approval
       ("the moment access is approved"). The API is behind a request now: the keys, the calls, the
       webhook registration, WhatsApp and the reference are drawn only for an approved organisation,
       and the request itself carries acceptance of the API terms. */
    expect(PAGE).toMatch(/const approved = !!access\.data\?\.approved/)
    expect(PAGE.match(/\{approved && \(<>/g)?.length).toBe(2)
    expect(PAGE).toContain('acceptedTerms')
    expect(PAGE).not.toContain('the moment access is approved')
  })

  it('and the gate itself decides on the request, not on a subscription', () => {
    const gate = GATE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(gate).toMatch(/ApiAccessStatus\.APPROVED/)
    expect(gate).not.toMatch(/isSubscribed|subscriptionPlan/)
  })
})
