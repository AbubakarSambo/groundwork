import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

const SRC = join(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * ONE FIELD, THREE PLACES, TWO NAMES.
 *
 * The report's question was drawn on the board as "The question this turns on" and on the report
 * and a party's shared picture as "The one thing to settle first". Somebody who read the board and
 * then their report saw what looked like two different things, and it is one field.
 *
 * Both names were also wrong about it: it was almost always TWO questions, and "to settle first"
 * reads as a job for whoever is looking at the screen when it is a question for the group. Nothing
 * anywhere said who answered it or when, so a person read a question and had nowhere to put it.
 *
 * Comments stripped before matching: a guard a comment satisfies is not a guard - and the comments
 * in these files quote the old names to explain why they went.
 */
describe('the report has one question, under one name', () => {
  /* 'pages/report/ReportPage.tsx' came off this list 1 October 2026, the moment ReportBody - its
     only content, and the only thing on that page that ever drew `<WhatToSettleTogether`, was
     deleted (see the comment at the top of ReportPage.tsx). The per-session report
     (`TheSessionsReport.tsx`) draws the session-scoped `theConversationWorthHaving` instead, in its
     own boxed treatment rather than through this shared component - a deliberate difference from
     the ground-level `centralQuestion` this file is about, not an omission of it. */
  const PAGES = ['pages/board/BoardPage.tsx', 'components/gw/the-shared-picture-a-party-reads.tsx']

  it('no page writes a heading for it of its own', () => {
    for (const p of PAGES) {
      const src = strip(read(p))
      expect(src).not.toContain('The question this turns on')
      expect(src).not.toContain('The one thing to settle first')
    }
  })

  it('and every one of them draws the same component', () => {
    for (const p of PAGES) expect(strip(read(p))).toContain('<WhatToSettleTogether')
  })

  it('which says what it is, and where to take it', () => {
    const c = read('components/gw/what-to-settle-together.tsx')
    expect(c).toContain('What to settle together')
    /* The line that makes it actionable. Without it a person reads a question and drops it. */
    expect(c).toContain('Bring this to your next check-in.')
  })

  it('and it draws nothing at all rather than an empty panel', () => {
    const c = strip(read('components/gw/what-to-settle-together.tsx'))
    expect(c).toMatch(/if \(!question\?\.trim\(\)\) return null/)
  })
})
