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

describe('the check-in page offers "Finish my check-in now" on that count', () => {
  it('reads answersTheServerKept, not every message on screen', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const source = readFileSync(resolve(__dirname, '../pages/chat/ChatPage.tsx'), 'utf8')
    expect(source).toContain('answersTheServerKept(msgs) >= mayCompleteAfter')
  })
})
