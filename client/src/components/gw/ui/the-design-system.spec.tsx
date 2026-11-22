import type { ReactNode } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Page } from './Page'
import { Section } from './Section'
import { Button } from './Button'
import { Panel } from './Panel'
import { EdgeList, EdgeRow } from './EdgeRow'
import { Table } from './Table'
import { NumberTiles } from './NumberTiles'
import { Tabs } from './Tabs'
import { Empty } from './NoteEmpty'
import { Text } from './Text'
import { Meta } from './Stat'
import DesignSystemPage from '@/pages/dev/DesignSystemPage'

/**
 * THE BUILDING BLOCKS, AS A PERSON READS THEM (the design system, Hafsah, 23 November 2026).
 *
 * On a page rebuilt with `<Page title=...>` every block draws its design-system look, in the order the
 * twelve rules give; on a page that has not been rebuilt it draws exactly as it did.
 */
const rebuilt = (ui: ReactNode) => render(<MemoryRouter><Page title="Morning, Wairimu">{ui}</Page></MemoryRouter>)

describe('the page', () => {
  it('a rebuilt page reads its title, its one line, its one main action, then its sections, with a side column', () => {
    render(
      <MemoryRouter>
        <Page title="Morning, Wairimu" lede="Wednesday 23 September. In the sales team, 5 of 6 have checked in today." action={<Button>Start a check-in</Button>} side={<p>Since yesterday</p>}>
          <p>What needs you</p>
        </Page>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Morning, Wairimu' })).toHaveClass('ds-text-title')
    expect(screen.getByText('Wednesday 23 September. In the sales team, 5 of 6 have checked in today.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start a check-in' })).toHaveClass('ds-btn', 'ds-btn-main')
    expect(screen.getByRole('complementary')).toHaveTextContent('Since yesterday')
  })

  it('a page that has not been rebuilt is drawn as it was', () => {
    const { container } = render(<MemoryRouter><Page><Button>Start your check-in</Button></Page></MemoryRouter>)
    expect(container.querySelector('.main > .wrap.gw-stack')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Start your check-in' })).toHaveClass('btn', 'pri')
    expect(container.querySelector('[class*="ds-"]')).toBeNull()
  })
})

describe('a section', () => {
  it('reads its title, its one line, its content, then its one action, in that order', () => {
    rebuilt(
      <Section heading="What needs you" note="5 things, most important first." action={<Button kind="quiet">See everything that needs you</Button>}>
        <p>Today's report for the sales team is ready</p>
      </Section>,
    )
    const section = screen.getByRole('region', { name: 'What needs you' })
    expect(section.textContent).toBe("What needs you5 things, most important first.Today's report for the sales team is readySee everything that needs you")
    expect(within(section).getByRole('button', { name: 'See everything that needs you' })).toHaveClass('ds-btn-link')
  })
})

describe('the buttons', () => {
  it('are the main button, the second and the link, and danger stays red', () => {
    rebuilt(<><Button>Start your check-in</Button><Button kind="secondary">Read it</Button><Button kind="quiet">Not now</Button><Button kind="danger">Remove</Button></>)
    expect(screen.getByRole('button', { name: 'Start your check-in' })).toHaveClass('ds-btn-main')
    expect(screen.getByRole('button', { name: 'Read it' })).toHaveClass('ds-btn-second')
    expect(screen.getByRole('button', { name: 'Not now' })).toHaveClass('ds-btn-link')
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('ds-btn-danger')
  })
})

describe('a row', () => {
  it('reads its title and detail, with its actions as links after them, and a dot only when it has a reason', () => {
    const { container } = rebuilt(
      <EdgeList label="What needs you">
        <EdgeRow kind="look" title="Samuel has followed up the same 5 leads for 3 check-ins" detail="None have replied. The stall rule you set would drop them." actions={<Button kind="quiet">Open Samuel</Button>} />
        <EdgeRow title="The weekly report shares itself at 6:30pm" detail="Read it first if you like. Nothing to do otherwise." actions={<Button kind="quiet">Hold it</Button>} />
      </EdgeList>,
    )
    const rows = screen.getAllByRole('listitem')
    expect(rows[0].textContent).toBe('Samuel has followed up the same 5 leads for 3 check-insNone have replied. The stall rule you set would drop them.Open Samuel')
    expect(within(rows[1]).getByRole('button', { name: 'Hold it' })).toHaveClass('ds-btn-link')
    expect(container.querySelectorAll('.ds-row-dot')).toHaveLength(1)
  })
})

describe('a card', () => {
  it('reads its title, then what it holds', () => {
    rebuilt(<Panel heading="Improve delivery"><p>On time is 88% against 95%.</p></Panel>)
    expect(screen.getByRole('heading', { level: 3, name: 'Improve delivery' })).toHaveClass('ds-text-card')
    expect(screen.getByText('On time is 88% against 95%.').closest('.ds-card')).not.toBeNull()
  })
})

describe('a table', () => {
  it('puts its numbers on the right in tabular figures, and scrolls inside its own named region', () => {
    rebuilt(
      <Table caption="Everyone at Baridi" onPanel={false}
        columns={[{ key: 'name', header: 'Person', rowHeader: true }, { key: 'n', header: 'Check-ins this week', numeric: true }]}
        rows={[{ name: 'Grace Achieng', n: '5' }]} />,
    )
    expect(screen.getByRole('region', { name: 'Everyone at Baridi' })).toHaveClass('ds-table-wrap')
    expect(screen.getByRole('cell', { name: '5' })).toHaveClass('ds-table-num')
    expect(screen.getByRole('rowheader', { name: 'Grace Achieng' })).toHaveClass('ds-table-rowhead')
  })
})

describe('a figure', () => {
  it('reads what it counts, the figure, and its date and source on one line', () => {
    rebuilt(<NumberTiles label="The strategy in figures" tiles={[{ key: 'in', label: 'Checked in today', value: '5 of 6', sub: "From the sales team's check-ins, 23 September." }, { key: 't', label: 'Delivered on time', value: '88%' }]} />)
    const tiles = within(screen.getByRole('list', { name: 'The strategy in figures' })).getAllByRole('listitem')
    expect(tiles[0].textContent).toBe("Checked in today5 of 6From the sales team's check-ins, 23 September.")
    expect(tiles[1].textContent).toBe('Delivered on time88%')
  })

  it('the meta line is always written the same way', () => {
    render(<Meta from="Amani's check-in" on="21 November" />)
    expect(screen.getByText("From Amani's check-in, 21 November.")).toHaveClass('ds-text-meta')
  })
})

describe('the tabs and the empty line', () => {
  it('draws the design-system tabs, the chosen one marked', () => {
    rebuilt(<Tabs label="Sales team, Q3" items={[{ key: 'board', label: 'Board' }, { key: 'people', label: 'People and setup' }]} active="board" />)
    expect(screen.getByRole('tab', { name: 'Board' })).toHaveClass('ds-tab', 'ds-tab-on')
    expect(screen.getByRole('tab', { name: 'People and setup' })).not.toHaveClass('ds-tab-on')
  })

  it('an empty state is one line and one action, never a box', () => {
    const { container } = rebuilt(<Empty action={<Button kind="quiet">Start one.</Button>}>No check-ins yet.</Empty>)
    const line = container.querySelector('.ds-empty')!
    expect(line.textContent).toBe('No check-ins yet. Start one.')
    expect(container.querySelector('.panel, .ds-card')).toBeNull()
  })
})

describe('the six text sizes', () => {
  it('each named size draws its own class', () => {
    render(<>{(['title', 'section', 'card', 'body', 'secondary', 'meta', 'big'] as const).map((s) => <Text key={s} size={s}>{s}</Text>)}</>)
    for (const s of ['title', 'section', 'card', 'body', 'secondary', 'meta', 'big']) expect(screen.getByText(s)).toHaveClass(`ds-text-${s}`)
  })
})

describe('the living reference page', () => {
  it('shows every building block with Groundwork\'s own words', () => {
    const { container } = render(<MemoryRouter><DesignSystemPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { level: 1, name: 'Morning, Wairimu' })).toBeInTheDocument()
    for (const name of ['What needs you', 'Is the strategy moving?', 'Everyone at Baridi', 'Sales team, Q3', 'Buttons', 'Text', 'Since yesterday', 'Your own check-in']) {
      expect(screen.getByRole('region', { name }), name).toBeInTheDocument()
    }
    expect(screen.getByText('No check-ins yet.', { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText("From the sales team's check-ins, 23 September.").length).toBeGreaterThan(0)
    /* Nothing on it sets a style of its own; the table's own minimum width is the table block's. */
    expect(container.querySelector('[style]:not(table)')).toBeNull()
  })
})
