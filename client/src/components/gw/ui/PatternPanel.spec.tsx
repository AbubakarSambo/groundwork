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

  /**
   * REQUEST 82 AND DECISION 67: COACHING BESIDE A PATTERN, FOR WHOEVER RUNS THE CHECK-IN ONLY.
   * `coachTowards` and `oneStep` are null for the person it is about (api/src/modules/patterns/
   * who-reads-a-pattern.ts), so the panel draws them only when the server actually sends them -
   * there is no separate "am I the lead" check here, the presence of the fields already decides it.
   */
  it('whoever runs the check-in reads the coaching and the one step, in plain sentences', () => {
    panel({
      ...PATTERN,
      coachTowards: 'Coach them towards naming what the team itself can change when something goes wrong.',
      oneStep: 'One step they could take this week is to name one thing in the team’s own hands the next time a problem comes up.',
    }, 'Amani Wekesa')
    expect(screen.getByText('Coach them towards naming what the team itself can change when something goes wrong.')).toBeTruthy()
    expect(screen.getByText('One step they could take this week is to name one thing in the team’s own hands the next time a problem comes up.')).toBeTruthy()
  })

  it('the person it is about reads neither, because the server sends them null', () => {
    panel({ ...PATTERN, coachTowards: null, oneStep: null, yours: true }, undefined)
    expect(screen.queryByText(/Coach them towards/)).toBeNull()
    expect(screen.queryByText(/One step they could take/)).toBeNull()
  })

  it('reads the second-read note, whether talked through, and the lead’s own mark, when the server sends them', () => {
    panel({
      ...PATTERN,
      secondReadNote: 'Two separate reads of the record found this.',
      talkedAbout: true,
      leadMark: 'RIGHT',
    }, 'Amani Wekesa')
    expect(screen.getByText('Two separate reads of the record found this.')).toBeTruthy()
    expect(screen.getByText('This has been talked through with Amani Wekesa.')).toBeTruthy()
    expect(screen.getByText('You said this was right, once you talked it through.')).toBeTruthy()
  })

  it('the person it is about reads that their lead talked it through, in their own words, never the mark', () => {
    panel({ ...PATTERN, yours: true, talkedAbout: true, leadMark: null, secondReadNote: null }, undefined)
    expect(screen.getByText('Your lead has said they talked this through with you.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/once you talked it through/)
  })

  /*
   * BOARD REVIEW, 1 OCTOBER, ITEM 4: "YOUR LEAD" BY NAME, WHEN THE NAME IS KNOWN.
   * The board already knows who runs the check-in (`leadFirstName`) everywhere else it needs to
   * say so; this is the one place that still said the bare word "lead" instead.
   */
  it('names the lead, when the lead’s first name is known', () => {
    panel({ ...PATTERN, yours: true, talkedAbout: true, leadMark: null, secondReadNote: null }, undefined, 'Rukia')
    expect(screen.getByText('Rukia has said they talked this through with you.')).toBeTruthy()
    expect(screen.queryByText(/Your lead has said/)).toBeNull()
  })

  it('an empty board never says no pattern has repeated, and never hints that one is waiting', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'pages', 'board', 'BoardPage.tsx'), 'utf8')
    expect(src).not.toContain('No patterns have repeated often enough to show yet.')
    expect(src).toContain('Nothing to show here yet. A pattern appears only after three check-ins in a row, and the person it is about always sees it first.')
  })
})
