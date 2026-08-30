import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * ASKING ABOUT A RECORD OF A CONVERSATION, AT THE MOMENT SOMEBODY UPLOADS ONE.
 *
 * Not a tick-box in a settings page agreed to a year ago. The person about to hand over a recording
 * of somebody else is the only one who can have told them, and this is the only moment they can
 * still go and ask.
 */
const PAGE = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
const API = readFileSync(join(__dirname, '..', '..', 'api', 'documents.ts'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('what the person is asked', () => {
  const code = strip(PAGE)
  const block = code.slice(code.indexOf('askingConsent && ('), code.indexOf('<Sec title="Documents"'))

  it('names the file, so they know what is being asked about', () => {
    expect(block).toContain('{askingConsent.name}')
  })

  it('says the people in it must know, and that they told them', () => {
    expect(block).toContain('know conversations like this may be used')
    expect(block).toContain('you told them, rather than us')
  })

  it('says plainly that we cannot ask them ourselves', () => {
    expect(block).toContain('We cannot ask them ourselves')
  })

  it('and offers a way out that keeps their file', () => {
    /* Saying no uploads nothing and leaves nothing pending. */
    expect(block).toContain('Not yet')
    expect(block).toContain('setAskingConsent(null)')
  })
})

describe('it is a question, not a claim', () => {
  it('never says we hold the customer\'s consent', () => {
    const block = strip(PAGE)
    expect(block).not.toMatch(/\b(we have their consent|consent obtained|they have agreed)\b/i)
  })
})

describe('the client is not the gate', () => {
  it('sends the confirmation only when somebody pressed the button', () => {
    expect(API).toContain("if (consentConfirmed) form.append('consentConfirmed', 'true')")
  })

  it('and says so, because the server is what actually refuses', () => {
    /* A client that never sent it could not slip a transcript through - the server recognises the
       shape for itself. */
    expect(API).toContain('The server decides whether it was needed')
    expect(API).toContain('refuses one without this')
  })
})
