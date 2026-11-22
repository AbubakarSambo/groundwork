import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE TWO WAYS OUT OF THE ENTRY CHAT ASK THE SAME QUESTIONS.
 *
 * There are two: an emailed link, and Google. Google skips the email round trip because the address
 * is already verified, which is right - but it also skipped the organisation's name, because that
 * field only existed on the panel shown while somebody waits for the email. A person who signed up
 * with Google left as "Ada's Workspace" and was never offered anything else.
 *
 * The Google callback deliberately does not stop to ask afterwards, on the grounds that
 * interrupting between "signed in" and "here is your check-in" is the worst moment for a question
 * already offered. That reasoning is right; the question just had not been offered. So it is asked
 * one step earlier, where both doors pass.
 */
const PAGE = readFileSync(join(__dirname, 'EntryChatPage.tsx'), 'utf8')
const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

/*
 * CHANGED 22 NOVEMBER 2026 (Hafsah, the setup flow): somebody not signed in reads start-chat.txt's one block where the panel ends, an
 * email and "Save it", and nothing else. The Google button and the organisation's name went with the save card, so there is one door
 * from setup and nothing is asked twice; the organisation is named when the link is opened, as for any new sign-up.
 */
describe('one door out of setup, asking each thing once', () => {
  it('asks for the email once, on the one form that saves', () => {
    expect(code.match(/placeholder="you@company\.com"/g) ?? []).toHaveLength(1)
    expect(code).toMatch(/<form noValidate onSubmit=\{\(e\) => \{ e\.preventDefault\(\); handleSave\(\) \}\}>/)
  })

  it('asks no organisation name and offers no second door', () => {
    expect(code).not.toMatch(/Organisation name \(optional\)/)
    expect(code).not.toMatch(/Continue with Google/)
  })
})
