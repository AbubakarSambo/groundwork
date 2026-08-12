import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A GROUND OPENS TO ITS OWN HISTORY, WITH THE OPEN SESSION AT THE BOTTOM. W8-57.
 *
 * Hafsah's model: a ground is a channel you come back to and keep adding to. A
 * channel opens to what has been said, with the place to type at the bottom.
 *
 * What was there instead: a Check-in tab holding only the live session, and a
 * separate "Session history" tab holding the past ones - so the history of the
 * thing was one click away from the thing, and the tab itself said "your
 * in-progress session is on the Check-in tab", which is a product telling you it
 * has been split in two.
 *
 * The three properties that make it a scroll rather than a list are pinned here.
 * The visual arrangement is not something a spec can judge; the order, the absence
 * of a duplicate, and the tab being gone are.
 */
const SRC = readFileSync(join(__dirname, 'GroundParticipantPage.tsx'), 'utf8')

/** The block that renders the scroll, so the assertions cannot match elsewhere. */
const SCROLL = SRC.slice(
  SRC.indexOf('THE GROUND OPENS TO ITS OWN HISTORY'),
  SRC.indexOf('{/* Active check-in card */}'),
)

describe('the check-in scroll', () => {
  it('exists, above the active session', () => {
    expect(SCROLL).toContain('<PastSession')
    // Sliced from the marker to the active card, so being non-empty IS the ordering:
    // the history renders before the live session, not after it.
    expect(SCROLL.length).toBeGreaterThan(0)
  })

  it('reads oldest first, so the bottom is where you are now', () => {
    // b - a would put the newest at the top, which is a list of receipts. A scroll
    // you read downwards has to end at the session you owe.
    expect(SCROLL).toMatch(/sort\(\(a: any, b: any\) => a\.sessionNumber - b\.sessionNumber\)/)
    expect(SCROLL).not.toMatch(/b\.sessionNumber - a\.sessionNumber/)
  })

  it('does not show the open session twice', () => {
    // The open check-in is in myCheckIns as well, and it already has its own card
    // at the bottom. Without this filter a person sees session 3 listed as history
    // directly above session 3 asking them to start it.
    expect(SCROLL).toContain("filter((ci: any) => ci.id !== openCheckIn?.id)")
  })
})

describe('the separate Session history tab', () => {
  it('is gone, because everything it held is in the scroll', () => {
    expect(SRC).not.toContain("{ key: 'history', label: 'Session history' }")
    expect(SRC).not.toContain("tab === 'history'")
  })

  it('and nothing still tries to send anybody to it', () => {
    expect(SRC).not.toContain("setTab('history')")
  })

  it('but what it rendered survives', () => {
    // Extracted rather than rewritten: the quality badge, the commitment, the
    // "what we heard from you" summary and the conversation all move together.
    const card = SRC.slice(SRC.indexOf('function PastSession'), SRC.indexOf('function SoloArtifactBlock'))
    expect(card).toContain('specificityQualityLabel')
    expect(card).toContain('nextCommitment')
    expect(card).toContain('<SoloArtifactBlock')
    expect(card).toContain('<SessionConversation')
  })
})
