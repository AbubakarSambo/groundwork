import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * THE OPEN LINK'S OWN SCREEN, read on a phone on 23 September 2026 with a hundred people about to
 * be pointed at it. Three things were wrong and each one was invisible in the code:
 *
 *  - it promised "nobody sees what you write", one line above a box whose contents the organiser
 *    reads and whose substance goes back out to everybody in a shared report;
 *  - it asked for a name and an address and never for an organisation, on a check-in sent across a
 *    network of a hundred DIFFERENT organisations, which is the unit the whole report is about;
 *  - when the start failed it set `problem` and then rendered `problem` only on the address screen,
 *    so the Start button simply reset and the person was told nothing at all.
 */
const SRC = readFileSync(join(__dirname, 'AnswerFirstPage.tsx'), 'utf8')
const CODE = SRC.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

describe('what the page promises before somebody types', () => {
  it('no longer says nobody sees it', () => {
    expect(CODE).not.toMatch(/nobody sees what you write/)
  })

  it('and says who does', () => {
    expect(CODE).toMatch(/reads\s*\n?\s*what you write, and it goes into one report for everybody/)
  })
})

describe('what it collects at the end', () => {
  it('asks for the organisation as well as the name and the address', () => {
    expect(CODE).toMatch(/id="open-org"/)
    expect(CODE).toMatch(/id="open-email"/)
    expect(CODE).toMatch(/id="open-name"/)
  })

  /* Somebody who does not want the report still names the organisation their answer is about -
     that half of the record is the lead's, not a condition of being mailed something. */
  it('and asks for it on the other path too', () => {
    expect(CODE).toMatch(/id="open-org-2"/)
  })

  it('and sends it', () => {
    expect(CODE).toMatch(/openLinkApi\.finish\(key,[\s\S]{0,160}?org\.trim\(\) \|\| undefined\)/)
  })
})

describe('when a hundred people start at once', () => {
  it('says so, in words somebody can act on', () => {
    expect(CODE).toMatch(/status === 429/)
    expect(CODE).toMatch(/A lot of people are starting at the same time/)
    expect(CODE).toMatch(/nothing is lost/)
  })

  /* The half that was actually broken: the message existed and had nowhere to render. */
  it('and renders the reason on the screen the button is on', () => {
    const reading = CODE.slice(CODE.indexOf("{phase === 'reading' &&"), CODE.indexOf("{(phase === 'talking'"))
    expect(reading).toMatch(/\{problem && \(/)
    expect(reading).toMatch(/role="alert"/)
  })
})
