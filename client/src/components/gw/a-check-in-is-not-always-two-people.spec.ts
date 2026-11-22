import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A CHECK-IN WITH THREE PEOPLE WAS TOLD IT HAD TWO.
 *
 * Photographed on a live three-party check-in:
 *
 *   "The full comparison opens once you have both opened the report."
 *   "It becomes Shared once the other person checks in too."
 *   "Your words are private until you both activate the report."
 *
 * All three describe the MECHANISM, which is the same for two people and for fourteen. This is the
 * third time this product has shipped a hardcoded pair: "Both activated" was fixed on the reveal
 * row, "Party 2" was fixed there too and came back in the participant report. Fixing the strings
 * without a guard is how there came to be a third time.
 *
 * WHAT IS DELIBERATELY ALLOWED. Scenario copy describing a genuinely one-to-one situation - "someone
 * starts Monday and you want to be sure you both mean the same thing by doing well" - is about that
 * situation, not about how the product works. Those stay, which is why this checks the files that
 * describe the mechanism rather than every file in the app.
 */
const MECHANISM_FILES = [
  '../../components/gw/TheCheckInYouJustFinished.tsx',
  '../../components/gw/HelpModal.tsx',
  '../../pages/chat/ChatPage.tsx',
]

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

describe('nothing that describes the mechanism assumes two parties', () => {
  for (const rel of MECHANISM_FILES) {
    it(`${rel.split('/').pop()} does not say "both" or "the other person"`, () => {
      const code = strip(readFileSync(join(__dirname, rel), 'utf8'))
      expect(code).not.toMatch(/you both/i)
      expect(code).not.toMatch(/you have both/i)
      expect(code).not.toMatch(/the other person checks in/i)
    })
  }

  it('and the report card says everyone, which is true at any size', () => {
    const code = strip(readFileSync(join(__dirname, '../../components/gw/TheCheckInYouJustFinished.tsx'), 'utf8'))
    expect(code).toMatch(/The team’s report is shared\./)
    /*
     * "once everyone has opened the report" went with the sentence around it, which said "You can
     * still only see your own" on a card that was at that moment displaying a cross reference of
     * what everybody had said. What this file protects is that the wording holds at any number of
     * people, and the replacement does: "everyone in this round has answered".
     */
    /* The sentence changed again when the card became A · session: it no longer describes the
       state of the comparison, because it no longer shows one. What it says instead is whose half
       this is and when the other one opens - and that also holds at two people and at twelve. */
    /* Changed 15 November 2026: the line is the team's-report one ("The team’s report is not shared yet."), true at any size too. */
    expect(code).toMatch(/The team’s report is not shared yet\./)
    expect(code).not.toMatch(/only see your own/)
  })

  it('the check-in page too', () => {
    const code = strip(readFileSync(join(__dirname, '../../pages/chat/ChatPage.tsx'), 'utf8'))
    /*
     * 10 Sep 2026: the privacy line went altogether; the strip named the session and nothing else.
     *
     * U.8 REVIEW: for an ordinary session the strip now names nothing at all - the prototype never
     * prints a lone session number there either (docs/prototype/screens/B3-the-check-in/*.txt), so
     * `privacyLabel` is `null` and the spot is empty rather than "Session 3". Nothing here says
     * "both" or assumes two people either way, which is the rule this file guards; for the two
     * cases that DO still say something about the session (closing one, correcting one), each
     * names only the session number, never a party count.
     */
    expect(code).not.toMatch(/`Session \$\{sessionNumber\}`/)
    /* Changed 3 November evening: the page no longer says anything about the session itself (no line under the header or above the
       box); a closing or correcting session is named by the engine's first message. So nothing here can assume two parties. */
    expect(code).not.toMatch(/[Cc]losing session \$\{sessionNumber\}|[Cc]orrecting session \$\{correctingSession\}/)
    expect(code).not.toMatch(/Private until/)
  })

  it('the entry flow, where the same sentence appeared a fourth time', () => {
    /* The sentence sits on the report screen, which is its own component now so that a session
       opened later renders exactly what its owner read at the end of it. */
    const report = strip(readFileSync(join(__dirname, 'TheReportYouSawAtTheEnd.tsx'), 'utf8'))
    /* The ladder that carried this sentence is gone; what remains must not speak of 'the other party'. */
    expect(report).not.toMatch(/the other (party|person|side)/i)
    const page = strip(readFileSync(join(__dirname, '../../pages/enter/EntryChatPage.tsx'), 'utf8'))
    /* 22 November 2026: the save card's sentence is gone; the entry page still never speaks of "the other party". */
    expect(page).not.toMatch(/the other (party|person|side)/i)
  })
})
