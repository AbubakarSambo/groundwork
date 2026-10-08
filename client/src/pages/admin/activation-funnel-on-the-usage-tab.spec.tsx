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
    expect(screen.getByText('A second round finished')).toBeTruthy()
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
