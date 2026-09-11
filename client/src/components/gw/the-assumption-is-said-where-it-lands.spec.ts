import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE ASSUMPTION IS SAID WHERE IT LANDS, AND NOTHING IS ASKED FIRST.
 *
 * This page used to stop a file whose name said "transcript" and ask before it left the device, and
 * the server refused one the client had not confirmed. Reversed by the product owner on 11 September
 * 2026: nothing is refused. The server recognises a record of a conversation by its shape, keeps it,
 * and says the assumption back - and the page shows that sentence at the one moment it lands. The
 * claim stays small: we never say we hold anybody's consent.
 */
const PAGE = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
const API = readFileSync(join(__dirname, '..', '..', 'api', 'documents.ts'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('nothing is asked before it leaves the device', () => {
  const code = strip(PAGE)

  it('the file picker hands every file straight to the upload', () => {
    expect(code).not.toMatch(/askingConsent/)
    expect(code).not.toMatch(/transcript\|recording\|call notes/)
  })

  it('and the error path no longer swallows a refusal, because there is none to swallow', () => {
    expect(code).not.toContain("said.includes('record of a conversation')")
  })
})

describe('the assumption is said where it lands', () => {
  it('the page shows the sentence the server sends back after a conversation is kept', () => {
    const code = strip(PAGE)
    expect(code).toMatch(/if \(res\?\.assumed\) toast\.message\(res\.assumed/)
  })

  it('and never says we hold the customer\'s consent', () => {
    expect(strip(PAGE)).not.toMatch(/\b(we have their consent|consent obtained|they have agreed)\b/i)
  })
})

describe('the client is not the gate, and neither is the server now', () => {
  it('the old flag is still sent when present, so nothing breaks, and the API says it is no longer read', () => {
    expect(API).toContain("if (consentConfirmed) form.append('consentConfirmed', 'true')")
    expect(API).toContain('no longer read by the server')
    /* Two halves, because the sentence wraps across comment lines. */
    expect(API).toContain('the assumption is said back')
    expect(API).toContain('as `assumed`')
  })
})
