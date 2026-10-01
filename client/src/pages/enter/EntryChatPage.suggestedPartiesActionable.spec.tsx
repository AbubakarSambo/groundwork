import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #1a: suggestedParties/mentionedPeople used to render as passive text with
 * no action. The viewer of this page is always the check-in's future initiator
 * (this page only ever runs pre-ground; whoever commits becomes initiatorId -
 * see entry.service.ts commitInner), so they get a real "Add them" affordance
 * that queues the person into the same inviteAdded contributor list the
 * manual "Invite contributors" form below already uses - not a dead end.
 *
 * THE SCREEN MOVED AND THE CONTROLS DID NOT. The report is drawn by
 * `TheReportYouSawAtTheEnd` now, so a page that opens a finished session later draws the same
 * thing - it takes the invite control as a prop, because adding somebody belongs to the person
 * still finishing rather than to the report. So the lists live there and the control lives here,
 * and this checks both halves are still connected.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'),
  'utf8',
)

const report = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'components', 'gw', 'TheReportYouSawAtTheEnd.tsx'),
  'utf8',
)

describe('#1a recommended additions / mentioned people are actionable', () => {
  it('defines a queue function that pushes into the real inviteAdded contributor list', () => {
    expect(src).toMatch(/function queueSuggestedContributor/)
    const fnBody = src.slice(src.indexOf('function queueSuggestedContributor'), src.indexOf('function queueSuggestedContributor') + 800)
    expect(fnBody).toMatch(/setInviteAdded/)
  })

  it('lists the suggested parties and the mentioned people, in the shared report screen', () => {
    expect(report).toMatch(/report\.suggestedParties\.map/)
    expect(report).toMatch(/report\.mentionedPeople\.map/)
    /* And asks for the control rather than assuming there is one: a page that only SHOWS a
       finished report passes nothing and renders the names without buttons. */
    expect(report).toMatch(/renderAdd\?\.\(key, p\.reason\)/)
    expect(report).toMatch(/renderAdd\?\.\(key, `\$\{p\.name\} - \$\{p\.context\}`\)/)
  })

  it('and the entry page supplies the "Add them" control to it', () => {
    const block = src.slice(src.indexOf('<TheReportYouSawAtTheEnd'))
    expect(block).toMatch(/renderAdd=\{/)
    /* 4d-3: the leading "+" was a decoration, not a word a screen reader needed - the control is
       now a plain .gwui-plain-link reading "Add them", the same change "Attach a document" made
       to the "📎" chip in 4d-2. */
    expect(block).toMatch(/Add them/)
    expect(block).toMatch(/queueSuggestedContributor/)
  })
})
