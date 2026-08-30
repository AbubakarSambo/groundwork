import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE CURL ON THE CONNECT PAGE HAS TO BE A COMMAND, NOT A SKETCH.
 *
 * The page hands somebody an API key and step 2 said "exchange the credential for a token, then
 * push an objective or a person" - which is the shape of the answer, not the answer. The only way
 * to find out it is two calls was to read a generated reference.
 *
 * The two examples added there were run against the running API before being put on screen, and
 * the second was wrong when written: it omitted `type`, which is required, and the push came back
 * 400 with "Unknown subject type undefined". An example that does not run is worse than none - the
 * person following it cannot tell whether the API is broken or the instructions are.
 *
 * This pins the fields that were actually wrong. It cannot prove the whole command runs - only
 * running it does that, and it was - but it fails if somebody edits the body back to the shape that
 * returned a 400.
 */
const PAGE = readFileSync(join(__dirname, 'IntegrationsPage.tsx'), 'utf8')

describe('the example on the page has to run', () => {
  it('shows both calls, because one is useless without the other', () => {
    expect(PAGE).toContain('/api/org/v1/oauth/token')
    expect(PAGE).toContain('/api/org/v1/subjects')
    expect(PAGE).toContain('client_credentials')
    expect(PAGE).toContain('Bearer $ACCESS_TOKEN')
  })

  it('sends the field the API actually reads', () => {
    /* `type`, not `kind`. The API answers 400 "Unknown subject type" without it - measured. */
    const push = PAGE.slice(PAGE.indexOf('/api/org/v1/subjects'))
    expect(push).toContain('"type":"objective"')
    expect(push).toContain('"externalId"')
    expect(push).toContain('"sourceSystem"')
    expect(push).toContain('"title"')
  })

  it('shows the bulk shape, which is not the single one in an array', () => {
    /*
     * `sourceSystem` moves to the batch. Copying the single body into an array and leaving it on
     * each row answers "sourceSystem is required on the batch" - measured, by doing exactly that.
     * A real integration sends batches, and the page documented only the single push.
     */
    const bulk = PAGE.slice(PAGE.indexOf('/api/org/v1/subjects/bulk'))
    expect(bulk).toContain('"sourceSystem":"your-okr-tool"')
    expect(bulk).toContain('"subjects":[')
    /* And the rows inside carry no sourceSystem of their own. */
    const rows = bulk.slice(bulk.indexOf('"subjects":['), bulk.indexOf(']}'))
    expect(rows).not.toContain('sourceSystem')
    expect(rows).toContain('"type":"objective"')
  })

  it('shows the CRM path, which is evidence against an objective', () => {
    /*
     * The decision: a CRM is evidence against objectives, not a source of more things to track.
     * That was already the shape the API had - there is no `deal` type and should not be - and the
     * page had never mentioned evidence at all, which is why somebody with a CRM concluded this
     * was an OKR tool.
     *
     * PUT rather than POST: it is the current state of something, not another entry in a log.
     */
    expect(PAGE).toContain('/api/org/v1/evidence')
    /* From the curl, not from the URL - the verb comes before it and the slice has to include it. */
    const ev = PAGE.slice(PAGE.indexOf('curl -X PUT'))
    expect(ev).toContain('/api/org/v1/evidence')
    expect(ev).toContain('"objectiveExternalId"')
    expect(ev).toContain('"observedAt"')
    /* Counts and short labels. The API refuses anything over 40 characters as prose. */
    expect(ev).toContain('"state"')
    /* And it says what a nightly push gets for an objective nobody is checking in about. */
    expect(ev).toContain('matched: false')
  })

  it('never prints a secret it cannot know', () => {
    /*
     * The client id can be the real one - it is on the credentials list. The secret is shown once
     * at issue time and stored only as a hash, so anything that looked like a live secret here
     * would be either a placeholder pretending to be real or a genuine leak.
     */
    /*
     * A real secret is random base64url, so it carries capitals or digits. A placeholder is words
     * and underscores. The first version of this matched both and failed on
     * "gws_the_secret_shown_when_you_issued_it", which is exactly what should be there.
     */
    const shown = (PAGE.match(/gws_[A-Za-z0-9_-]{12,}/g) ?? []).filter(t => /[A-Z0-9]/.test(t.slice(4)))
    expect(shown).toEqual([])
  })
})
