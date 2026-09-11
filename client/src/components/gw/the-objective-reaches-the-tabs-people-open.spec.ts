import { readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'

const read = (...p: string[]) => readFileSync(path.join(__dirname, '..', '..', ...p), 'utf8')
/* Comments are removed first: this file matches on what the code does, and a rule quoted in a
   comment must never be able to satisfy an assertion about the code. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the objective reaches the tabs people open', () => {
  it('the session report shows the full band, not the one-line version', () => {
    /* The component's own header says the full band renders "where there is room to work in it:
       the board, and each session's report" - and this file was passing `dense`, which drops the
       per-condition standing and the counts. */
    const s = strip(read('components', 'gw', 'TheSessionsReport.tsx'))
    const at = s.indexOf('<WhatSuccessLooksLike ')
    expect(at).toBeGreaterThan(-1)
    const tag = s.slice(at, s.indexOf('/>', at))
    expect(tag).not.toContain('dense')
  })

  it('and neither Report tab carries it, which reverses an earlier decision', () => {
    /*
      IT WAS ON BOTH TABS AND IT CAME OFF BOTH, 11 SEPTEMBER.

      The argument for putting it there was sound - the objective is what the product asks for at
      setup and never showed anybody against. What settled it was reading the unset state on a real
      check-in: no standard set, so the band printed a paragraph saying nothing is being read
      against anything, then five near-identical sentences from one person about what they think
      success is. The material the report is built from, printed above the report, on the tab whose
      only job is to get somebody to the right session.

      The band still renders where it can say something: the board, each session's report, and
      Context, where the standard is set. This asserts the absence so the next person with the
      original argument reads why it lost before making it again.
    */
    expect(strip(read('components', 'gw', 'SharedReportForAParty.tsx'))).not.toContain('<WhatSuccessLooksLikeFor')
    expect(strip(read('pages', 'grounds', 'GroundAdminPage.tsx'))).not.toContain('<WhatSuccessLooksLikeFor')
  })

  it('and it still reaches the places that can work with it', () => {
    expect(strip(read('pages', 'board', 'BoardPage.tsx'))).toContain('<WhatSuccessLooksLikeFor')
    expect(strip(read('components', 'gw', 'ExpectationsPanel.tsx'))).toContain('<WhatSuccessLooksLikeFor')
  })

  it('and My record still keeps no copy, which is a decision rather than a gap', () => {
    /* Tried adding it here and the suite refused, correctly: Context publishes the same words for
       everybody, and a page that ends by naming its neighbours has run out of things to say about
       itself. Kept as an assertion so the next person reads the reason before trying again. */
    expect(strip(read('components', 'gw', 'MyRecord.tsx'))).not.toContain('<WhatSuccessLooksLikeFor')
  })
})
