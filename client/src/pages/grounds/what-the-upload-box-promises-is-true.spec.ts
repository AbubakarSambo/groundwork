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
const PAGE = readFileSync(path.join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('what the upload box promises is true', () => {
  it('no longer claims every check-in reads what you upload', () => {
    expect(PAGE).not.toMatch(/read by every check-in before it asks a/i)
  })

  it('says it starts private, where somebody reads it before uploading', () => {
    expect(PAGE).toMatch(/What you add starts private to you/)
  })

  /**
   * With the flag off a document can never be opened, so offering "open it and everyone reads it"
   * would swap one false promise for another.
   */
  it('and tells the flag-off truth, which is a different truth', () => {
    expect(PAGE).toMatch(/What you add stays yours\. It shapes the questions in your own check-in/)
  })

  /**
   * BOUND TO THE TERNARY ITSELF, not to the word appearing somewhere nearby. The first version of
   * this asserted `contextEnabled` was present within 700 characters, and a mutation replacing the
   * condition with `true` left it green - another `contextEnabled` a few lines down satisfied it.
   */
  /**
   * The heading has to agree with the sentence beneath it. "Private to you until you open it" is a
   * promise of an action that does not exist with the flag off, and it sat directly above a sentence
   * correctly saying the file reaches nobody.
   */
  it('the heading does not offer an action the flag has turned off', () => {
    expect(PAGE).toMatch(/contextEnabled \? 'A file, private to you until you open it' : 'A file, private to you'/)
  })

  it('the sentence is chosen by the flag, not printed regardless', () => {
    expect(PAGE).toMatch(/\{contextEnabled\s*\?\s*'What you add starts private to you/)
  })
})
