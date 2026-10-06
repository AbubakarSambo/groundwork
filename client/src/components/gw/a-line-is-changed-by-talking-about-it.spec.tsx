import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * EVERY ROW OF THE RECORD HANDS ITSELF TO THE CONVERSATION.
 *
 * Hafsah, 22 September 2026: "you can all do everything from the context chat" - so the three write
 * boxes went. That only works if a row a lead disagrees with can reach the conversation without them
 * having to retype it: "Change this" fills the box with the sentence and they finish it.
 */
const PAGE = readFileSync(join(__dirname, 'ContextPage.tsx'), 'utf8')
const CHAT = readFileSync(join(__dirname, 'ContextChat.tsx'), 'utf8')

describe('a line is changed by talking about it', () => {
  it('the page hands the line over and scrolls to where it landed', () => {
    expect(PAGE).toContain("new CustomEvent('gw:context-chat:say', { detail: said })")
    expect(PAGE).toContain("scrollToId('gw-context-chat')")
    /* Both kinds of row: a target and a line of a bucket. */
    expect(PAGE).toContain('changeThisInTheChat(`Change the target "${o.name}" to `)')
    expect(PAGE).toContain('changeThisInTheChat(`Change the line "${l.text}" to `)')
  })

  it('the chat takes it, opens, and puts the caret after it', () => {
    expect(CHAT).toContain("window.addEventListener('gw:context-chat:say', listen)")
    expect(CHAT).toContain('setOpen(true)')
    expect(CHAT).toContain('setSelectionRange(box.value.length, box.value.length)')
    /* And it removes the listener, because this panel closes and reopens with the tab. */
    expect(CHAT).toContain("window.removeEventListener('gw:context-chat:say', listen)")
  })

  it('and a target whose definition is unsettled says so beside the number', () => {
    expect(readFileSync(join(__dirname, 'TargetsBand.tsx'), 'utf8')).toContain('{t.notSettled}')
  })
})
