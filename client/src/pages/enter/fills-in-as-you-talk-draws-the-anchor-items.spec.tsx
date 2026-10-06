import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FillsInAsYouTalk, type WhatSetupKnows, ANCHOR_ITEM_LABELS } from './FillsInAsYouTalk'

/*
 * THE SEVEN-ITEM PANEL, ANCHOR DRAFT ONLY (plan piece 3, docs/anchor-scenario.md section 7).
 *
 * Every other situation keeps the four rows this panel has always drawn (covered already by
 * fills-in-as-you-talk-as-the-lead-reads-it.spec.tsx, unchanged by this piece); this file checks
 * only the new branch, which draws only when `anchorItems` is given.
 */

const nothingYet: WhatSetupKnows = {
  name: '', situation: '', cadence: 'FORTNIGHTLY', cadenceChosen: false, workingDays: [], startsOn: '', endsOn: '', mentioned: [], added: [],
}

describe('the panel, for an anchor draft', () => {
  it('draws the ordinary four rows when no anchorItems is given', () => {
    render(<FillsInAsYouTalk {...nothingYet} />)
    expect(screen.getByText('0 of 4 set')).toBeTruthy()
    expect(screen.queryByText(ANCHOR_ITEM_LABELS.responsibleFor)).toBeNull()
  })

  it('draws all seven items, unset, when anchorItems is given but empty', () => {
    render(<FillsInAsYouTalk {...nothingYet} anchorItems={{}} />)
    expect(screen.getByText('0 of 7 set')).toBeTruthy()
    for (const label of Object.values(ANCHOR_ITEM_LABELS)) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(7)
    expect(rows.every((r) => r.textContent?.startsWith('○'))).toBe(true)
  })

  it('fills each item in as the engine sends it, and never shows the four-row fields', () => {
    render(<FillsInAsYouTalk
      {...nothingYet}
      name="Help my team understand"
      anchorItems={{
        responsibleFor: 'Keeping the whole company moving, not just my own team.',
        tryingToMove: 'Everyone, not only sales.',
        howItContributes: 'Projects keep clients paying, which pays everyone.',
      }}
    />)
    expect(screen.getByText('3 of 7 set')).toBeTruthy()
    expect(screen.getByText('Keeping the whole company moving, not just my own team.')).toBeTruthy()
    expect(screen.getByText('Everyone, not only sales.')).toBeTruthy()
    expect(screen.getByText('Projects keep clients paying, which pays everyone.')).toBeTruthy()
    expect(screen.queryByText('How often')).toBeNull()
    expect(screen.queryByText('Who’s in it')).toBeNull()
    const rows = screen.getAllByRole('listitem')
    expect(rows.filter((r) => r.textContent?.startsWith('✓'))).toHaveLength(3)
    expect(rows.filter((r) => r.textContent?.startsWith('○'))).toHaveLength(4)
  })
})
