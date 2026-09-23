import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * A CONTROL THAT REFUSES SAYS WHY IT REFUSED - AND THE THREE THAT DID ARE GONE.
 *
 * This file held the reasons under three write boxes on the Context page: a running log, a note
 * everybody reads, and a private steer. Each button greyed out on an empty field, and each said what
 * would happen after it rather than "type something", because the three differed in the one way that
 * mattered: who ends up reading the thing.
 *
 * All three boxes were removed on 22 September 2026. Hafsah: "that section needs to go since you can
 * all do everything from the context chat." The reasons went with the buttons, which is the correct
 * outcome and not a regression - so this file now holds the state that replaced them, because a
 * deleted guard is how a page quietly grows its forms back.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CODE = readFileSync(path.join(__dirname, '../../components/gw/ContextPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

describe('the context page has no write boxes', () => {
  it('none of the three textareas that used to sit under it', () => {
    /* The upload control keeps its own note field; these are the three that duplicated the chat. */
    expect(CODE).not.toContain('Add a context note: changed scope')
    expect(CODE).not.toContain('Share this with everyone')
    expect(CODE).not.toContain('A private steer, never quoted')
    expect(CODE).not.toContain('addLeadContext(')
  })

  it('and the way in is the conversation, at the top of the page', () => {
    expect(CODE).toContain('<ContextChat groundId={id!} />')
    const chatAt = CODE.indexOf('<ContextChat')
    const firstBand = CODE.indexOf('What this check-in is for')
    expect(chatAt).toBeLessThan(firstBand)
  })

  it('what the record holds is changed one line at a time', () => {
    expect(CODE).toContain('changeContextLine(')
    expect(CODE).toContain('Share with the team')
    expect(CODE).toContain('Make it yours only')
    /* Retired rather than deleted - a decision that was made is not one that never existed. */
    expect(CODE).toContain('closed: true')
  })
})
