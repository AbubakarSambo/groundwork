import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { groundTabs } from './ground-tabs'

/**
 * ONE ENTRANCE PER PART OF A CHECK-IN. W-UX-3.
 *
 * Her steer when this fix came up: "i am hoping we are not deleting the board but where it shows up
 * twice etc." That is exactly the distinction. The board was never duplicated - it is one page. What
 * was duplicated was the way IN: a "Team board →" pill in the header and a "Team board" tab in the
 * bar directly below it, on the same screen, going to the same URL.
 *
 * Two entrances to one room is worse than one, because a person who has been through one of them
 * cannot tell whether the other holds something they have not seen.
 *
 * So: ONE entrance. The board page, its content, and its route all stay.
 *
 * WHICH ENTRANCE CHANGED, AND THE INVARIANT DID NOT. It was the tab row; it is now a button at the
 * foot of Report. The tab row was wrong for a different reason than duplication: every other entry
 * in it changes what is below the row, and this one navigated away - so you left the check-in to look
 * at part of the check-in, and landed on a page carrying its own back-link because it did not know it
 * was a tab. The board is the shared picture you talk over once you have read the accounts, so it
 * opens from the report.
 *
 * The count is what this file protects, and it is still one.
 */
const ADMIN = readFileSync(join(__dirname, 'GroundAdminPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const BOARD = readFileSync(join(__dirname, '../board/BoardPage.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the board still exists and is still reachable', () => {
  /** Not in the tab row: every other tab stays on the page and this one never did. */
  it('is not a tab', () => {
    expect(groundTabs({ contextEnabled: true }).map(t => t.key)).not.toContain('board')
  })

  it('and the report is what opens it', () => {
    expect(ADMIN).toContain('Open the team board')
    expect(ADMIN).toMatch(/navigate\(`\/grounds\/\$\{id\}\/board`\)/)
  })

  /** Only where the server says there is one to open. */
  it('only when the server says there is a board', () => {
    expect(ADMIN).toMatch(/\{!!\(ground as any\)\.boardRenders && \(/)
  })
})

describe('but only once', () => {
  it('nothing else on the lead page links to the board', () => {
    /**
     * The tripwire is the COUNT, not the absence. One link is the tab handler above; a second is
     * the pill that was removed, or any future re-addition of it.
     */
    expect((ADMIN.match(/\/grounds\/\$\{id\}\/board/g) ?? [])).toHaveLength(1)
    expect(ADMIN).not.toContain('Team board →')
  })
})

describe('and the way back leads to your own view of it', () => {
  it('the board returns you to the check-in, which routes by role', () => {
    /**
     * `/grounds/:id/p` is the party view specifically. Hard-coded here, a LEAD leaving the board
     * landed on the party view of their own check-in.
     */
    expect(BOARD).toContain('navigate(`/grounds/${id}`)')
    expect(BOARD).not.toContain('navigate(`/grounds/${id}/p`)')
  })
})
