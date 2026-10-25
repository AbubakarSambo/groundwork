import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Button, Tag, NeedsYouRow, NeedsYouList } from './kit'

/**
 * A1, LOOK AND LAYOUT: THE CONTROLS AND THE "WHAT NEEDS YOU" ROW, AS A PERSON READS THEM.
 *
 * The wording in these tests is copied from the design system's screen,
 * docs/prototype/screens/A1-look-and-layout/design-system.txt, so what is checked is what the
 * prototype shows a person, drawn by the parts every page will use.
 */
const CSS = readFileSync(join(__dirname, '../../index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

describe('Button', () => {
  it('draws the three kinds the design system shows, each saying what happens', () => {
    render(
      <div>
        <Button>Start your check-in</Button>
        <Button kind="secondary">Read it</Button>
        <Button kind="quiet">Not now</Button>
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Start your check-in' })).toHaveClass('gw-b', 'gw-b-primary')
    expect(screen.getByRole('button', { name: 'Read it' })).toHaveClass('gw-b-secondary')
    expect(screen.getByRole('button', { name: 'Not now' })).toHaveClass('gw-b-quiet')
  })

  it('is a real button that does not submit a form by accident, and presses', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Start it</Button>)
    const b = screen.getByRole('button', { name: 'Start it' })
    expect(b).toHaveAttribute('type', 'button')
    fireEvent.click(b)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('with somewhere to go, it is a link drawn the same way', () => {
    render(<MemoryRouter><Button kind="secondary" to="/grounds/1/report">Read it</Button></MemoryRouter>)
    const a = screen.getByRole('link', { name: 'Read it' })
    expect(a).toHaveAttribute('href', '/grounds/1/report')
    expect(a).toHaveClass('gw-b', 'gw-b-secondary')
  })

  it('a disabled one cannot be pressed, even when it would have been a link', () => {
    render(<MemoryRouter><Button to="/x" disabled>Start it</Button></MemoryRouter>)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('button', { name: 'Start it' })).toBeDisabled()
  })

  // UPDATED 20 October (the kit's design everywhere): a tap target on a phone is 44px, the small
  // button included. It was 40px; only the size changed, nothing a person reads.
  it('is at least a thumb tall, and 44px on a phone even when small', () => {
    expect(CSS).toMatch(/\.gw-b \{[^}]*min-height: 44px/)
    expect(CSS).toMatch(/\.gw-b-small \{ min-height: 44px; \}/)
    // and that 44px rule is the phone one, not a second desktop size
    expect(CSS.indexOf('.gw-b-small { min-height: 44px; }')).toBeGreaterThan(CSS.lastIndexOf('@media (max-width: 640px)', CSS.indexOf('.gw-b-small { min-height: 44px; }')))
  })

  it('wraps a long label on a phone instead of pushing the page sideways', () => {
    expect(CSS).toMatch(/@media \(max-width: 640px\) \{[^}]*\.gw-b \{ white-space: normal; \}/)
  })
})

describe('Tag', () => {
  it('draws the five tags the design system shows, each tone with its own meaning', () => {
    render(
      <div>
        <Tag tone="proven">Proven</Tag>
        <Tag tone="attention">Cooling</Tag>
        <Tag tone="action">Your turn</Tag>
        <Tag tone="concern">Blocked 4 days</Tag>
        <Tag>Only you see this</Tag>
      </div>,
    )
    expect(screen.getByText('Proven')).toHaveClass('gw-tag', 'gw-tag-proven')
    expect(screen.getByText('Cooling')).toHaveClass('gw-tag-attention')
    expect(screen.getByText('Your turn')).toHaveClass('gw-tag-action')
    expect(screen.getByText('Blocked 4 days')).toHaveClass('gw-tag-concern')
    expect(screen.getByText('Only you see this')).toHaveClass('gw-tag-plain')
  })

  it('every tone has a style, and none is smaller than 13', () => {
    for (const t of ['proven', 'attention', 'action', 'concern', 'plain']) expect(CSS).toContain(`.gw-tag-${t}`)
    expect(CSS).toMatch(/\.gw-tag \{[^}]*font-size: 14px/)
  })
})

describe('the "What needs you" row', () => {
  const rows = () => render(
    <NeedsYouList label="What needs you">
      <NeedsYouRow kind="ready" title="Today’s report is ready" detail="3 deals moved stage. Kito Foods is cooling."
        actions={<Button kind="secondary">Read it</Button>} />
      <NeedsYouRow kind="decide" title="Decide whether a price range counts as a budget"
        detail="Brian and Miriam both raised it. It changes 4 deals."
        actions={<Button kind="secondary">Decide</Button>} />
      <NeedsYouRow kind="look" title="Samuel has chased the same 5 leads for 3 check-ins"
        detail="Talk to them before Friday." actions={<Button kind="secondary">Open</Button>} />
    </NeedsYouList>,
  )

  it('reads as the design system shows it: what, why, and a button that says what happens', () => {
    rows()
    const list = screen.getByRole('list', { name: 'What needs you' })
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(list).toHaveTextContent('Today’s report is ready')
    expect(list).toHaveTextContent('3 deals moved stage. Kito Foods is cooling.')
    expect(screen.getByRole('button', { name: 'Read it' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  /*
   * SECOND BOARD REVIEW, WORDING: "A decision for you." and "Something to look at." were a label
   * stapled in front of the row's own title for a screen reader, saying nothing the title itself
   * did not already say in full ("Decide whether a price range counts as a budget", "Samuel has
   * chased the same 5 leads for 3 check-ins" are each already a complete sentence). "Ready to
   * read." is kept - it names a state ("this report is simply ready") the title does not
   * otherwise carry. Updated here, not deleted: the coloured edge, its CSS and "ready"'s own words
   * for a screen reader are all still checked.
   */
  it('the coloured edge is a real colour for every kind, and "ready" also says so in words for a screen reader', () => {
    rows()
    const [ready, decide, look] = screen.getAllByRole('listitem')
    expect(ready).toHaveClass('gw-need-ready')
    expect(decide).toHaveClass('gw-need-decide')
    expect(look).toHaveClass('gw-need-look')
    expect(ready).toHaveTextContent('Ready to read.')
    expect(decide).not.toHaveTextContent('A decision for you.')
    expect(look).not.toHaveTextContent('Something to look at.')
    for (const k of ['ready', 'decide', 'look']) expect(CSS).toMatch(new RegExp(`\\.gw-need-${k}\\s+\\.gw-need-edge \\{ background: var\\(--gw-`))
  })

  it('on a phone the button drops under the words instead of squeezing them', () => {
    expect(CSS).toMatch(/@media \(max-width: 640px\) \{[^}]*\.gw-need \{ grid-template-columns: 4px minmax\(0, 1fr\);/)
  })
})
