import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A LIST OF CARDS IS NOT A COLUMN OF PROSE.
 *
 * The dashboard was capped at 600px. Measured on the running page at 1440: a 600px column inside a
 * 1194px main, so 594px sat empty either side while every card wrapped its own name, lead,
 * participant count and session count.
 *
 * 600 is right for READING and stays where reading happens - the check-in page and a party's own
 * view. It was wrong here, and the effect was not only wasted space: the setup checklist above the
 * list had to fold five steps into two cramped columns, which is most of what "the checklist
 * dominates the dashboard" was actually describing.
 *
 * Measured after: 1160 at 1440, 778 at 1024, 375 on mobile, no horizontal overflow at any of them.
 * Same treatment and same reasoning as the situation picker - see
 * the-picker-gets-the-whole-width.spec.ts, which measured the same thing.
 *
 * WHY A GUARD. The picker's wide column was silently moved onto the wrong screen once, by a
 * renumber, and nobody noticed for months. A width is exactly the kind of thing that gets
 * "tidied" back to matching its neighbours.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const read = (p: string) => strip(readFileSync(join(__dirname, p), 'utf8'))

const LIST = read('GroundsListPage.tsx')
const CHECK_IN = read('GroundAdminPage.tsx')
const PARTY = read('GroundParticipantPage.tsx')

describe('the dashboard uses the screen it is given', () => {
  it('reads the real files, so an empty one cannot pass', () => {
    for (const s of [LIST, CHECK_IN, PARTY]) expect(s.length).toBeGreaterThan(3000)
  })

  it('the list of check-ins is not capped at a reading width', () => {
    /*
     * UPDATED, GROUP 2 REBUILD: the page's own hand-rolled `className="gw-bd"` wrapper (an inline
     * `style={{ maxWidth: 1160, ... }}`) is gone - the-rebuilt-pages-use-only-the-new-parts.spec.ts
     * now bans exactly that kind of inline size on a listed page. The page renders inside the
     * shared `Page` component (components/gw/ui/Page.tsx) instead, whose own wrap caps at 1150 -
     * the prototype's own `.wrap` value, the same frame every other rebuilt page uses. 1150 still
     * proves the finding this test is named for (a list of check-ins is not a 600px reading column);
     * the bespoke 1160 found nowhere else in the product is what changed, not the finding.
     */
    expect(LIST).toMatch(/from '@\/components\/gw\/ui'/)
    expect(LIST).not.toContain('className="gw-bd"')
    expect(LIST).not.toMatch(/maxWidth: 600/)
    expect(LIST).not.toMatch(/maxWidth: 1160/)
  })

  it('and the one page that IS reading keeps its narrow column', () => {
    /* The point is not "wider everywhere". A live conversation is read, not scanned, and 600 is
       right for it.
       GROUP 3 REVIEW, BATCH B (1 October): sessions.jpg (GroundAdminPage.tsx's "report" tab, the
       list of sessions) and context.jpg (its "Context" tab, `docs`) both turned out to draw at the
       prototype's own full page width, not the 600px reading column this page had capped every tab
       at except "People and setup" - the previous round's picture check had found the settings tab
       alone, and quietly left every other tab under a full-width header narrowed to 600. The
       prototype draws the header and tabs at the page's full width throughout; the only screen it
       narrows is the conversation itself (check-in-start.jpg). So GroundAdminPage.tsx now narrows
       only `chat`, and everything else - `checkins`, `myrecord`, `docs`, `report`, `settings` -
       widens to the shared `Page` frame's own maximum, 1150. */
    /* CHANGED IN BATCH 2, GROUP 5 (Hafsah, item 3): on a computer the conversation runs the full width beside the sidebar, like
       Slack, and the reading width moved onto each message (gw-ui.css, `.gwui-ci-in-tab .ci-b > .bub`), so the Check-in tab is
       no longer a 600 column. */
    expect(CHECK_IN).toMatch(/maxWidth: tab === 'chat' \? undefined : 1150/)
    expect(CHECK_IN).toContain("gwui-ci-tab-body")
    /* GroundParticipantPage.tsx's own `docs` tab draws the very same `ContextPage` the lead's page
       does, and context.jpg is the same screen either way - so it widens here too, beside `record`
       and `settings`; the conversation and the party's own report (own-report.jpg draws it as a
       narrow column, the same measure as the chat) are what stay narrow now. */
    expect(PARTY).toMatch(/maxWidth: \(tab === 'settings' \|\| tab === 'record' \|\| tab === 'docs'\) \? \d+ : 600/)
  })

  it("and People and setup, Context, sessions and My work are the exceptions - none of them a reading column", () => {
    /*
     * CHANGED, 30 SEPTEMBER (Hafsah, the setting row, item 3): this used to check for 1060, matching
     * this page's own header, which was ALSO wrong - both were a narrower, hand-rolled copy of the
     * page frame, not the real one. Measured at 1440px against the board (which uses the shared
     * `Page` component, components/gw/ui/Page.tsx): the header and "People and setup" here sat at
     * about 315 to 1375, against the board's 304 to 1386. Both now render inside `<Page>` itself,
     * whose own wrap caps at 1150 - so this tab widens to 1150, not 1060, and no longer needs its
     * own hand-rolled maxWidth for the header (removed; `Page` supplies it).
     *
     * GROUP 3 REVIEW, BATCH B: widened from "People and setup" alone to every tab except the
     * conversation - see the test above for why.
     */
    expect(CHECK_IN).toMatch(/tab === 'chat' \? undefined : 1150/)
    expect(CHECK_IN).toMatch(/from '@\/components\/gw\/ui\/Page'/)
  })

  it("and on the party's page, My work and Context and resources are the same exception, beside People and setup", () => {
    /* 30 SEPTEMBER, THE SIDE-BY-SIDE STYLE CHECK: see the comment above. Both settings pages this
       page has - Setup and My work - widen to 1150.
       GROUP 3 REVIEW, BATCH B: Context and resources (`docs`) joins them - context.jpg draws it at
       the same full width, and it is the same `ContextPage` component GroundAdminPage.tsx draws.
       Only the conversation and the party's own report stay at the reading width now. */
    expect(PARTY).toMatch(/\(tab === 'settings' \|\| tab === 'record' \|\| tab === 'docs'\) \? 1150 : 600/)
  })

  it('it is a cap, not a fixed width, so it still fits a narrow screen', () => {
    /* UPDATED, GROUP 2 REBUILD: the shared `Page` frame's own wrap (`.gwui-page-wrap`, gw-ui.css)
       is `max-width: 1150`, never a fixed width, and is already relied on by every other rebuilt
       page - checked here by absence of a fixed pixel width on this page's own markup. */
    expect(LIST).not.toMatch(/\bwidth: 1160\b/)
    expect(LIST).not.toMatch(/width: '100%'.*maxWidth: 1160/s)
  })
})
