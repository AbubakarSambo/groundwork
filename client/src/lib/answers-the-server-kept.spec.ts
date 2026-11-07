import { describe, it, expect } from 'vitest'
import { answersTheServerKept } from './answers-the-server-kept'

describe('the finish offer counts only the answers the server kept', () => {
  it('does not count "finish" typed on its own, so four answers and two finishes are four', () => {
    const msgs = [
      { id: 't1', role: 'PERSON', content: 'The weekly stock count at the Nairobi depot.' },
      { id: 't2', role: 'PERSON', content: 'Just counted them.' },
      { id: 't3', role: 'PERSON', content: 'Probably sales numbers.' },
      { id: 't4', role: 'PERSON', content: 'finish' },
      { id: 't5', role: 'PERSON', content: 'He will probably ask why.' },
      { id: 't6', role: 'PERSON', content: 'Finish.' },
      { id: 'a1', role: 'AI', content: 'What else?' },
      { id: 'local-1', role: 'PERSON', content: 'not landed' },
    ]
    expect(answersTheServerKept(msgs)).toBe(4)
  })
})

describe('the check-in page no longer offers a manual "Finish my check-in now"', () => {
  /* REMOVED (26 October, "Check-ins end properly", d43a2de78): the check-in ends itself, so the page no longer draws a
     button gated on this count. What must not come back is the gate reading every message on screen. */
  it('does not gate anything on every message on screen', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const source = readFileSync(resolve(__dirname, '../pages/chat/ChatPage.tsx'), 'utf8')
    expect(source).not.toContain('Finish my check-in now</')
    expect(source).not.toMatch(/msgs\.filter\([^)]*PERSON[^)]*\)\.length\s*>=\s*mayCompleteAfter/)
  })
})
