import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Doc-upload guard (#2, upload half). Participants run the real engine
 * ChatPage (single-path routing, #82/#83), so they get its document-upload
 * path - the same one with Gemini assessment, not a parallel implementation.
 * This locks that the upload control and the assessment upload call are present
 * in ChatPage; removing them would strip upload from the participant check-in.
 * Routing of participants INTO ChatPage is guarded separately by
 * InvitePage.onePath.spec.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'ChatPage.tsx'),
  'utf8',
)

describe('#2 participant doc upload: the real engine exposes the upload path', () => {
  it('renders a document file input in the check-in', () => {
    expect(src).toMatch(/id="doc-upload"/)
    expect(src).toMatch(/type="file"/)
    // accepts real document types, not just images
    expect(src).toMatch(/\.pdf,\.doc/)
  })

  it('uploads through the engine document path with assessment', () => {
    expect(src).toMatch(/documentsApi\.upload\(/)
    // the assessment result is surfaced (not a silent store)
    expect(src).toMatch(/DocumentAssessment|docAssessment/)
  })
})
