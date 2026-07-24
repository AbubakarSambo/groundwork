import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * documentReceived guard. POST /check-ins/:id/document-received was fully
 * built server-side (conversation.service.ts) - a real model call that
 * acknowledges the document by name and asks what it confirms - and fully
 * bound client-side (conversationApi.documentReceived), but nothing ever
 * called it. Uploading a document only ever produced a static, client-built
 * "Document received" line; the promised AI follow-up question never fired.
 * Source-level: the upload success handler must call conversationApi.
 * documentReceived and append its reply as a real AI message.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ChatPage.tsx'),
  'utf8',
)

describe('ChatPage: a fresh upload gets the engine\'s real follow-up, not just a static note', () => {
  it('calls conversationApi.documentReceived after a successful upload', () => {
    expect(src).toMatch(/conversationApi\.documentReceived\(checkInId\)/)
  })

  it('appends the real AI reply as a message (not only the static "Document received" line)', () => {
    const uploadSuccessIdx = src.indexOf('onSuccess: async (doc, { ctx })')
    const followupIdx = src.indexOf('conversationApi.documentReceived(checkInId)')
    expect(uploadSuccessIdx).toBeGreaterThan(-1)
    expect(followupIdx).toBeGreaterThan(uploadSuccessIdx)
    expect(src).toMatch(/doc-followup-\$\{Date\.now\(\)\}/)
  })
})
