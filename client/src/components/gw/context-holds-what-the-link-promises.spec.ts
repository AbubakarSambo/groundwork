import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "SUCCESS EXPECTATIONS ARE NOT REALLY ON CONTEXT. I DON'T SEE IT."
 *
 * My record used to carry both bands. I replaced them with one line - "Success and expectations
 * live on Context" - on the argument that they were already published there.
 *
 * Half true. What is expected of you is on Context, as its own band. What success looks like was
 * not: it rendered on the board and inside each session's report and nowhere else. So the line
 * promised a page that held one of the two things it named, and the other had quietly left the
 * product for anybody who does not open the board.
 *
 * A LINK IS A CLAIM. This file is the tripwire on it: if either band leaves Context, the line on My
 * record becomes false again and nothing on either screen would say so.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const read = (...p: string[]) => readFileSync(path.join(__dirname, ...p), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const CONTEXT = strip(read('ContextPage.tsx'))
const MY_RECORD = strip(read('MyRecord.tsx'))

describe('context holds what the link promises', () => {
  it('what is expected of you', () => {
    expect(CONTEXT).toContain('<ExpectationsPanel')
    expect(CONTEXT).toContain("'What is expected of you'")
  })

  it('and what success looks like, inside that same box', () => {
    /* Not a section of its own and not a sentence under the panel - both read as a second subject.
       It is the standard the expectations are measured against, so it is the last thing in the box
       that holds them. */
    const PANEL = strip(read('ExpectationsPanel.tsx'))
    expect(PANEL).toContain('<WhatSuccessLooksLikeFor')
    expect(PANEL).toContain('dense')
    expect(CONTEXT).not.toContain('<WhatSuccessLooksLikeFor')
  })

  it('for a party, not only for whoever runs the check-in', () => {
    /* The panel renders for both; the band it now carries is the one a party could otherwise only
       reach by opening the board. */
    const at = CONTEXT.indexOf('<ExpectationsPanel')
    const guard = CONTEXT.lastIndexOf('{isLead && (', at)
    const closed = CONTEXT.lastIndexOf(')}', at)
    expect(guard === -1 || closed > guard).toBe(true)
  })

  it('and My record keeps no copy of either', () => {
    /*
     * The signpost went too. "Success and expectations live on Context" was a line telling somebody
     * about a tab three inches above it in the tab bar; a page that ends by naming its neighbours
     * has run out of things to say about itself. What this file protects is that Context actually
     * holds both, which is now the only place either is.
     */
    expect(MY_RECORD).not.toContain('<WhatSuccessLooksLikeFor')
    expect(MY_RECORD).not.toContain('What is expected of you')
  })
})
