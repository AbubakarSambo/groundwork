import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * #1a: suggestedParties/mentionedPeople used to render as passive text with
 * no action. The viewer of this page is always the ground's future initiator
 * (this page only ever runs pre-ground; whoever commits becomes initiatorId -
 * see entry.service.ts commitInner), so they get a real "Add them" affordance
 * that queues the person into the same inviteAdded contributor list the
 * manual "Invite contributors" form below already uses - not a dead end.
 */
const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'),
  'utf8',
)

describe('#1a recommended additions / mentioned people are actionable', () => {
  it('defines a queue function that pushes into the real inviteAdded contributor list', () => {
    expect(src).toMatch(/function queueSuggestedContributor/)
    const fnBody = src.slice(src.indexOf('function queueSuggestedContributor'), src.indexOf('function queueSuggestedContributor') + 800)
    expect(fnBody).toMatch(/setInviteAdded/)
  })

  it('renders an "Add them" control for each suggested party', () => {
    const block = src.slice(src.indexOf('sessionReport.suggestedParties.map'), src.indexOf('Mentioned people'))
    expect(block).toMatch(/\+ Add them/)
    expect(block).toMatch(/queueSuggestedContributor/)
  })

  it('renders an "Add them" control for each mentioned person', () => {
    const block = src.slice(src.indexOf('sessionReport.mentionedPeople.map'))
    expect(block).toMatch(/\+ Add them/)
    expect(block).toMatch(/queueSuggestedContributor/)
  })
})
