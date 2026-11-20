import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Button } from './Button'
import { Tag } from './Tag'
import { Tabs } from './Tabs'
import { Section } from './Section'
import { Panel } from './Panel'
import { EdgeList, EdgeRow } from './EdgeRow'
import { Avatar } from './Avatar'
import { Toggle } from './Toggle'
import { Choices } from './Choices'
import { ChoiceCards } from './ChoiceCards'
import { FieldRows, FieldRow } from './FieldRow'
import { Folded } from './Folded'
import { SwitchRow } from './SwitchRow'
import { Toast } from './Toast'
import { PeopleTable, PeopleTableHead, PersonRow } from './PeopleTable'

/**
 * THE SHARED PARTS, AGAINST THE PROTOTYPE'S OWN VALUES (design-audit.md section 4, step 3: "render
 * tests for each part checking its key values").
 *
 * Every value asserted here is the one docs/design-audit.md measured from
 * docs/prototype/source/app.css, as it actually renders (the file sets some colours three times
 * over - the LAST value in the cascade is the one on screen).
 */
const CSS = readFileSync(join(__dirname, 'gw-ui.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
/* UPDATED 24 October (Hafsah: "one stylesheet, the prototype's"): Button, Tag, Section, Panel and EdgeRow are drawn with the
   prototype's own classes (.btn, .tag, .sec, .panel, .item), so their values are pinned here in styles/prototype.css,
   the prototype's stylesheet copied verbatim, rather than in the kit's copy of the same values, which is gone. */
const PROTO = readFileSync(join(__dirname, '../../../styles/prototype.css'), 'utf8')

describe('Button', () => {
  it('draws the four kinds, each saying what happens', () => {
    render(
      <div>
        <Button>Start your check-in</Button>
        <Button kind="secondary">Read it</Button>
        <Button kind="quiet">Not now</Button>
        <Button kind="danger">End this check-in</Button>
      </div>,
    )
    expect(screen.getByRole('button', { name: 'Start your check-in' })).toHaveClass('btn', 'pri')
    expect(screen.getByRole('button', { name: 'Read it' })).toHaveClass('sec')
    expect(screen.getByRole('button', { name: 'Not now' })).toHaveClass('quiet')
    expect(screen.getByRole('button', { name: 'End this check-in' })).toHaveClass('danger')
  })

  /*
   * 30 September (Hafsah): the prototype has exactly one danger style, solid red
   * (app.css: `.btn.danger{background:var(--con);color:#fff}`) - not an outline plus a second
   * "filled" variant behind a flag. `kind="danger"` is always that one style now, whatever it is
   * used for, so this also checks the outline and "quiet danger" classes it replaced are gone
   * from the stylesheet entirely, not just unused.
   */
  it('the danger kind is always the prototype\'s one solid red, never an outline or a red-text quiet button', () => {
    render(<Button kind="danger">Remove</Button>)
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('danger')
    expect(PROTO).toMatch(/\.btn\.danger\{background:var\(--con\);color:var\(--gw-white\)\}/)
    expect(CSS).not.toMatch(/gwui-btn-danger-solid/)
    expect(CSS).not.toMatch(/gwui-btn-quiet-danger/)
  })

  it('is at least a thumb tall (44px), and its text is never smaller than 16px', () => {
    expect(PROTO).toMatch(/\.btn\{min-height:44px/)
    expect(PROTO).toMatch(/\.btn\{[^}]*font-size:16px/)
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
    expect(a).toHaveClass('btn', 'sec')
  })
})

describe('Tag', () => {
  it('every tone has its own colours, matching the prototype\'s', () => {
    render(
      <div>
        <Tag tone="proven">Proven</Tag>
        <Tag tone="attention">Waiting for an admin</Tag>
        <Tag tone="action">Owner</Tag>
        <Tag tone="concern">The email bounced</Tag>
        <Tag>Plain</Tag>
      </div>,
    )
    expect(screen.getByText('Proven')).toHaveClass('tag', 'rec')
    expect(screen.getByText('Waiting for an admin')).toHaveClass('att')
    expect(screen.getByText('Owner')).toHaveClass('act')
    expect(screen.getByText('The email bounced')).toHaveClass('con')
    expect(screen.getByText('Plain')).toHaveClass('plain')
  })

  it('is 26px tall, round-ended, 13.5px bold - never a label on a person', () => {
    expect(PROTO).toMatch(/\.tag\{[^}]*min-height:26px/)
    expect(PROTO).toMatch(/\.tag\{[^}]*border-radius:999px/)
    expect(PROTO).toMatch(/\.tag\{[^}]*font-size:14px/)
    expect(PROTO).toMatch(/\.tag\{[^}]*font-weight:700/)
  })
})

describe('Tabs', () => {
  it('only the chosen tab is underlined - the other tabs get a transparent underline, not none', () => {
    render(
      <MemoryRouter>
        <Tabs
          label="Check-in"
          active="board"
          items={[
            { key: 'board', label: 'Board', to: '/board' },
            { key: 'checkin', label: 'Check-in', to: '/checkin' },
          ]}
        />
      </MemoryRouter>,
    )
    const board = screen.getByRole('tab', { name: 'Board' })
    const checkin = screen.getByRole('tab', { name: 'Check-in' })
    expect(board).toHaveClass('gwui-tab-on')
    expect(board).toHaveAttribute('aria-selected', 'true')
    expect(checkin).not.toHaveClass('gwui-tab-on')
    expect(checkin).toHaveAttribute('aria-selected', 'false')
  })

  it('a chosen tab has a 3px navy underline; every other tab has a 3px TRANSPARENT one, never none', () => {
    expect(CSS).toMatch(/\.gwui-tab \{[^}]*border-bottom: 3px solid transparent/)
    expect(CSS).toMatch(/\.gwui-tab-on \{[^}]*border-bottom-color: var\(--gw-navy\)/)
    // one rule for the underline weight, not a second one contradicting it
    expect(CSS.match(/border-bottom:\s*3px solid transparent/g)?.length).toBe(1)
  })

  it('each tab is 46px tall, 16px, muted; the row scrolls sideways rather than wrapping', () => {
    expect(CSS).toMatch(/\.gwui-tab \{[^}]*min-height: 46px/)
    expect(CSS).toMatch(/\.gwui-tab \{[^}]*font-size: 16px/)
    expect(CSS).toMatch(/\.gwui-tabs \{[^}]*overflow-x: auto/)
  })
})

describe('Section', () => {
  it('the heading is 21px bold ink - never navy', () => {
    render(<Section heading="What needs you" note="Today">content</Section>)
    expect(screen.getByRole('heading', { name: 'What needs you' })).toHaveClass('t-h2')
    expect(PROTO).toMatch(/\.t-h2\{font-size:21px/)
    expect(PROTO).toMatch(/\.t-h2\{[^}]*font-weight:700/)
    expect(PROTO).not.toMatch(/\.t-h2\{[^}]*color/)
    expect(PROTO).not.toMatch(/\.t-h2\{[^}]*navy/)
  })
})

describe('Panel', () => {
  it('is white, a 1px line, 12px corners, no shadow', () => {
    render(<Panel>content</Panel>)
    expect(screen.getByText('content')).toHaveClass('panel', 'pad')
    expect(PROTO).toMatch(/\.panel\{[^}]*border-radius:12px/)
    expect(PROTO).toMatch(/\.panel\{[^}]*border:1px solid var\(--rule\)/)
    expect(PROTO).not.toMatch(/\.panel\{[^}]*box-shadow/)
  })
})

describe('EdgeRow', () => {
  it('the edge colour says why it is here, in words too, for a screen reader, when the title does not already say so', () => {
    render(
      <EdgeList label="What needs you">
        <EdgeRow kind="ready" title="Deals moved stage this week" detail="3 deals moved stage." />
        <EdgeRow kind="concern" title="The email bounced" />
      </EdgeList>,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveClass('item')
    expect(items[0].querySelector('.sp')).toHaveClass('rec')
    expect(items[0]).toHaveTextContent('Ready to read.')
    expect(items[1].querySelector('.sp')).toHaveClass('con')
  })

  /*
   * WALKTHROUGH PASS 2, ITEM 1: EVERY REPORT ROW ON TODAY READ "READY TO READ." ABOVE A TITLE THAT
   * ALREADY SAID "...IS READY" - Today's own report titles always do ("The report for Sales team,
   * Q3 is ready"), so the sr-only prefix said the same thing to a screen reader twice, every time.
   * It is left out when the title already carries the word.
   */
  it('says "Ready to read." once, never twice, when the title already says the report is ready', () => {
    render(
      <EdgeList label="What needs you">
        <EdgeRow kind="ready" title="The report for Sales team, Q3 is ready" detail="3 deals moved stage." />
      </EdgeList>,
    )
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('The report for Sales team, Q3 is ready')
    expect(item.textContent?.match(/ready/gi)?.length).toBe(1)
  })

  it('title 18px bold, line 14px muted, 16px above and below, seven text sizes (the edge is a dot, set in design-rules.css)', () => {
    expect(PROTO).toMatch(/\.item \.h\{font-size:18px/)
    expect(PROTO).toMatch(/\.item \.h\{[^}]*font-weight:700/)
    expect(PROTO).toMatch(/\.item \.s\{font-size:14px/)
    expect(PROTO).toMatch(/\.item\{[^}]*grid-template-columns:4px minmax\(0,1fr\) auto/)
    expect(PROTO).toMatch(/\.item\{[^}]*padding:16px 0/)
  })
})

describe('PeopleTable / PersonRow / PersonCell', () => {
  /**
   * FIX: the name column was squashed to about 60px, because a caller could place `PersonCell`
   * (the avatar plus up to three lines of text) into whatever narrow column it liked - the first
   * time this was built, that was the 34px avatar-only column. `PersonRow` and `PeopleTableHead`
   * now build the name column themselves, and it is never something a caller's `extraColumns`
   * string can shrink.
   */
  it('always gives PersonCell the wide name column, whatever extraColumns says', () => {
    render(
      <PeopleTable>
        <PeopleTableHead extraColumns="190px 160px" labels={['Person', 'Status', 'Role']} />
        <PersonRow
          extraColumns="190px 160px"
          person={{ initials: 'MW', name: 'Miriam Wanjiku', level: 'Sales rep, reports to Wairimu Kamau', email: 'miriam@baridi.co.ke' }}
        >
          <span>Checking in</span>
          <Tag tone="action">Owner</Tag>
        </PersonRow>
      </PeopleTable>,
    )
    const row = screen.getByRole('row', { name: /Miriam Wanjiku/ })
    expect(row).toHaveStyle({ gridTemplateColumns: 'minmax(240px, 1.2fr) 190px 160px' })
    // the level and email are readable as one line each, not wrapped word by word
    expect(screen.getByText('Sales rep, reports to Wairimu Kamau')).toBeInTheDocument()
    expect(screen.getByText('miriam@baridi.co.ke')).toBeInTheDocument()
  })

  it('a Tag in a later column keeps its own natural width - the grid does not stretch it', () => {
    expect(CSS).toMatch(/\.gwui-person-row \{[^}]*justify-items: start/)
    expect(CSS).toMatch(/\.gwui-people-head \{[^}]*justify-items: start/)
  })

  it('the name column is never narrower than 240px, wide enough for the avatar and its text', () => {
    const src = readFileSync(join(__dirname, 'PeopleTable.tsx'), 'utf8')
    expect(src).toContain("export const PEOPLE_NAME_COLUMN = 'minmax(240px, 1.2fr)'")
  })
})

describe('Avatar', () => {
  /* Changed 25 October (crisp text): the initials are a whole pixel, size / 2.8 rounded (12px for 34), never 12.1px. */
  it('is a 34px circle by default, initials at size / 2.8 rounded to a whole pixel', () => {
    render(<Avatar initials="MW" />)
    const av = screen.getByText('MW')
    expect(av).toHaveClass('gwui-avatar')
    expect(av).toHaveStyle({ width: '34px', height: '34px', fontSize: '12px' })
  })

  it('a 56px avatar has 20px initials', () => {
    render(<Avatar initials="BA" size={56} />)
    expect(screen.getByText('BA')).toHaveStyle({ width: '56px', height: '56px', fontSize: '20px' })
  })
})

describe('Toggle', () => {
  it('is a real switch, named, and reports its state', () => {
    const onChange = vi.fn()
    render(<Toggle label="Reminders" on={false} onChange={onChange} />)
    const t = screen.getByRole('switch', { name: 'Reminders' })
    expect(t).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(t)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('is green when on, not navy', () => {
    render(<Toggle label="On" on onChange={() => {}} />)
    expect(screen.getByRole('switch', { name: 'On' })).toHaveClass('gwui-toggle-on')
    expect(CSS).toMatch(/\.gwui-toggle-on \{[^}]*background: var\(--gw-green-t\)/)
    expect(CSS).not.toMatch(/\.gwui-toggle-on \{[^}]*navy/)
  })

  it('is 48 by 28px with a 22px knob', () => {
    expect(CSS).toMatch(/\.gwui-toggle \{[^}]*width: 48px/)
    expect(CSS).toMatch(/\.gwui-toggle \{[^}]*height: 28px/)
    expect(CSS).toMatch(/\.gwui-toggle-knob \{[^}]*width: 22px/)
  })
})

describe('Choices', () => {
  it('is a radio group, each choice 44px tall; the chosen one is navy and bold', () => {
    render(
      <Choices
        label="Who can open a check-in"
        value="admins"
        onChange={() => {}}
        options={[{ key: 'all', label: 'Everyone' }, { key: 'admins', label: 'Admins only' }]}
      />,
    )
    expect(screen.getByRole('radiogroup', { name: 'Who can open a check-in' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Admins only' })).toHaveClass('gwui-choice-on')
    expect(screen.getByRole('radio', { name: 'Everyone' })).not.toHaveClass('gwui-choice-on')
    /* 44px since 21 October: Hafsah's 44px rule covers chips as well as buttons. */
    expect(CSS).toMatch(/\.gwui-choice \{[^}]*min-height: 44px/)
    expect(CSS).toMatch(/\.gwui-choice-on \{[^}]*background: var\(--gw-navy\)/)
  })
})

describe('ChoiceCards', () => {
  it('the chosen card keeps its white fill and gets a 2px ink outline - never a solid navy fill', () => {
    render(
      <ChoiceCards
        label="Role"
        value="admin"
        onChange={() => {}}
        options={[{ key: 'member', title: 'Member' }, { key: 'admin', title: 'Admin' }]}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Admin' })).toHaveClass('gwui-choice-card-on')
    expect(CSS).toMatch(/\.gwui-choice-card \{[^}]*background: var\(--gw-card\)/)
    expect(CSS).toMatch(/\.gwui-choice-card-on \{[^}]*box-shadow: inset 0 0 0 2px var\(--gw-text\)/)
  })

  it('a locked group still shows the chosen card as chosen, but nothing in it can be clicked away from it (one person\'s own role)', () => {
    const onChange = vi.fn()
    render(
      <ChoiceCards
        label="Role"
        value="admin"
        onChange={onChange}
        disabled
        options={[{ key: 'member', title: 'Member' }, { key: 'admin', title: 'Admin' }]}
      />,
    )
    const admin = screen.getByRole('radio', { name: 'Admin' })
    const member = screen.getByRole('radio', { name: 'Member' })
    expect(admin).toHaveClass('gwui-choice-card-on')
    expect(admin).not.toBeDisabled()
    expect(member).toBeDisabled()
    fireEvent.click(member)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('FieldRow', () => {
  it('the label is bold, the value plain, an optional action on the right', () => {
    render(
      <FieldRows>
        <FieldRow label="Level" value="Sales rep" action={<button>Change</button>} />
      </FieldRows>,
    )
    expect(screen.getByText('Level')).toHaveClass('gwui-field-row-label')
    expect(screen.getByText('Sales rep')).toHaveClass('gwui-field-row-value')
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })

  /**
   * CHANGED (Hafsah, 30 September, the setting row): this used to assert this part's OWN invented
   * numbers - a 200px label column, a border-BOTTOM, and 22px of side padding meant to sit inside a
   * `Panel(pad={false})` - because nobody had read the prototype's own row before. `srow`
   * (docs/prototype/source/s5.js, on `.row` in app.css) is `220px minmax(0,1fr) auto`, gap 18px,
   * padding `14px 0` with NO side padding, and a border-TOP (so the first row's own line reads as
   * the line under the section heading) - sitting flat on the page, never inside a white Panel.
   * This test now checks the prototype's real values, not our own prior guess.
   */
  it('the label column is 220px by default, 16px label and value, a line on top of each row, no side padding', () => {
    expect(CSS).toContain('var(--gwui-field-label-w, 220px)')
    expect(CSS).toMatch(/\.gwui-field-row-label \{[^}]*font-size: 16px/)
    expect(CSS).toMatch(/\.gwui-field-row \{[^}]*border-top: 1px solid var\(--gw-border\)/)
    expect(CSS).toMatch(/\.gwui-field-row \{[^}]*padding: 12px 0/)
  })
})

describe('Folded', () => {
  it('opens with no script, starting closed', () => {
    const { container } = render(
      <Folded summary="Who reports to whom" note="Level and reporting lines describe the organisation. What someone can do still comes from their role.">
        <p>Amani Njoroge</p>
      </Folded>,
    )
    const details = container.querySelector('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
    fireEvent.click(screen.getByText('Who reports to whom'))
    expect(details.open).toBe(true)
  })

  it('is a Panel-shaped 12px-corner box, 16 by 24px inside, closed', () => {
    expect(CSS).toMatch(/\.gwui-folded \{[^}]*border-radius: 12px/)
    expect(CSS).toMatch(/\.gwui-folded-summary \{[^}]*padding: 16px 24px/)
  })
})

describe('SwitchRow', () => {
  it('the title reads bigger than its own sentence, never the other way round (design-audit.md item 15)', () => {
    render(<SwitchRow title="Check-ins wait for an admin" detail="Each new check-in waits for an admin before invitations go out." on onChange={() => {}} />)
    expect(screen.getByText('Check-ins wait for an admin')).toHaveClass('gwui-switch-row-title')
    expect(screen.getByText('Each new check-in waits for an admin before invitations go out.')).toHaveClass('gwui-switch-row-detail')
    expect(CSS).toMatch(/\.gwui-switch-row-title \{[^}]*font-size: 16px/)
    expect(CSS).toMatch(/\.gwui-switch-row-detail \{[^}]*font-size: 14px/)
  })

  it('carries a real Toggle, named after its own title', () => {
    const onChange = vi.fn()
    render(<SwitchRow title="Reminders" on={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch', { name: 'Reminders' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Toast', () => {
  it('is announced to a screen reader', () => {
    render(<Toast>Saved.</Toast>)
    expect(screen.getByRole('status')).toHaveTextContent('Saved.')
  })

  it('ink fill, white 15px text, 10px corners, centred 90px up', () => {
    expect(CSS).toMatch(/\.gwui-toast \{[^}]*background: var\(--gw-text\)/)
    expect(CSS).toMatch(/\.gwui-toast \{[^}]*color: var\(--gw-white\)/)
    expect(CSS).toMatch(/\.gwui-toast \{[^}]*font-size: 14px/)
    expect(CSS).toMatch(/\.gwui-toast \{[^}]*border-radius: 8px/)
    expect(CSS).toMatch(/\.gwui-toast \{[^}]*bottom: 90px/)
  })
})

describe('the faint token', () => {
  it('is the prototype\'s own value (#85705A), not the product\'s different --gw-muted (#7D6A55)', () => {
    expect(CSS).toMatch(/--gwui-faint: #85705A/)
  })
})

describe('an EdgeRow action is the standard Button, not a small one', () => {
  /**
   * FIX: the sample page's "What needs you" section used `size="small"` (36px, 14.5px) for
   * "Read it", "Decide", "Open" and "Fix the address". The prototype (#/system, and the Today
   * screen) draws these as the ordinary 44px, 16px bold button, the same as any other primary
   * action on the page - `small` is for a button living inside an already-compact space, like a
   * table row's "Copy" or "Change", not for what needs you.
   */
  it('renders at the standard 44px height, not the 36px small one', () => {
    render(
      <EdgeList label="What needs you">
        <EdgeRow kind="ready" title="Today's report is ready" actions={<Button kind="secondary">Read it</Button>} />
      </EdgeList>,
    )
    const b = screen.getByRole('button', { name: 'Read it' })
    expect(b).toHaveClass('btn')
    expect(b).not.toHaveClass('sm')
  })

  it('the sample page itself uses no small button inside "What needs you"', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'pages', 'dev', 'PartsSamplePage.tsx'), 'utf8')
    const section = src.slice(src.indexOf('heading="What needs you"'), src.indexOf('</Section>', src.indexOf('heading="What needs you"')))
    expect(section).not.toMatch(/size="small"/)
  })
})
