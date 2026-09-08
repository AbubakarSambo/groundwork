import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "NOT YET · PARTY 2" TELLS A LEAD NOTHING SHE CAN ACT ON.
 *
 * WHERE THIS LESSON LIVES NOW. The reveal row was part of the report tab's body, and that body is
 * gone: the tab is a list of sessions and each session's report is its own page. The row itself is
 * not gone - it is better placed, because "who has answered and who has shown theirs" belongs on
 * the report it is about rather than on a list. It comes from the server with the report, carrying
 * the report's OWN labels, so there is no roster join left to get wrong and no positional index to
 * fall back to. The two defects this file was written for are now unreachable rather than fixed.
 *
 * Found on the report tab of a real three-party ground, opened as its lead. The reveal row is the
 * one place on the page that answers "who am I waiting on", and it answered with a positional
 * index. She could see that somebody had not revealed and had no way to know who, on a page that
 * names people freely everywhere else - `participantLabel` is used five times in this same file.
 *
 * Nothing was missing from the client. The roster was already loaded; the row simply counted from
 * one instead of reading it. No new request, no API change.
 *
 * The second defect was in the same heading: `allActivated ? '· Both activated'`, hardcoded from
 * when a check-in was always two people, sitting directly above a row of THREE cards that the same
 * block had just rendered by counting them.
 */
const API = readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'reports', 'reports.service.ts'), 'utf8')
const VIEW = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('who the report is counting', () => {
  it('names people, and says which one is you', () => {
    expect(strip(VIEW)).toContain('{c.isYou ? `${c.who} (you)` : c.who}')
  })

  it('distinguishes not answered, answered, and shown theirs', () => {
    const code = strip(VIEW)
    expect(code).toContain('Not answered yet')
    expect(code).toContain('Answered, and shown theirs')
  })

  it('takes the label from the report rather than joining a roster on the page', () => {
    /* The old row read `participants.find(...)` and printed `Party ${i + 1}` when it missed. */
    expect(strip(VIEW)).not.toMatch(/participants\s*\?\?\s*\[\]/)
    expect(API).toContain('who: labels.get(p.id) ?? `Party ${i + 1}`')
  })

  it('and still gives a nameless party a row rather than dropping them', () => {
    /* Blanking the row would lose the fact that somebody has not answered, which is the point. */
    expect(API).toContain('`Party ${i + 1}`')
  })

  it('never counts somebody who was never going to answer', () => {
    expect(API).toContain('.filter((p) => !p.managingOnly)')
  })
})
