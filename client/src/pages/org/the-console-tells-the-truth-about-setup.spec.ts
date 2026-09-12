import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A SETUP STEP MUST TICK ON WHAT HAPPENED, NOT ON WHAT WAS ATTEMPTED.
 *
 * The whole point of a guided path is that an admin who has finished step three KNOWS the
 * connection works. A step that ticks because a form was submitted teaches them to trust a green
 * mark that means nothing, and they discover the truth later, in production, from a customer.
 *
 * So each step reads live state: a credential that exists, a credential that has actually been
 * USED, an endpoint that exists, and a delivery that actually SUCCEEDED. `lastUsedAt` and
 * `status === 'DELIVERED'` are the two that carry the weight - they are the difference between
 * having a key and having used it, and between having an address and having reached it.
 */
const SRC = readFileSync(join(__dirname, 'IntegrationsPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('the console tells the truth about setup', () => {
  it('ticks "authenticated" on real use, not on a credential existing', () => {
    expect(SRC).toMatch(/used:\s*\(creds\.data \?\? \[\]\)\.some\(c => c\.lastUsedAt\)/)
  })

  it('ticks "received one" on a successful delivery, not on an endpoint existing', () => {
    expect(SRC).toMatch(/delivered:\s*\(deliveries\.data \?\? \[\]\)\.some\(d => d\.status === 'DELIVERED'\)/)
  })

  it('does not tick anything from a mutation having been called', () => {
    /* `issue.isSuccess` and friends describe what the browser did, not what the server holds. */
    expect(SRC).not.toMatch(/done=\{[^}]*\.isSuccess/)
    expect(SRC).not.toMatch(/setupDone[\s\S]{0,200}isSuccess/)
  })
})

describe('a secret is shown once and never fetched back', () => {
  it('is held only in component state, from the issue response', () => {
    expect(SRC).toMatch(/setFreshSecret\(\{ clientId: c\.clientId, clientSecret: c\.clientSecret \}\)/)
  })

  it('the page never asks for a secret', () => {
    /* There is no endpoint that returns one, and this makes sure nobody adds a call for it. */
    expect(SRC).not.toMatch(/getSecret|revealSecret|fetchSecret/)
  })

  it('says plainly that it will not be shown again', () => {
    expect(SRC).toMatch(/not shown again/i)
  })
})

describe('the plain-language half comes first', () => {
  it('explains what happens before it asks for anything', () => {
    /*
     * The order is the feature. An operations lead should be able to read the top of this page and
     * decide whether to involve their engineer, without meeting a scope checkbox first.
     */
    /* The heading is "What it does" now: the section was 1,083 words of prose and the old title
       was part of that, promising plain terms above nine paragraphs. */
    const plain = SRC.indexOf('What it does')
    const credentials = SRC.indexOf('>Credentials<')
    const setup = SRC.indexOf('Setting it up')
    expect(plain).toBeGreaterThan(-1)
    expect(setup).toBeGreaterThan(plain)
    expect(credentials === -1 || credentials > plain).toBe(true)
  })

  it('shows what it looks like rather than listing what it never returns', () => {
    /* 10 Sep 2026: the "What this API never returns" section was removed on Hafsah's decision and
       replaced with three screenshots (the panel, an organisation's own panel, a WhatsApp check-in).
       The exclusions live in the API's own terms and in the engine; the page shows the product. */
    expect(SRC).toContain('What it looks like')
    expect(SRC).toContain('/connect/panel.png')
    expect(SRC).not.toContain('What this API never returns')
  })

  it('says why an event in the contract is missing from the picker', () => {
    /* An admin who has read the contract and cannot find blocker.raised should learn why here
       rather than from a support thread. */
    expect(SRC).toMatch(/notYetEmitted/)
    expect(SRC).toMatch(/nothing sends them/i)
  })
})

describe('a skipped row can be found and fixed', () => {
  it('shows every failure rather than a count', () => {
    /*
     * The counts were already visible through the API and were never the problem. "3,999 succeeded"
     * with no way to reach the other one is the failure this closes, and it was reachable only with
     * a machine token until now - the same shape one layer out: the information existed and the
     * person who needed it could not get at it.
     */
    expect(SRC).toMatch(/jobDetail\.data \?\? \[\]|\(jobDetail\.data\?\.failures \?\? \[\]\)\.map/)
    expect(SRC).not.toMatch(/failures\.slice\(0,\s*\d/)
  })

  it('prints the index exactly as the API returns it', () => {
    /*
     * It was `f.index + 1` for a minute, on the reasoning that people count from one. The field is
     * documented zero-based and the engineer fixing this reads the API, so a screen saying row 148
     * about what the API calls 147 is two places that must agree, disagreeing, in the one place
     * somebody is already confused.
     */
    expect(SRC).not.toMatch(/f\.index \+ 1/)
    expect(SRC).toMatch(/index \{f\.index\}/)
  })

  it('still identifies a row when no id was sent', () => {
    /* Which is why the index is stored beside the id rather than instead of it. */
    expect(SRC).toMatch(/no id was sent/)
  })

  it('says the fix is safe to re-send, because it is', () => {
    /* Every row is an upsert on the customer's own key. Without saying so, the honest thing for a
       cautious admin to do is nothing. */
    expect(SRC).toMatch(/re-sending the whole batch is safe/)
  })

  it('explains a quiet period rather than leaving the product silent', () => {
    expect(SRC).toMatch(/detectionQuietUntil/)
    expect(SRC).toMatch(/will not raise findings until/)
  })
})
