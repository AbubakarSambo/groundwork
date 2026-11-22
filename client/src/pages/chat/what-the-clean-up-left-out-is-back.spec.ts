import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/** The prototype's actions the product did not have (audit of 26 October 2026): "That's right" after a photo is read, and "×" on someone added in setup. */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const chat = strip(readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8'))
const entry = strip(readFileSync(join(__dirname, '..', 'enter', 'EntryChatPage.tsx'), 'utf8'))
describe('what the clean-up left out is back', () => {
  it('after a document or photo is read: "That’s right" beside "Not right? Correct this"', () => {
    expect(chat).toContain('That’s right</button>')
    expect(chat).toContain('Kept as it reads.')
    expect(chat).toContain('Not right? Correct this')
  })
  it('somebody added in setup can be removed before anything is sent', () => {
    /* 22 November 2026: on the setup page, one row per person with × (setup.txt). */
    expect(entry).toContain('aria-label={`Take ${name || head} off`}')
    expect(entry).toContain('setInviteAdded((prev) => prev.filter((x) => x !== e))')
  })
})
