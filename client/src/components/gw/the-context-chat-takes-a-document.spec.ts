import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE CONTEXT CHAT RECOMMENDED DOCUMENTS AND COULD NOT ACCEPT ONE.
 *
 * "The context chat should allow you to add another doc, just like every other chat. And it gets
 * filed under your documents."
 *
 * Its prompt names a document in nearly every turn - "the brief you sent them", "the grant terms" -
 * because naming the thing is how somebody knows what counts as context. And the only way to act
 * on that was to leave the conversation, scroll to the Documents band, upload, and come back to a
 * conversation that had moved on. The check-in chat has had a "+ Doc" button all along.
 *
 * IT UPLOADS THROUGH THE SAME ENDPOINT, which is the whole point: the file lands in Documents with
 * its visibility and its assessment like any other, and nothing new is stored or stored
 * differently.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const CHAT = strip(readFileSync(join(__dirname, 'ContextChat.tsx'), 'utf8'))
const CHECKIN = strip(readFileSync(join(__dirname, '..', '..', 'pages', 'chat', 'ChatPage.tsx'), 'utf8'))

describe('adding a document from the context chat', () => {
  it('uses the same call the check-in chat uses', () => {
    expect(CHAT).toContain('documentsApi.upload(groundId, file)')
    expect(CHECKIN).toContain('documentsApi.upload(')
  })

  it('is offered beside the message box, like the other chat', () => {
    expect(CHAT).toContain("'+ Doc'")
  })

  it('says in the conversation that the file arrived', () => {
    /* A file that uploads silently in a chat reads as a file that did not upload. */
    expect(CHAT).toMatch(/is filed under this check-in's documents/)
  })

  it('and refreshes the band it landed in', () => {
    /* Otherwise somebody scrolls down to check and sees the old list. */
    expect(CHAT).toContain("queryKey: ['documents', groundId]")
  })

  it('says what failed rather than nothing', () => {
    expect(CHAT).toMatch(/onError[\s\S]{0,120}did not upload/)
  })
})
