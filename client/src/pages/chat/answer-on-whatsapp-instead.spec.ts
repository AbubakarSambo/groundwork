import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/* Pilots on WhatsApp, 14 October: the check-in page offers the prototype's "Answer on WhatsApp instead" wherever WhatsApp is on. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')
describe('the check-in page offers WhatsApp in the prototype\'s words', () => {
  /* Changed 3 November evening (Hafsah: only the conversation, the box and End session): the line is no longer under the box during
     the conversation. It is on Today ("You can also check in on WhatsApp", today-says-you-can-also-check-in-on-whatsapp.spec) and at
     the end of a session, in the served words. */
  it('the conversation no longer draws it under the box; the end of a session still offers WhatsApp in the served words', () => {
    const page = strip(readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8'))
    expect(page).not.toMatch(/Answer on WhatsApp instead|ANSWER_ON_WHATSAPP_INSTEAD/)
    expect(page).toMatch(/<CheckInOnWhatsApp link=\{connectWhatsApp\.link\} label=\{connectWhatsApp\.says\} testId="check-in-on-whatsapp-next-time" \/>/)
  })
  it('and the server offers it whether or not they have written on WhatsApp before', () => {
    const conv = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'conversation', 'conversation.service.ts'), 'utf8'))
    expect(conv).toMatch(/keptInTheApp: keptOffThePhone\(g\), forTheInvitation: true \}\)/)
  })
})
