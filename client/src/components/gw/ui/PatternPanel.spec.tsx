import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PatternPanel, theWordsLine } from './PatternPanel'

/**
 * Found by the live test on 29 September: the panel joined labels to text with colons ("Ask
 * them: …", "In their own words: …"), and before the person had had their turn the lead's board said
 * "No patterns have repeated often enough to show yet." when one had. Each is now a full sentence,
 * and the empty board says nothing untrue and nothing that tells the lead a pattern exists.
 */
const PATTERN = {
  id: 'p1', participantId: 'p-amani', heading: 'Delivers what was agreed, with proof',
  whatHappened: 'Each shop came with the signed form.', howOften: 'This came up in 3 check-ins.',
  whoSeesIt: 'Amani saw this first and said what is behind it.',
  theirWords: 'I asked every shop for the form.', canAnswer: false,
  askThem: 'What did they set out to do this period?', yours: false,
}

function panel(p: any, name?: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PatternPanel pattern={p} invalidateKey={['x']} name={name} />
    </QueryClientProvider>,
  )
}

describe('a pattern reads in full sentences', () => {
  it('the lead reads whose words they are, and a question to ask, with no colons', () => {
    panel(PATTERN, 'Amani Wekesa')
    expect(screen.getByText('Amani Wekesa said this about it.')).toBeTruthy()
    expect(screen.getByText('“I asked every shop for the form.”')).toBeTruthy()
    expect(screen.getByText('A question you could ask Amani Wekesa, to hear their side.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Ask them:|In their own words:|In your own words:/)
  })

  it('the person reads their own words as theirs', () => {
    expect(theWordsLine(true)).toBe('You said this about it.')
    expect(theWordsLine(false, '  ')).toBe('They said this about it.')
  })

  it('an empty board never says no pattern has repeated, and never hints that one is waiting', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'pages', 'board', 'BoardPage.tsx'), 'utf8')
    expect(src).not.toContain('No patterns have repeated often enough to show yet.')
    expect(src).toContain('Nothing to show here yet. A pattern appears only after three check-ins in a row, and the person it is about always sees it first.')
  })
})
