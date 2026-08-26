import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { WHAT_YOU_CAN_UPLOAD, UPLOAD_ACCEPT_ATTR } from './what-you-can-upload'

/**
 * WHAT THE SCREENS SAY YOU CAN UPLOAD IS WHAT THE SERVER ACTUALLY ACCEPTS.
 *
 * There were three answers to one question - the API's, the lead's page's, and a participant's page's
 * - each correct when written and none reconciled with the others. The person holding the file pays:
 * a participant with meeting notes as a .txt read "PDF, DOCX, JPEG, PNG" and did not try.
 *
 * HEIC was missing from both screens and accepted by the API the whole time. It is what an iPhone
 * camera produces, and a photographed whiteboard is the single most likely piece of context anybody
 * has to hand.
 *
 * A CONSTANT SHARED BETWEEN TWO CLIENT PAGES DOES NOT FIX THIS. The gap that caused it runs across
 * two packages with no shared types, which is the same shape as the marketing-links tripwire: read
 * the other tree as text and fail when the two drift.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_DOCS = readFileSync(
  path.join(__dirname, '../../../api/src/modules/documents/documents.service.ts'),
  'utf8',
)

/** Each format the screens promise, against the mimetype the API must accept for it. */
const PROMISED: { label: string; mime: string }[] = [
  { label: 'PDF', mime: 'application/pdf' },
  { label: 'Word', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { label: 'Excel', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { label: 'CSV', mime: 'text/csv' },
  { label: 'JPEG', mime: 'image/jpeg' },
  { label: 'PNG', mime: 'image/png' },
  { label: 'HEIC', mime: 'image/heic' },
]

describe('what you can upload', () => {
  it('every format the screens name is one the API accepts', () => {
    const refused = PROMISED.filter(f => !API_DOCS.includes(`'${f.mime}'`)).map(f => f.label)
    expect(refused).toEqual([])
  })

  it('and the screens name each of them', () => {
    const unmentioned = PROMISED
      .filter(f => !WHAT_YOU_CAN_UPLOAD.toUpperCase().includes(f.label.toUpperCase()))
      .map(f => f.label)
    expect(unmentioned).toEqual([])
  })

  /**
   * The specific loss this started from: an iPhone photo of a whiteboard, refused by a sentence
   * rather than by the server.
   */
  it('says HEIC, which is what a phone camera produces', () => {
    expect(WHAT_YOU_CAN_UPLOAD).toContain('HEIC')
    expect(API_DOCS).toContain("'image/heic'")
  })

  /**
   * THE PICKER IS THE ONE THAT ACTUALLY STOPS PEOPLE. A sentence promising a format the file dialog
   * then greys out is worse than a wrong sentence: the file is right there and cannot be chosen.
   */
  it('the file picker allows every format the screens promise', () => {
    const missing = PROMISED
      .filter(f => {
        const ext = { PDF: '.pdf', Word: '.docx', Excel: '.xlsx', CSV: '.csv', JPEG: '.jpeg', PNG: '.png', HEIC: '.heic' }[f.label]!
        return !UPLOAD_ACCEPT_ATTR.includes(ext)
      })
      .map(f => f.label)
    expect(missing).toEqual([])
  })

  it('and both pages use it instead of their own', () => {
    for (const page of ['../pages/grounds/GroundAdminPage.tsx', '../pages/grounds/GroundParticipantPage.tsx']) {
      const src = readFileSync(path.join(__dirname, page), 'utf8')
      expect(src).toContain('accept={UPLOAD_ACCEPT_ATTR}')
      expect(src).not.toMatch(/accept="\.[a-z,.]+"/)
    }
  })

  /**
   * One constant, so a fourth answer cannot appear on a third screen.
   *
   * ASSERTED ON THE RENDER, not on the import. The first version checked the file merely CONTAINED
   * the name - and a mutation putting the old hardcoded list back on the page left it green, because
   * the now-unused import still carried the word.
   */
  it('is rendered by both pages, not merely imported', () => {
    for (const page of ['../pages/grounds/GroundAdminPage.tsx', '../pages/grounds/GroundParticipantPage.tsx']) {
      const src = readFileSync(path.join(__dirname, page), 'utf8')
      expect(src).toContain('{WHAT_YOU_CAN_UPLOAD}')
    }
  })
})
