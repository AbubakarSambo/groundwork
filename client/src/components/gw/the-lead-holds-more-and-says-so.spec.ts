import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { LEAD_HOLDS_MORE } from './the-lead-holds-more'

/**
 * A PARTICIPANT IS TOLD THEY ARE NOT SEEING EVERYTHING.
 *
 * G26's "visibly absent": somebody should know the lead holds context they cannot read, rather than
 * believing they are looking at all of it. The sentence existed and was rendered inside
 * `ContextStrength`, which was gated on CONTEXT_ENABLED.
 *
 * IT LIVES IN ITS OWN MODULE NOW, because `ContextStrength` - the "what this check-in can tell you"
 * read - was deleted on her instruction, and a promise made to a person must not be deleted as a
 * side effect of removing the panel it happened to be exported from.
 *
 * SO IT VANISHED IN THE STATE WHERE IT IS MOST TRUE. With the flag off, `canSeeDocument` returns
 * `isMine` and ignores the visibility column entirely - every document is private to whoever uploaded
 * it. A participant is definitely looking at less than the lead is, and that was exactly when nothing
 * on screen admitted it.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
/**
 * It used to live in GroundParticipantPage, which had its own copy of the Context tab. There is one
 * Context page now and the difference is a role flag on it, so this reads that file.
 */
const PARTY = readFileSync(path.join(__dirname, 'ContextPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('the lead holds more, and it says so', () => {
  it('the sentence says what is missing and what is not', () => {
    expect(LEAD_HOLDS_MORE).toMatch(/may hold context/i)
    /** The reassurance is load-bearing: a person must not read this as "my words are being kept". */
    expect(LEAD_HOLDS_MORE).toMatch(/never includes anything you have said/i)
  })

  it('and it reaches a participant with the flag off', () => {
    expect(PARTY).toMatch(/\{!contextEnabled && !isLead && \(/)
    expect(PARTY).toContain('{LEAD_HOLDS_MORE}')
  })

  /** One sentence, one definition. Two copies of a promise drift, and this one is a promise. */
  it('and is not a second copy of the words', () => {
    expect(PARTY).not.toMatch(/The lead may hold context for this check-in that is not shown here\./)
  })

  /** A lead is not told they cannot see their own context. */
  it('and is not shown to the lead', () => {
    expect(PARTY).toMatch(/!isLead/)
  })
})
