import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ANSWER_ON_WHATSAPP_INSTEAD } from '@/lib/answer-on-whatsapp-instead'

/* Pilots on WhatsApp, 14 October: the check-in page offers the prototype's "Answer on WhatsApp instead" wherever WhatsApp is on. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')
describe('the check-in page offers WhatsApp in the prototype\'s words', () => {
  it('says "Answer on WhatsApp instead", as the prototype\'s check-in does', () => {
    expect(ANSWER_ON_WHATSAPP_INSTEAD).toBe('Answer on WhatsApp instead')
    const page = strip(readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8'))
    expect(page).toMatch(/data-testid="answer-on-whatsapp"[\s\S]{0,40}>\s*\{ANSWER_ON_WHATSAPP_INSTEAD\}/)
  })
  it('and the server offers it whether or not they have written on WhatsApp before', () => {
    const conv = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'conversation', 'conversation.service.ts'), 'utf8'))
    expect(conv).toMatch(/keptInTheApp: keptOffThePhone\(g\), forTheInvitation: true \}\)/)
  })
})
