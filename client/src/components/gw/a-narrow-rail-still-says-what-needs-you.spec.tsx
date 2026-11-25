import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC = fs.readFileSync(path.join(__dirname, 'AppShell.tsx'), 'utf8')
const SETTINGS = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'settings', 'SettingsPage.tsx'), 'utf8')
/* NAV_ITEMS and navItemsFor moved out of AppShell.tsx into nav-items.tsx (group 1 rebuild), so a
   rebuilt page (MorePage.tsx) can read `navItemsFor` without pulling in the rest of AppShell's own
   rendering - see the-rebuilt-pages-use-only-the-new-parts.spec.ts. AppShell.tsx still imports and
   re-exports it, so behaviour is unchanged; only where the nav item list itself is written moved. */
const NAV_ITEMS_SRC = fs.readFileSync(path.join(__dirname, 'nav-items.tsx'), 'utf8')

/*
 * COLLAPSING THE RAIL USED TO THROW AWAY THE ONE THING IT IS FOR. Seven nav icons and nothing about
 * the work, on a rail ordered by which check-in needs you.
 */
describe('a narrow rail still says what needs you', () => {
  it('computes what needs this person from the same read the expanded list uses', () => {
    expect(SRC).toMatch(/const needsYou = grounds/)
    expect(SRC).toMatch(/railAttention\(g as any, user\?\.id\)/)
    expect(SRC).toMatch(/attention\.kind === 'overdue' \|\| attention\.kind === 'yours'/)
  })

  it('renders them inside the collapsed nav, not only the expanded one', () => {
    const collapsed = SRC.slice(SRC.indexOf('{collapsed && ('), SRC.indexOf('{/* Nav items - always visible in expanded sidebar */}'))
    expect(collapsed).toMatch(/needsYou\.length > 0/)
    expect(collapsed).toMatch(/needsYou\.map/)
  })

  /* A column of coloured squares stops being scannable somewhere around eight. */
  it('caps the column', () => {
    expect(SRC).toMatch(/\.slice\(0, 8\)/)
  })

  it('carries the name and the reason on the tooltip, since there is no room for either', () => {
    const collapsed = SRC.slice(SRC.indexOf('{collapsed && ('), SRC.indexOf('{/* Nav items - always visible in expanded sidebar */}'))
    expect(collapsed).toMatch(/days past its date/)
    expect(collapsed).toMatch(/is ready for you/)
  })
})

/*
 * AND SIGNING OUT, WHICH A PHONE COULD NOT REACH AT ALL: it lived only in the user block at the
 * bottom of the desktop rail, and the mobile bar has no user block.
 */
describe('a phone can sign out', () => {
  it('has a sign out control on the settings page', () => {
    expect(SETTINGS).toMatch(/Sign out</)
    expect(SETTINGS).toMatch(/logout\(\); navigate\('\/auth'\)/)
  })

  /* UPDATED 24 November 2026 (page audit row 13, approved by Hafsah): the sentence under "Sign out" is not in the prototype and only
     explained the screen, so it is cut. Signing out still is one plain link to the page that does it. */
  it('is one plain link to the page that signs you out, with no sentence explaining it', () => {
    expect(SETTINGS).toMatch(/to="\/signout"/)
    expect(SETTINGS).not.toMatch(/Signs you out of Groundwork on this device/)
  })

  it('and settings is a route everybody has, so the mobile bar carries it', () => {
    expect(NAV_ITEMS_SRC).toMatch(/label: 'Settings'/)
    const settingsItem = NAV_ITEMS_SRC.slice(NAV_ITEMS_SRC.indexOf("label: 'Settings'"), NAV_ITEMS_SRC.indexOf("label: 'Settings'") + 220)
    expect(settingsItem).not.toMatch(/adminOnly|platformAdminOnly/)
  })
})
