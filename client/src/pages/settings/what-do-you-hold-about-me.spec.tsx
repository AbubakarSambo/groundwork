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
  /*
   * UPDATED (group 1 review): the button was "Show me" (view only); it is now the prototype's own
   * "Download it" (own-settings.txt) - the button-count check (e2e/the-prototype-count-of-
   * buttons.spec.ts) holds this screen to the prototype's own single button here, so "Show me" and
   * a separate "Download it" beside the heading could not both stay visible at once. One press now
   * both loads the record (so the sentence and the list below it still appear, exactly as "Show
   * me" used to reveal them) and saves it as a file straight away - nothing the page did is lost,
   * it is the same load with the file added to it. Still on demand, never on every visit: this is
   * somebody's whole record, and fetching it because they came to change a phone number would be
   * the wrong default for the one page meant to be careful with it.
   */
  it('is loaded on demand, not on every visit to Settings, and saved as a file the moment it loads', () => {
    expect(CODE).toMatch(/Download it/)
    expect(CODE).toMatch(/loadMyData\.mutate\(\)/)
    expect(CODE).toMatch(/onSuccess:\s*\(data\)\s*=>\s*\{[\s\S]*?setMyData\(data\)[\s\S]*?saveAsAFile\(data\)[\s\S]*?\}/)
  })

  /*
   * UPDATED (group 1 review): the old sentence read "{recordEntries} things you wrote, across
   * {checkIns} check-ins, on {grounds} grounds:" - "grounds" is the product's own internal word
   * for what everywhere else on this page calls a check-in, so the count on screen (`grounds`,
   * which is also what the list right below it enumerates) did not match the word next to it
   * ("check-ins" meant `checkIns`, a count of individual sessions, not what the list showed). The
   * true sentence counts what the list actually is: "You have written {recordEntries} answers, in
   * {grounds} check-ins." `checkIns.length` (sessions) is no longer named in this sentence, since
   * nothing on screen shows that count any more.
   */
  /*
   * UPDATED (group 1 re-review, fault E): the sentence now confirms the file actually saved
   * ("Saved. ...") before stating what it holds, with the real counts.
   */
  it('counts what is held and names the check-ins it came from', () => {
    expect(CODE).toMatch(/myData\.recordEntries\.length/)
    expect(CODE).toMatch(/myData\.grounds\.length/)
    expect(CODE).toMatch(/myData\.grounds\.map/)
    expect(CODE).toMatch(/Saved\. You have written/)
  })

  /*
   * REMOVED (group 1 re-review, fault E): "Download all of it" repeated the one action "Download
   * it" already did, with no different data behind it, so it is gone rather than kept as a second
   * button. `saveAsAFile` is still the one place the JSON is built, called from `loadMyData`'s own
   * `onSuccess` with the data that request just returned - never a second, possibly different,
   * request for the same thing.
   */
  it('the file is built once, from what "Download it" itself just fetched', () => {
    expect(CODE).toMatch(/function saveAsAFile\(data: MyData\)[\s\S]*?JSON\.stringify\(data, null, 2\)/)
    expect(CODE).not.toMatch(/Download all of it/)
    expect(CODE).not.toMatch(/function downloadMyData/)
  })

  /*
   * REACHABLE WITHOUT DOWNLOADING FIRST (fault E): drawn as a plain text link (`.gwui-plain-link`,
   * like "Cancel" and "Never mind" elsewhere on this page), so it does not need to wait for
   * `myData` to become a second always-visible boxed button - see the rendered check in
   * settings-wording-group1.spec.tsx, which confirms it actually works this way.
   *
   * RENAMED (group 1's third review): "Erase it" said the opposite of what it does - your
   * answers stay, only your name and email go. Now "Remove your name and email", with a sentence
   * saying so right beside it.
   */
  it('is a plain text link, not a second boxed button beside "Download it"', () => {
    expect(CODE).toMatch(/className="gwui-plain-link" onClick=\{\(\) => setShowEraseConfirm\(true\)\}>Remove your name and email</)
    expect(CODE).toMatch(/Your answers stay in the check-ins, without your name\./)
  })
})

describe('what erase is described as doing', () => {
  it('says the name goes', () => {
    expect(CODE).toMatch(/Your name and email are removed everywhere/)
  })

  it('and says the answers stay, because they do', () => {
    /**
     * THE PART THAT WOULD HAVE BEEN A LIE. `eraseAccount` anonymises the account and explicitly
     * retains what was contributed to a check-in, under the other party's claim on the shared
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
