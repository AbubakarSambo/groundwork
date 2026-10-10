import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { UsageFunnelData } from '@/api/prompts'
import { DropoffsTab } from './AdminPage'

/**
 * THE ACTIVATION FUNNEL, ON THE BACK OFFICE'S DROP-OFFS/USAGE TAB (docs/answers-from-engine.md,
 * 8 October, "the engagement work", point 1; decision 109).
 *
 * `GET /prompts/platform-funnel` now carries `activation`, counts only, never a person or a word
 * anybody said. This tab is staff-only and there is no local staff account to sign in as and walk
 * it live (docs/requests-to-engine.md, request 192), so this renders the tab itself with a served
 * payload, the way a real response would arrive.
 */
const BASE: UsageFunnelData = {
  range: 'all',
  since: null,
  funnelBySession: [],
  avgSessionMinutes: [],
  byScenario: [],
  byMoment: [],
  byStatus: [],
  bothEngaged: 0,
  oneEngaged: 0,
  stalledCheckIns: 0,
  session5Count: 0,
  avgDaysToFirstCheckin: { value: null, n: 0 },
  activation: null,
}

describe('the activation funnel on the usage tab', () => {
  it('draws "How far check-ins get" as a funnel, the now-counts, leads who came back, and mail sent against mail stopped on purpose', () => {
    render(<DropoffsTab data={{
      ...BASE,
      activation: {
        reached: { created: 100, peopleAdded: 80, firstResponse: 60, enoughToReport: 40, firstInsight: 35, leadActed: 20, secondRound: 10 },
        now: { test: 5, abandonedBeforeValue: 3, abandonedAfterValue: 2, active: 90 },
        leadsWhoCameBack: 14,
        emails: { delivered: 120, failed: 2, held: 5, notSentOnPurpose: 8 },
      },
    }} />)

    expect(screen.getByText('How far check-ins get')).toBeTruthy()
    expect(screen.getByText('Created')).toBeTruthy()
    /* UPDATED FOR B-147: this funnel stage is about a second SESSION of one check-in finishing,
       not a second check-in, so it now says "session" - the product's one word for that, not
       "round" (which this label already said, not "check-in" - a different B-147 cleanup from
       the one below). */
    expect(screen.getByText('A second session finished')).toBeTruthy()
    expect(screen.getByText('10')).toBeTruthy()

    expect(screen.getByText('Leads who came back')).toBeTruthy()
    expect(screen.getByText('14')).toBeTruthy()

    /* The last two were never delivered, so they must not read as mail nobody answered - they get
       the engine's own suggested words, not "Sent" or a raw count with no explanation. */
    expect(screen.getByText('Sent')).toBeTruthy()
    expect(screen.getByText('Could not be sent')).toBeTruthy()
    expect(screen.getByText('Kept for the morning')).toBeTruthy()
    expect(screen.getByText('Not sent, because the person asked us not to or had already had their one for the day')).toBeTruthy()
    expect(screen.getByText('120')).toBeTruthy()
  })

  it('hides the whole section when activation could not be read, without affecting the rest of the tab', () => {
    render(<DropoffsTab data={{ ...BASE, activation: null }} />)
    expect(screen.queryByText('How far check-ins get')).toBeFalsy()
    expect(screen.queryByText('Leads who came back')).toBeFalsy()
    /* The rest of the tab still renders - "Avg days to first check-in" is always drawn. */
    expect(screen.getByText('Avg days to first check-in')).toBeTruthy()
  })
})

/**
 * THE BACK OFFICE FUNNEL: PEOPLE, NOT ONLY CHECK-INS (docs/answers-from-engine.md, 8 October, point
 * 2). Beside the check-in funnel above, on the same Drop-offs/Usage tab.
 */
describe('the people funnel, beside the check-in funnel, on the usage tab', () => {
  it('draws "How far people get" as a funnel and "Where the people who stopped are standing" as counts, with the engine’s own words for each row', () => {
    render(<DropoffsTab data={{
      ...BASE,
      activation: {
        reached: { created: 100, peopleAdded: 80, firstResponse: 60, enoughToReport: 40, firstInsight: 35, leadActed: 20, secondRound: 10 },
        now: { test: 5, abandonedBeforeValue: 3, abandonedAfterValue: 2, active: 90 },
        leadsWhoCameBack: 14,
        emails: { delivered: 120, failed: 2, held: 5, notSentOnPurpose: 8 },
        participants: {
          reached: { added: 146, invited: 141, reached: 141, verified: 146, engaged: 134, inAHabit: 1 },
          stuck: { notInvited: 5, invitedNotVerified: 0, verifiedNeverStarted: 12, startedNotFinished: 0, answeredOnceNotReturned: 36, wentQuiet: 97 },
        },
      },
    }} />)

    expect(screen.getByText('How far people get')).toBeTruthy()
    expect(screen.getByText('Added to a check-in')).toBeTruthy()
    expect(screen.getByText('Sent an invitation')).toBeTruthy()
    expect(screen.getByText('The invitation arrived')).toBeTruthy()
    expect(screen.getByText('Opened it and signed in')).toBeTruthy()
    expect(screen.getByText('Started a check-in')).toBeTruthy()
    expect(screen.getByText('Finished two or more, the latest in the last two weeks')).toBeTruthy()
    expect(screen.getAllByText('146')).toHaveLength(2)

    expect(screen.getByText('Where the people who stopped are standing')).toBeTruthy()
    expect(screen.getByText('Added and never sent an invitation')).toBeTruthy()
    expect(screen.getByText('Invited and has not signed in')).toBeTruthy()
    expect(screen.getByText('Signed in and has not started')).toBeTruthy()
    expect(screen.getByText('Started and not finished')).toBeTruthy()
    expect(screen.getByText('Answered once and has not come back')).toBeTruthy()
    expect(screen.getByText('Answered twice or more and has gone quiet')).toBeTruthy()
    expect(screen.getByText('97')).toBeTruthy()
  })

  it('hides the whole people funnel when `participants` is missing, without affecting the check-in funnel beside it', () => {
    render(<DropoffsTab data={{
      ...BASE,
      activation: {
        reached: { created: 100, peopleAdded: 80, firstResponse: 60, enoughToReport: 40, firstInsight: 35, leadActed: 20, secondRound: 10 },
        now: { test: 5, abandonedBeforeValue: 3, abandonedAfterValue: 2, active: 90 },
        leadsWhoCameBack: 14,
        emails: { delivered: 120, failed: 2, held: 5, notSentOnPurpose: 8 },
      },
    }} />)
    expect(screen.queryByText('How far people get')).toBeFalsy()
    expect(screen.queryByText('Where the people who stopped are standing')).toBeFalsy()
    /* The check-in funnel beside it still renders. */
    expect(screen.getByText('How far check-ins get')).toBeTruthy()
  })
})
