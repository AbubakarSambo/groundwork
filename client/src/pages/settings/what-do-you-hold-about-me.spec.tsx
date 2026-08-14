import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * THE ANSWER TO "WHAT DO YOU HOLD ABOUT ME". W14-9.
 *
 * The marketing site tells people their answers stay theirs, and nothing in the product ever showed
 * them what theirs amounted to. `GET /users/me/export` and `DELETE /users/me/data` have both existed
 * since the GDPR work with no caller anywhere in the client.
 *
 * This is the rebuild of the privacy audit I deleted. The reason that one went is worth keeping in
 * view: it read across organisations, so any admin could ask whether a stranger at another company
 * had a record. These two endpoints take no id at all - the user comes off the token - so the shape
 * that made the old one wrong cannot recur here.
 */
const PAGE = readFileSync(join(__dirname, 'SettingsPage.tsx'), 'utf8')
const CODE = PAGE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const API = readFileSync(join(__dirname, '../../api/my-data.ts'), 'utf8')

describe('the endpoints have a caller at last', () => {
  it('the export', () => {
    expect(API).toContain("apiClient.get<MyData>('/users/me/export')")
    expect(CODE).toMatch(/mutationFn: myDataApi\.get/)
  })

  it('and the erase', () => {
    expect(API).toContain("apiClient.delete('/users/me/data')")
    expect(CODE).toMatch(/mutationFn: myDataApi\.erase/)
  })

  it('neither takes a user id', () => {
    /**
     * The whole reason the old privacy audit was deleted. A path that accepts an id is a path
     * somebody can point at a person who is not them.
     */
    expect(API).not.toMatch(/\$\{userId\}|\$\{id\}/)
  })
})

describe('what the page shows', () => {
  it('is loaded on demand, not on every visit to Settings', () => {
    // This is somebody's whole record. Fetching it because they came to change a phone number is
    // the wrong default for the one page meant to be careful with it.
    expect(CODE).toMatch(/Show me/)
    expect(CODE).toMatch(/loadMyData\.mutate\(\)/)
  })

  it('counts what is held and names the grounds it came from', () => {
    expect(CODE).toMatch(/myData\.recordEntries\.length/)
    expect(CODE).toMatch(/myData\.checkIns\.length/)
    expect(CODE).toMatch(/myData\.grounds\.map/)
  })

  it('and the download is built from what is on screen', () => {
    // A second request could return something different from what the page just told them.
    expect(CODE).toMatch(/JSON\.stringify\(myData, null, 2\)/)
  })
})

describe('what erase is described as doing', () => {
  it('says the name goes', () => {
    expect(CODE).toMatch(/Your name and email are removed everywhere/)
  })

  it('and says the answers stay, because they do', () => {
    /**
     * THE PART THAT WOULD HAVE BEEN A LIE. `eraseAccount` anonymises the account and explicitly
     * retains what was contributed to a ground, under the other party's claim on the shared
     * record. My first draft of this panel said it "removes your name and your answers".
     *
     * A privacy page that overstates what erasure does is worse than no privacy page: somebody
     * relies on it.
     */
    expect(CODE).toMatch(/stays on the record, without your name on it/)
    expect(CODE).not.toMatch(/removes your name and your answers/)
  })

  it('is behind a confirm, and offers the download first', () => {
    expect(CODE).toMatch(/showEraseConfirm/)
    expect(CODE).toMatch(/Download a copy first/)
  })
})
