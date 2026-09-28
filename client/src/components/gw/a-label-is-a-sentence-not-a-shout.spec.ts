import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * U.9 REVIEW FIX 12: A LABEL IS A SHORT SENTENCE, NEVER A SHOUTED, NUMBERED CAPTION.
 *
 * The review found this card's own block labels and citations rendered as "01 THIS IS THE TOP OF
 * IT" and a person's own name under a quote as "RUKIA OTIENO (YOU)" - CSS `textTransform:
 * 'uppercase'` on top of a leading `padStart(2, '0')` number, on wording that was already a plain
 * sentence underneath. Both the numbering and the shouting are gone from this file; the block's
 * position (`n`) stays on the interface, unread, so the-order-comes-from-one-place's structural
 * check of `<Row n={...} label="...">` is unaffected.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const REPORT = strip(readFileSync(join(__dirname, 'TheSessionsReport.tsx'), 'utf8'))

describe('a label on this card is a sentence, not a shout', () => {
  it('never sets a label or a citation in all caps', () => {
    expect(REPORT).not.toMatch(/textTransform:\s*'uppercase'/)
  })

  it('never numbers a block for the reader ("01 What this sits under")', () => {
    expect(REPORT).not.toMatch(/padStart\(2, ['"]0['"]\)/)
  })
})
