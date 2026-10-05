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

  it('carries no privacy claims at all, since 10 Sep 2026', () => {
    /* The guide is how to run one. The four claims stay folded on the invite page for whoever asks. */
    expect(GUIDE).not.toContain('WHAT_HAPPENS_TO_WHAT_YOU_WRITE')
    expect(GUIDE).not.toMatch(/What happens to what people write/)
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
    /* The wording changed on 5 October (walkthrough pass 2, item 1): "Never anybody's check-in
       itself" was a clipped fragment with no subject, against the plain-full-sentences rule. It
       now reads as a full sentence, saying the same thing. */
    expect(own).toContain('What an admin can see')
    expect(own).toContain('An admin never sees anybody\'s check-in')
    expect(own).toContain('approving that it happens, not reading what is said in it')
  })
})
