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

  it("a party's Report tab carries it, above the sessions", () => {
    expect(strip(read('components', 'gw', 'SharedReportForAParty.tsx'))).toContain('<WhatSuccessLooksLikeFor')
  })

  it("the lead's Report tab carries it too, and the same one", () => {
    expect(strip(read('pages', 'grounds', 'GroundAdminPage.tsx'))).toContain('<WhatSuccessLooksLikeFor')
  })

  it('and My record still keeps no copy, which is a decision rather than a gap', () => {
    /* Tried adding it here and the suite refused, correctly: Context publishes the same words for
       everybody, and a page that ends by naming its neighbours has run out of things to say about
       itself. Kept as an assertion so the next person reads the reason before trying again. */
    expect(strip(read('components', 'gw', 'MyRecord.tsx'))).not.toContain('<WhatSuccessLooksLikeFor')
  })
})
