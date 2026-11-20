import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { nothingInternalReachesTheBubble as clean } from './nothing-internal-reaches-the-bubble'

/**
 * PHOTOGRAPHED IN PRODUCTION: "[[SESSION_COMPLETE]]" sitting under a reply in a chat bubble, with a
 * numbered list still carrying its markdown asterisks - "1. **Outreach:** A list of contacts...".
 *
 * Both are stripped on the server by `forHumans`, and that has been on main since August. So either
 * the deployed build predates it or a reply reached the screen without passing through it, and I
 * could not tell which from here. That uncertainty is the reason for a second strip at the last
 * place before a reader's eyes: a person seeing the product's internal machinery stops trusting
 * everything else on the screen.
 */
describe('nothing internal reaches the bubble', () => {
  it('removes the close marker, which is the one that was seen', () => {
    expect(clean('Anything else?\n\n[[SESSION_COMPLETE]]')).toBe('Anything else?')
  })

  it('removes a control marker it has never seen before', () => {
    /* The list on the server grows. A net that only catches today's markers is not a net. */
    expect(clean('Done. [[SOME_NEW_SIGNAL]]')).toBe('Done.')
  })

  it('unwraps markdown the bubble cannot render', () => {
    expect(clean('1. **Outreach:** A list of contacts')).toBe('1. Outreach: A list of contacts')
    expect(clean('## Heading\nbody')).toBe('Heading\nbody')
  })

  it('leaves ordinary punctuation and arithmetic alone', () => {
    /* A stray asterisk is not markdown, and a reply about a 3 * 4 grid must survive intact. */
    expect(clean('The grid is 3 * 4 and the total is $400,000.')).toBe('The grid is 3 * 4 and the total is $400,000.')
  })

  it('keeps paragraph breaks, which a long reply depends on', () => {
    expect(clean('One.\n\nTwo.')).toBe('One.\n\nTwo.')
  })

  it('is harmless on a reply that was already clean', () => {
    const said = 'What was agreed that this is falling short of?'
    expect(clean(said)).toBe(said)
  })
})

describe('and it is applied wherever a reply is drawn', () => {
  /*
   * The point of a last line of defence is that it is on every door. One bubble left unwrapped is
   * the bubble the next marker appears in.
   */
  const surfaces = [
    'pages/enter/EntryChatPage.tsx',
    'pages/chat/ChatPage.tsx',
    'components/gw/ContextChat.tsx',
    'components/gw/MyCheckInSessions.tsx', /* where GroundChat's Message now lives; GroundChat.tsx itself was deleted on 15 November 2026 */
  ]

  for (const file of surfaces) {
    it(`is used in ${file}`, () => {
      const src = readFileSync(join(__dirname, '..', file), 'utf8')
      expect(src).toContain('nothingInternalReachesTheBubble(')
    })
  }
})
