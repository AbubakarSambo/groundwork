import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * A PAGE YOU CANNOT CHANGE SAYS SO, AND SAYS WHY.
 *
 * Everything on a party's Setup tab is read-only - `canState={false}`, `canRecord={false}` - and each
 * panel knew it while the tab never said it. A screen full of things you cannot edit, with nothing
 * explaining why, reads as broken or as a permission you have somehow lost.
 *
 * THE REASON IS THE LOAD-BEARING PART. A party stating their own yardstick would be the person being
 * read setting their own measure, which is the one comparison this product exists to make. That is a
 * defensible rule and it becomes an arbitrary one the moment it goes unexplained.
 *
 * AND IT NAMES THE WAY TO DISAGREE, because there is one: the chat, where a disagreement is probed
 * and recorded. Read-only is not the same as voiceless, and a page that implies it is would be
 * describing a different product.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PARTY = readFileSync(path.join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')

/** The tab's own region, so nothing elsewhere on the page can satisfy these. */
const SETTINGS = (() => {
  const i = PARTY.indexOf("{tab === 'settings' && (")
  expect(i).toBeGreaterThan(-1)
  return PARTY.slice(i, i + 3000)
})()

describe('a page you cannot change says so', () => {
  it('says it plainly', () => {
    expect(SETTINGS).toMatch(/Nothing on this page is yours to change/)
  })

  it('and gives the reason rather than just the rule', () => {
    expect(SETTINGS).toMatch(/not something you set yourself/)
  })

  /** Read-only is not voiceless. */
  it('and names the way to disagree', () => {
    expect(SETTINGS).toMatch(/say so in your check-in/)
  })

  /**
   * The sentence has to stay true. If a panel here ever became editable for a party, the copy would
   * be a lie - so the read-only props are pinned alongside it.
   */
  it('and the panels it describes are still read-only', () => {
    expect(SETTINGS).toContain('canState={false}')
    expect(SETTINGS).toContain('canRecord={false}')
  })
})
