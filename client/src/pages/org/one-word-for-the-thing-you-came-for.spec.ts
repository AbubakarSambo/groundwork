import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THREE NAMES ON ONE SCREEN FOR THE THING SOMEBODY CAME TO GET.
 *
 * The button said "key", the section heading said "Credentials", and step one of the checklist said
 * "credential". Asked for in the plainest possible terms - "it does not take you to api key" - so
 * "key" is the word the person reaching for it uses, and the page now uses only that.
 *
 * The API's own names are untouched and must stay: `client_credentials` is an OAuth grant type,
 * `clientId` and `clientSecret` are fields an engineer types. Renaming those to match the prose
 * would break the thing the prose is describing.
 */
const PAGE = readFileSync(join(__dirname, 'IntegrationsPage.tsx'), 'utf8')

/** Comments and code identifiers stripped, so this reads what a person reads. */
function proseOf(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    /* API call sites and query keys are code, not copy. */
    .replace(/integrationsApi\.\w+/g, '')
    .replace(/queryKey: \[[^\]]*\]/g, '')
    .replace(/\bclient_credentials\b/g, '')
    .replace(/\bclientSecret\b|\bclientId\b/g, '')
    .replace(/setupDone\.\w+/g, '')
}

describe('one word for the thing you came for', () => {
  it('calls it a key everywhere a person reads it', () => {
    const prose = proseOf(PAGE)
    const leftovers = [...prose.matchAll(/.{0,60}credential.{0,60}/gi)].map(m => m[0].trim())
    expect(leftovers, [
      'The page calls this a key. A second name for it on the same screen is how somebody ends up',
      'unsure whether they are looking at the thing they were sent to find.',
      'API field names are exempt and are stripped before this check - see proseOf.',
    ].join('\n')).toEqual([])
  })

  it('and leaves the API\'s own names alone, because an engineer types those', () => {
    expect(PAGE).toContain('client_credentials')
    expect(PAGE).toContain('client_id')
    expect(PAGE).toContain('client_secret')
  })

  it('says it on the button, the heading and the checklist', () => {
    /* UPDATED (30 September, the shared-parts rebuild, group 1's last page): this used to pin the
       page's own old inline-style markup (`<div style={S.sec}>Keys</div>`, a custom `Step` part
       with a `title` prop) and the verb "Issue". The rebuild uses the shared `Section`/`Steps`/
       `Step` parts (no inline styles, per this task) and the prototype's own verb for this button
       (tools.txt, s5.js: `act("Create a key", ...)`) - "Create", not "Issue". The word is still one
       word, "key", everywhere a person reads it - checked in full by the test above. */
    expect(PAGE).toContain('Create a key')
    expect(PAGE).toMatch(/heading="Keys"/)
    expect(PAGE).toMatch(/Create a key\. One per system/)
  })
})
