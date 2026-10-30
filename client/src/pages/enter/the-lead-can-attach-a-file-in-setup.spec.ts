import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A new company's lead could not upload documents (26 October 2026): the first-check-in part of setup had no attach button beside the
 * typing box (it went with the composer rebuild), and anything other than plain text went in as "[Binary file: ...]". The check-in chat
 * hid its attach button until the page had loaded the check-in.
 */
const entry = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const chat = readFileSync(join(__dirname, '..', 'chat', 'ChatPage.tsx'), 'utf8')

describe('the lead can attach a file in setup, and in every check-in', () => {
  it('setup reads every format through the server, and never sends "[Binary file: ...]"', () => {
    expect(entry).toContain('if (!isPlainText(file)) return (await documentsApi.readForSetup(file)).text')
    expect(entry).toContain('documentsApi.readForSetup(file)')
    expect(entry).not.toContain('[Binary file:')
    expect(entry).not.toContain('For PDF or Word, paste the text instead.')
    expect(entry.match(/accept=\{UPLOAD_ACCEPT_ATTR\}/g)?.length).toBeGreaterThanOrEqual(2)
  })
  it('the first-check-in part of setup has the attach button beside the typing box', () => {
    const at = entry.indexOf('placeholder="Type your response."')
    expect(entry.slice(at, at + 600)).toContain('onPlus={() => fileRef.current?.click()}')
  })
  it('the check-in chat always shows its attach button', () => {
    expect(chat).toContain('onPlus={() => { if (groundId) setAttachOpen(o => !o) }}')
    expect(chat).not.toContain('onPlus={groundId ? () => setAttachOpen(o => !o) : undefined}')
  })
})
