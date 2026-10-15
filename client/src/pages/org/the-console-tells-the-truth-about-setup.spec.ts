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

/** The same source, with every `<pre>...</pre>` code block removed - the curl examples keep their
    own `-H`/`-X` flags and `Bearer $ACCESS_TOKEN` header, which are code, not prose a person reads. */
const PROSE = SRC.replace(/<pre[\s\S]*?<\/pre>/g, '')

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
    /* U.18: "What it does" moved to Connections as "More you can connect"; this page opens with the
       prototype's plain sentence for whoever runs the systems, before any key. */
    const plain = SRC.indexOf('For whoever runs')
    const credentials = SRC.indexOf('>Credentials<')
    const setup = SRC.indexOf('Setting it up')
    expect(plain).toBeGreaterThan(-1)
    expect(setup).toBeGreaterThan(plain)
    expect(credentials === -1 || credentials > plain).toBe(true)
  })

  /*
   * UPDATED (group 1 review): `/connect/panel.png` was an actual screenshot naming a real person
   * ("Hafsah Jumare") and a real company ("Coamana CRM"), shown to every organisation - the same
   * fault `/connect/ops-panel.png` had, fixed the same way: drawn in markup instead
   * (`EmbedWidgetExample`, with the prototype's own made-up company and people), never a
   * screenshot. The three-illustrations structure this test protects (10 Sep 2026 decision) is
   * unchanged; only the first illustration is no longer a real screenshot.
   */
  it('shows what it looks like rather than listing what it never returns', () => {
    /* 10 Sep 2026: the "What this API never returns" section was removed on Hafsah's decision and
       replaced with three illustrations (the panel, an organisation's own panel, a WhatsApp check-in).
       The exclusions live in the API's own terms and in the engine; the page shows the product. */
    expect(SRC).toContain('How it looks inside your tool')
    expect(SRC).toContain('EmbedWidgetExample')
    expect(SRC).not.toContain('/connect/panel.png')
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

  /*
   * REVERSED (group 1 re-review, fault B): the earlier decision here was that a screen showing
   * `f.index + 1` disagreed with the API's own documented zero-based field, confusing whoever
   * cross-checks the two. The re-review's instruction is explicit: "no id was sent" and a bare
   * mono "index {n}" are not full sentences a person reads, and the fix is "Row 4 had no ID, so
   * it was skipped." using the real row number, counting from 1 *because a person reads it* -
   * this screen is that person-facing sentence, not the API reference (which still documents the
   * field zero-based, for whoever reads code). The two audiences read different numbers on
   * purpose now: this test checks the sentence a person reads, not the raw field.
   */
  it('names a skipped row as a full sentence, counting from 1 because a person reads it', () => {
    expect(SRC).not.toMatch(/index \{f\.index\}/)
    expect(SRC).toMatch(/f\.index \+ 1/)
    expect(SRC).toMatch(/had no ID, so it was skipped/)
  })

  it('says the fix is safe to re-send, because it is', () => {
    /* Every row is an upsert on the customer's own key. Without saying so, the honest thing for a
       cautious admin to do is nothing.
       UPDATED (group 1's third review): split into two sentences, so "Re-sending" now starts one
       capitalised, where it used to sit lowercase after a semicolon. */
    expect(SRC).toMatch(/Re-sending the whole batch is safe/)
  })

  it('explains a quiet period rather than leaving the product silent', () => {
    expect(SRC).toMatch(/detectionQuietUntil/)
    expect(SRC).toMatch(/will not raise findings until/)
  })
})

/*
 * GROUP 1 RE-REVIEW, FAULT B (last item): "For your engineer"'s own prose used to join two
 * clauses with a dash instead of writing a sentence, said "bearer token" and "completeness band"
 * (jargon nobody outside an engineer would recognise), and named "the read-one-person's-desk
 * permission" as a hyphenated compound rather than a sentence. Checked against the prose only -
 * the curl examples keep their own `-H`, `-X` and `Bearer $ACCESS_TOKEN`, which are code the
 * engineer this section is for actually needs, not sentences a person reads.
 */
describe('"For your engineer": plain sentences, code blocks untouched', () => {
  it('never joins two clauses with a dash', () => {
    expect(PROSE).not.toMatch(/\S - \S/)
  })

  it('never says "bearer", "band" or "desk permission"', () => {
    expect(PROSE).not.toMatch(/\bbearer\b/i)
    expect(PROSE).not.toMatch(/\bband\b/i)
    expect(PROSE).not.toMatch(/desk permission/i)
  })

  it('the curl examples still carry their own headers, unaffected', () => {
    expect(SRC).toMatch(/authorization: Bearer \$ACCESS_TOKEN/)
  })
})
