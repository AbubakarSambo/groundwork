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
    const bd = LIST.slice(LIST.indexOf('className="gw-bd"'), LIST.indexOf('className="gw-bd"') + 200)
    expect(bd).toMatch(/maxWidth: 1160/)
    expect(bd).not.toMatch(/maxWidth: 600/)
  })

  it('and the pages that ARE reading keep theirs', () => {
    /* The point is not "wider everywhere". A check-in and a party's own account are read, not
       scanned, and 600 is right for them.
       UPDATED 29 SEPT, PEOPLE AND SETUP REBUILD: GroundAdminPage.tsx's own conversation, sessions
       list, documents and report tabs still cap at 600 - only "People and setup" (a settings page,
       not a column of prose) now widens to the shared Page frame's own maximum, 1150 (see the next
       test). This still proves the reading tabs keep 600; it no longer requires the literal
       `maxWidth: 600` substring, which the settings-only ternary broke without changing what any
       tab actually does. */
    expect(CHECK_IN).toMatch(/maxWidth: tab === 'settings' \? \d+ : 600/)
    expect(PARTY).toMatch(/maxWidth: 600/)
  })

  it("and People and setup is the one exception - a settings page, not a reading column", () => {
    /*
     * CHANGED, 30 SEPTEMBER (Hafsah, the setting row, item 3): this used to check for 1060, matching
     * this page's own header, which was ALSO wrong - both were a narrower, hand-rolled copy of the
     * page frame, not the real one. Measured at 1440px against the board (which uses the shared
     * `Page` component, components/gw/ui/Page.tsx): the header and "People and setup" here sat at
     * about 315 to 1375, against the board's 304 to 1386. Both now render inside `<Page>` itself,
     * whose own wrap caps at 1150 - so this tab widens to 1150, not 1060, and no longer needs its
     * own hand-rolled maxWidth for the header (removed; `Page` supplies it).
     */
    expect(CHECK_IN).toMatch(/tab === 'settings' \? 1150 : 600/)
    expect(CHECK_IN).toMatch(/from '@\/components\/gw\/ui\/Page'/)
  })

  it('it is a cap, not a fixed width, so it still fits a narrow screen', () => {
    /* Measured: 778 at 1024, 375 on mobile, nothing overflowing. A fixed width would have. */
    const bd = LIST.slice(LIST.indexOf('className="gw-bd"'), LIST.indexOf('className="gw-bd"') + 200)
    expect(bd).toMatch(/width: '100%'/)
    expect(bd).not.toMatch(/\bwidth: 1160\b/)
  })
})
