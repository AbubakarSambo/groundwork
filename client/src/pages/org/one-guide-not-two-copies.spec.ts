import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PAGE AN ADMIN SENDS THEIR LEADS.
 *
 * "Train them on this tool" - the step between 160 accounts and 160 people who use them. The only
 * teaching material was four tabs behind a question mark inside the app, which cannot be forwarded
 * to somebody who has not signed in yet.
 *
 * The thing worth guarding is not that the page exists. It is that neither half of it is a copy.
 */
const GUIDE = readFileSync(join(__dirname, 'LeadsGuidePage.tsx'), 'utf8')
const MODAL = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'HelpModal.tsx'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ')

describe('nothing here is written twice', () => {
  it('reads the steps from the same place the help modal reads them', () => {
    /* Copied, these disagree within a month - and the version being disagreed about is the one an
       admin used to brief their company. */
    expect(GUIDE).toContain("import { HOW_TO_STEPS } from '@/components/gw/how-a-check-in-is-run'")
    expect(MODAL).toContain("import { HOW_TO_STEPS } from './how-a-check-in-is-run'")
  })

  it('reads the privacy claims from the same place the check-in screen reads them', () => {
    expect(GUIDE).toContain("import { WHAT_HAPPENS_TO_WHAT_YOU_WRITE } from '@/components/gw/what-happens-to-what-you-write'")
  })

  it('does not restate a single claim in its own words', () => {
    /* One paraphrased privacy promise is a promise the product does not make. */
    const body = strip(GUIDE)
    for (const phrase of ['Not your manager', 'trains a model', 'stored on our servers']) {
      expect(body).not.toContain(phrase)
    }
  })
})

describe('what only this page can answer', () => {
  it('says what an admin can see, which neither module covers', () => {
    /* The first question anybody asks their manager after being invited. It is about the admin's
       position rather than the product's, so it lives here and nowhere else. */
    const own = strip(GUIDE)
    expect(own).toContain('What an admin can see')
    expect(own).toContain('Never anybody\'s check-in itself')
    expect(own).toContain('approving that it happens, not reading it')
  })
})
