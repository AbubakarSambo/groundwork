import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PRIVACY SCREEN MUST SAY ONLY WHAT IS TRUE. (G40, and the trap in G41)
 *
 * People write differently depending on what they believe happens next, so this
 * screen decides the quality of the record itself. That makes it tempting to
 * overstate, and overstating here is the single most expensive mistake available:
 * a privacy claim caught being false costs more than one never made, and one
 * technical question from a founder or an investor is all it takes.
 *
 * Turns are stored unencrypted in Postgres and transcripts are sent to Google
 * for processing through Vertex. So "we cannot see your conversations" and
 * "end-to-end encrypted" are both false today, however good they would look.
 *
 * This reads the screen's own copy. Two claims on the marketing page were false
 * for weeks because nothing compared a sentence to the behaviour behind it, and
 * this is the same class of failure one page earlier.
 */
/*
 * THE COPY MOVED, AND THIS FOLLOWS IT. The four claims now live in one module because a second
 * screen shows them - the guide an admin sends their company before a rollout. This still reads
 * the words a person sees; it just reads them where they now are, and still checks that this
 * screen renders them rather than having quietly dropped the block.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGE = strip(readFileSync(join(__dirname, 'ChatPage.tsx'), 'utf8'))
const CLAIMS = strip(readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'what-happens-to-what-you-write.ts'), 'utf8'))
const SRC = `${PAGE}\n${CLAIMS}`

describe('the screen still shows them', () => {
  it('renders the shared claims rather than having dropped the block', () => {
    expect(PAGE).toContain('WHAT_HAPPENS_TO_WHAT_YOU_WRITE.map')
  })
})

/**
 * The privacy screen as a person reads it: this page's own heading and framing, plus the four
 * claims, which are now a module because a second surface shows them as well.
 */
const SCREEN = (() => {
  const start = PAGE.indexOf('What happens to what you write')
  expect(start).toBeGreaterThan(-1)
  return `${PAGE.slice(start, PAGE.indexOf('Start my check-in', start))}\n${CLAIMS}`
})()

describe('what it promises', () => {
  it('says nobody they work with reads it', () => {
    expect(SCREEN).toMatch(/Not your manager/i)
    expect(SCREEN).toMatch(/not an admin/i)
  })

  it('says our own support tools cannot show it, and that this is enforced', () => {
    expect(SCREEN).toMatch(/enforced in the code and tested/i)
  })

  it('says nothing here trains a model', () => {
    expect(SCREEN).toMatch(/trains a model/i)
  })

  it('draws the line the report actually draws', () => {
    // Your own words about your own work can appear. What you say about somebody
    // else never does. That is the real promise and the useful one.
    expect(SCREEN).toMatch(/never says who said what about whom/i)
  })
})

describe('what it must never claim', () => {
  it('does not say we cannot see the conversations', () => {
    // THE REGRESSION. Turns are stored unencrypted; anyone with database access
    // can read them.
    expect(SCREEN).not.toMatch(/we (cannot|can't|can not) see (your|the) conversations/i)
    expect(SCREEN).not.toMatch(/nobody at [A-Za-z]+ can (read|see)/i)
  })

  it('does not claim encryption it does not have', () => {
    expect(SCREEN).not.toMatch(/end-to-end/i)
    expect(SCREEN).not.toMatch(/encrypted/i)
  })

  it('says out loud where the words actually go', () => {
    // The thing an honest version has to include, and the reason the rest is
    // believable.
    expect(SCREEN).toMatch(/stored on our servers/i)
    expect(SCREEN).toMatch(/Google/i)
  })
})

describe('when it appears', () => {
  it('only on the first session, and only before anything has been said', () => {
    expect(SRC).toMatch(/sessionNumber === 1 && !privacyAcknowledged && msgs\.length === 0/)
  })

  it('is not shown again once someone has read it', () => {
    // A promise repeated every week stops being read and becomes furniture.
    expect(SRC).toMatch(/gw_privacy_seen/)
  })

  it('falls back to showing it, not to hiding it, when storage is unavailable', () => {
    // Private browsing throws. Shown twice is a small cost; never shown is the
    // one failure that matters.
    expect(SRC).toMatch(/catch \{ return false \}/)
  })
})
