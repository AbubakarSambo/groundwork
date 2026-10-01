import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE BRIEF COULD BE WRITTEN AT CREATION AND NEVER AGAIN.
 *
 * Two consequences, and the second is why this had to ship with the fix rather than after it. A
 * lead who wanted to tell their team what this check-in is for, once it existed, had no way to. And
 * every check-in made through the entry chat before today carries a brief nobody wrote - the
 * report's read of the lead's own account, in the second person, published to everybody on it - so
 * stopping the cause without giving anybody a way to clear the effect would have left the wrong
 * brief on every existing check-in permanently.
 *
 * NOT MIGRATED, DELIBERATELY. Several paths write this column and one of them lets a lead type
 * whatever they like, so there is no reliable way to tell a machine-written brief from a short
 * human one after the fact. Clearing them by pattern would have deleted real briefs. The route out
 * is a control, not a script.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const PAGE = strip(readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8'))

describe('writing the brief', () => {
  it('is offered on the brief itself, only to whoever may change setup', () => {
    /* "Rewrite", the prototype's word, since U.7 (it was "Rewrite this"). Hafsah, 1 October: the
       brief follows the setup rule, the lead, or an admin once the lead has left (request 104). */
    expect(PAGE).toMatch(/>\s*Rewrite\s*</)
    expect(PAGE).toContain('{mayRewriteTheBrief && briefDraft === null && (')
  })

  it('and offered as a way in when there is none yet', () => {
    expect(PAGE).toContain('Write the brief')
    /* U.7 review: in plain full sentences, with no dash joining two of them. */
    expect(PAGE).toContain('Nobody has said what this check-in is for yet.')
  })

  it('says who reads it once it is saved', () => {
    /* U.7 review: the button is "Save", and who reads it is said in full sentences, under the brief
       and when it is saved, rather than as a clipped phrase on the button. */
    expect(PAGE).toContain("saveBrief.isPending ? 'Saving…' : 'Save'")
    expect(PAGE).toContain("'Saved. Everyone in this check-in now reads this.'")
  })

  it('warns before an empty save clears it', () => {
    /* Blank clearing the brief is deliberate - somebody who wants a brief they did not write GONE
       should not have to replace it with something they do not mean - so it has to be said. */
    expect(PAGE).toContain('Saving it empty removes the brief.')
  })

  it('and refreshes the check-in, so the page shows what was saved', () => {
    expect(PAGE).toMatch(/saveBrief[\s\S]{0,400}invalidateQueries/)
  })
})
