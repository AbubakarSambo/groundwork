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
  '../../components/gw/SessionReportCard.tsx',
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
    const code = strip(readFileSync(join(__dirname, '../../components/gw/SessionReportCard.tsx'), 'utf8'))
    expect(code).toMatch(/everyone reads the same report at the same moment/)
    /*
     * "once everyone has opened the report" went with the sentence around it, which said "You can
     * still only see your own" on a card that was at that moment displaying a cross reference of
     * what everybody had said. What this file protects is that the wording holds at any number of
     * people, and the replacement does: "everyone in this round has answered".
     */
    expect(code).toMatch(/Everyone in this round has answered/)
    expect(code).not.toMatch(/only see your own/)
  })

  it('the check-in page too', () => {
    const code = strip(readFileSync(join(__dirname, '../../pages/chat/ChatPage.tsx'), 'utf8'))
    /* Reworded 10 Sep 2026: 'activates' was a word nobody understood; the report is released. */
    expect(code).toMatch(/Private until the report is released to everyone/)
  })

  it('the entry flow, where the same sentence appeared a fourth time', () => {
    /* The sentence sits on the report screen, which is its own component now so that a session
       opened later renders exactly what its owner read at the end of it. */
    const report = strip(readFileSync(join(__dirname, 'TheReportYouSawAtTheEnd.tsx'), 'utf8'))
    /* The ladder that carried this sentence is gone; what remains must not speak of 'the other party'. */
    expect(report).not.toMatch(/the other (party|person|side)/i)
    const page = strip(readFileSync(join(__dirname, '../../pages/enter/EntryChatPage.tsx'), 'utf8'))
    expect(page).toMatch(/everyone receives the shared report at the same time/)
  })
})
