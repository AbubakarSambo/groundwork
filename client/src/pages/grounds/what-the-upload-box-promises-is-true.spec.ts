import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * WHAT THE UPLOAD BOX PROMISES IS WHAT ACTUALLY HAPPENS.
 *
 * The empty state - the one sentence somebody reads BEFORE they upload anything - said "anything you
 * upload here is read by every check-in before it asks a question". Nothing uploaded there is read by
 * every check-in. A document is created OWN and reaches its uploader alone until they open it, and
 * with CONTEXT_ENABLED off it cannot be opened at all: `canSeeDocument` returns `isMine` and ignores
 * the column entirely.
 *
 * THE TRUE SENTENCE WAS ALREADY SIX LINES BELOW IT - "everything you add starts private to you" - and
 * rendered only once at least one document existed. So the page told the truth after the upload it
 * had just talked somebody into. Two copies of one fact with nothing reconciling them, which is the
 * shape of most of what this codebase has turned up.
 *
 * WHY NOT THE OTHER FIX. Defaulting a lead's upload to Open was the alternative. G24 rule 3 refuses
 * it, in writing, and the reason holds: a performance plan or a note about somebody's health dropped
 * into shared context in a hurried first week cannot be recalled, because the others have read it.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** The upload box moved out of the page and into the one Context page. */
const PAGE = readFileSync(path.join(__dirname, '../../components/gw/ContextPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('what the upload box promises is true', () => {
  it('no longer claims every check-in reads what you upload', () => {
    expect(PAGE).not.toMatch(/read by every check-in before it asks a/i)
  })

  it('states the privacy default where somebody reads it before uploading', () => {
    /*
     * THE FACT, NOT THE SENTENCE IT WAS ONCE WRITTEN IN.
     *
     * This used to pin the heading verbatim - "A file, private to you until you open it". The
     * heading is now what the box is FOR, in her words: "upload file to use as proof or context of
     * work in the checkin, it is private to you unless you decide to make it visible to everyone."
     * The privacy half moved to the line under the control.
     *
     * What must not change is WHERE it is read: above the button, before anything is uploaded, and
     * not inside the empty-state branch. Put in the empty state it disappeared as soon as the list
     * held one document - the page telling the truth only after the upload it had already talked
     * somebody into, which is the bug this file exists for.
     */
    /* The prototype's sentence since U.7; it was "It is private to you unless you decide to make it
       visible to everyone." Same promise: private first, and the uploader chooses. */
    expect(PAGE).toMatch(/It starts private to you\. You choose who can read it\./)
  })

  /** And it is not conditional on the list being empty. */
  it('and keeps stating it once documents exist', () => {
    const box = PAGE.slice(PAGE.indexOf("'Add a document'"), PAGE.indexOf('id="ga-doc-upload"'))
    const privacyAt = box.indexOf('It starts private to you')
    const emptyBranchAt = box.indexOf('docs.length === 0')
    expect(privacyAt).toBeGreaterThan(-1)
    expect(emptyBranchAt).toBeGreaterThan(-1)
    expect(privacyAt).toBeLessThan(emptyBranchAt)
  })

  /**
   * With the flag off a document can never be opened - `canSeeDocument` returns `isMine` and
   * ignores the column - so offering "everyone reads it once you open it" would swap one false
   * promise for another.
   */
  it('and tells the flag-off truth, which is a different truth', () => {
    expect(PAGE).toMatch(/'It is private to you\. It shapes your own questions and reaches nobody else\.'/)
  })

  it('the sentence is chosen by the flag, not printed regardless', () => {
    /* Bound to the ternary itself rather than to the word appearing nearby: an earlier version of
       this asserted `contextEnabled` was present within 700 characters, and replacing the condition
       with `true` left it green because another `contextEnabled` sat a few lines down. */
    expect(PAGE).toMatch(/\{contextEnabled\s*\?\s*'It starts private to you\. You choose who can read it\./)
  })

  /** Her third sentence, and the one nobody knew: the file is not storage, it is read against you. */
  it('says the check-in reads it against what you have said', () => {
    expect(PAGE).toMatch(/says where it does not match what you have told it/)
  })
})
