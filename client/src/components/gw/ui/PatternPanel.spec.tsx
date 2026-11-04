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

function panel(p: any, name?: string, leadFirstName?: string | null) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PatternPanel pattern={p} invalidateKey={['x']} name={name} leadFirstName={leadFirstName} />
    </QueryClientProvider>,
  )
}

describe('a pattern reads in full sentences', () => {
  it('the lead reads whose words they are, and the next step, with no colons', () => {
    panel(PATTERN, 'Amani Wekesa')
    expect(screen.getByText('Amani Wekesa said this about it.')).toBeTruthy()
    expect(screen.getByText('“I asked every shop for the form.”')).toBeTruthy()
    /* (2 November 2026: askThem is layer 3's next step for the lead now, a step or Groundwork's question, so it is titled as the step.) */
    expect(screen.getByText('Here is the next step.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Ask them:|In their own words:|In your own words:/)
  })

  it('the person reads their own words as theirs', () => {
    expect(theWordsLine(true)).toBe('You said this about it.')
    expect(theWordsLine(false, '  ')).toBe('They said this about it.')
  })

  /* (2 November 2026, F2: the coaching lines and the second-read note left the served shape; the lead reads layer 2's next step in
     askThem instead, so those tests went with them.) */
  it('reads whether talked through, and the lead’s own mark, when the server sends them', () => {
    panel({
      ...PATTERN,
      talkedAbout: true,
      leadMark: 'RIGHT',
    }, 'Amani Wekesa')
    expect(screen.getByText('This has been talked through with Amani Wekesa.')).toBeTruthy()
    expect(screen.getByText('You said this was right, once you talked it through.')).toBeTruthy()
  })

  it('the person it is about reads that their lead talked it through, in their own words, never the mark', () => {
    panel({ ...PATTERN, yours: true, talkedAbout: true, leadMark: null }, undefined)
    expect(screen.getByText('Your lead has said they talked this through with you.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/once you talked it through/)
  })

  /*
   * BOARD REVIEW, 1 OCTOBER, ITEM 4: "YOUR LEAD" BY NAME, WHEN THE NAME IS KNOWN.
   * The board already knows who runs the check-in (`leadFirstName`) everywhere else it needs to
   * say so; this is the one place that still said the bare word "lead" instead.
   */
  it('names the lead, when the lead’s first name is known', () => {
    panel({ ...PATTERN, yours: true, talkedAbout: true, leadMark: null }, undefined, 'Rukia')
    expect(screen.getByText('Rukia has said they talked this through with you.')).toBeTruthy()
    expect(screen.queryByText(/Your lead has said/)).toBeNull()
  })

  it('an empty board never says no pattern has repeated, and never hints that one is waiting', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'pages', 'board', 'BoardPage.tsx'), 'utf8')
    expect(src).not.toContain('No patterns have repeated often enough to show yet.')
    /*
     * B-138, DECISION 8: "Patterns show only after three periods, whether or not they are in a
     * row." Updated with the fix, which also corrected this sentence's claim that three IN A ROW
     * were required.
     */
    expect(src).toContain('Nothing to show here yet. A pattern appears only after the same thing comes up in three check-ins, in a row or not, and the person it is about always sees it first.')
  })
})
