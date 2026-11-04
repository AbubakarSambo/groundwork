import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * WHAT A DOCUMENT SUGGESTS IS SHOWN IN THE CHECK-IN, ALWAYS (26 October 2026). a0db2a191 moved the reading to after the upload is answered,
 * and the card stopped appearing with nothing failing. This holds both halves: the upload's own card when the reading came with it, and the
 * wait for it when it did not.
 */
const chat = readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
describe('the document card waits for its reading', () => {
  it('is shown at once when the reading came with the upload', () => {
    expect(chat).toContain('if (doc.assessment) {')
    expect(chat).toContain('docAssessment: { docId: doc.id, docName: doc.name, assessment: doc.assessment }')
  })
  it('is fetched and shown when the reading comes after the upload', () => {
    expect(chat).toContain('if (!doc.assessment && groundId) {')
    expect(chat).toContain('documentsApi.list(gid)')
    expect(chat).toContain('found?.assessment?.suggests?.length')
  })
  it('and the card itself is still drawn for a message that carries it', () => {
    expect(chat).toContain('m.docAssessment ? (')
    expect(chat).toContain('<AssessmentCard')
  })
})
