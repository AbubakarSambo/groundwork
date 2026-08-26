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
    expect(code).toMatch(/once everyone has opened the report/)
  })

  it('the check-in page too', () => {
    const code = strip(readFileSync(join(__dirname, '../../pages/chat/ChatPage.tsx'), 'utf8'))
    expect(code).toMatch(/private until everyone activates the report/)
  })

  it('the entry flow, where the same sentence appeared a fourth time', () => {
    const code = strip(readFileSync(join(__dirname, '../../pages/enter/EntryChatPage.tsx'), 'utf8'))
    expect(code).toMatch(/once everyone else checks in too/)
    expect(code).toMatch(/everyone receives the shared report at the same time/)
  })
})
