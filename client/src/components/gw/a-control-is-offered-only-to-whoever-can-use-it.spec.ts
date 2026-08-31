import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * A CONTROL THAT REFUSES WHEN YOU USE IT SHOULD NOT HAVE BEEN THERE.
 *
 * Everybody's document list holds their own files AND everything OPEN, so most rows on this page
 * belong to somebody else. Both controls on the row - who can read it, and Delete - were drawn on
 * every row regardless, enabled, and the server answered "Document not found": the message for a
 * document that does not exist, said about one plainly on the screen.
 *
 * The API is right to refuse and the wording is right too, since naming the real reason would
 * confirm whose file it is. The fix belongs on the page: `mine` says who uploaded it, and a control
 * only its owner can use is only shown to its owner.
 */
const SRC = readFileSync(path.join(__dirname, 'ContextPage.tsx'), 'utf8')

describe('a control is offered only to whoever can use it', () => {
  it('gates the visibility control on whose document it is', () => {
    expect(SRC).toMatch(/\{contextEnabled && \(doc as any\)\.mine !== false && \(isLead \? \(/)
  })

  it('gates Delete on whose document it is', () => {
    const del = SRC.indexOf('deleteDoc.mutate(doc.id)')
    expect(del).toBeGreaterThan(-1)
    /* The gate sits immediately before the button, within the row it guards. */
    expect(SRC.slice(Math.max(0, del - 400), del)).toMatch(/\(doc as any\)\.mine !== false && \(/)
  })

  it('treats an absent `mine` as yours, so an older payload behaves as it did before', () => {
    /* `!== false` rather than `=== true`: the field is omitted when the column was not selected,
       and hiding every control on an unfamiliar payload would be a worse failure than showing one. */
    expect(SRC).not.toMatch(/\(doc as any\)\.mine === true/)
    expect([...SRC.matchAll(/\(doc as any\)\.mine !== false/g)]).toHaveLength(2)
  })
})
