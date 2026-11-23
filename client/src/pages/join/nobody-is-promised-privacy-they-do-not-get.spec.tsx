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
   * CHANGED 15 NOVEMBER 2026 (Hafsah, audit of the check-in pages, row 18): the paragraph under the question, "The answers help
   * everybody get a shared picture, and you will receive the consolidated report at the end", is cut to one sentence about what
   * comes back. "Shared picture" and "consolidated" are not words anybody says, and the Start button before the box is gone.
   */
  it('says only what comes back, in plain words', () => {
    expect(CODE).toMatch(/You will get the report at the end\./)
    expect(CODE).not.toMatch(/shared picture|consolidated/)
  })

  /* Changed in F5: the length is the measured one, from its one owner (how-long-setup-takes.ts: a team member's check-in, median
     1.9 minutes on gw_loop_round16), as the approved journey says it (stage 6), not a figure written here. */
  it('says how long it takes from the one measured figure', () => {
    expect(CODE).toMatch(/It takes \$\{inASentence\(takes\)\}\./)
    expect(CODE).not.toMatch(/about ten minutes|about two minutes/)
  })
})

/*
 * CHANGED 15 NOVEMBER 2026 (Hafsah, audit row 20): the three things are still all asked of everybody, with no second path (her decision
 * of 23 September), but one at a time in the chat as Groundwork's own lines, not as a form. The behaviour is pinned in
 * AnswerFirstPage.inTheChat.spec.tsx; what stays here is that they are still sent together.
 */
describe('what it collects at the end', () => {
  it('asks for the organisation as well as the name and the address, with no second path', () => {
    expect(CODE).toMatch(/org: 'And which organisation are you with\?'/)
    expect(CODE).toMatch(/email: 'Where should I send the report\?'/)
    expect(CODE).toMatch(/name: 'Last thing\. What is your name\?'/)
    expect(CODE).not.toMatch(/id="open-org-2"/)
    expect(CODE).not.toMatch(/Do you want the report\?/)
  })

  it('and sends all three', () => {
    expect(CODE).toMatch(/openLinkApi\.finish\(key, email\.trim\(\), name\.trim\(\) \|\| undefined, true, org\.trim\(\) \|\| undefined\)/)
  })
})

describe('when a hundred people start at once', () => {
  it('says so, in words somebody can act on', () => {
    expect(CODE).toMatch(/status === 429/)
    expect(CODE).toMatch(/A lot of people are starting at the same time/)
    expect(CODE).toMatch(/Nothing is lost/)
  })

  /* The half that was actually broken: the message existed and had nowhere to render. */
  it('and renders the reason on the screen the button is on', () => {
    /* Changed 23 November 2026 (journey 2): the reading phase's lines now end where the page turns to "done" or the conversation. */
    const reading = CODE.slice(CODE.indexOf("{phase === 'reading' &&"), CODE.indexOf("{phase === 'done' ?"))
    expect(reading).toMatch(/\{problem && \(/)
    expect(reading).toMatch(/role="alert"/)
  })
})
