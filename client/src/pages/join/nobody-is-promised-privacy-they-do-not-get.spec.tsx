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

  /*
   * THE SECOND VERSION, IN HER WORDS. My first fix named the organiser - "Hafsah reads what you
   * write, and it goes into one report for everybody". Hafsah, 23 September 2026, replaced it: the
   * person answering does not need to be told who is reading over their shoulder, they need to know
   * the answers are pooled and that they get the result. Both sentences are honest; hers is the one
   * that also gives them a reason to spend the five minutes.
   */
  it('and says the answers are pooled and what comes back', () => {
    expect(CODE).toMatch(/The answers help everybody get a\s*\n?\s*shared picture, and you will receive the consolidated report at the end/)
  })

  /* Changed in F5: the length is the measured one, from its one owner (how-long-setup-takes.ts: a team member's check-in, median
     1.9 minutes on gw_loop_round16), as the approved journey says it (stage 6), not a figure written here. */
  it('says how long it takes from the one measured figure', () => {
    expect(CODE).toMatch(/It takes \$\{inASentence\(takes\)\}\./)
    expect(CODE).not.toMatch(/about ten minutes|about two minutes/)
  })
})

describe('what it collects at the end', () => {
  it('asks for the organisation as well as the name and the address', () => {
    expect(CODE).toMatch(/id="open-org"/)
    expect(CODE).toMatch(/id="open-email"/)
    expect(CODE).toMatch(/id="open-name"/)
  })

  /*
   * AND OF EVERYBODY, NOT ONLY OF WHOEVER WANTED THE REPORT.
   *
   * There were two paths here - "yes send it" asked for a name and an address, "no thanks" asked
   * for a name optionally - which meant the organiser's record of whose answer this is depended on
   * a question about mailing. Hafsah, 23 September 2026: "we need their email and names when they
   * checkin and put their emails." One path, three fields, all needed.
   */
  it('and asks all three of everybody, with no second path', () => {
    expect(CODE).not.toMatch(/id="open-org-2"/)
    expect(CODE).not.toMatch(/Do you want the report\?/)
    expect(CODE).toMatch(/disabled=\{busy \|\| !email\.trim\(\) \|\| !name\.trim\(\) \|\| !org\.trim\(\)\}/)
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
