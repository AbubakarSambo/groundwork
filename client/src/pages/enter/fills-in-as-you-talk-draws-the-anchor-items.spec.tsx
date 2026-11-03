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

/* Changed 3 November evening (Hafsah: "one quiet summary of what's been understood so far"): no "N of 7 set" count and no ticks.
   An item is there once the engine has heard it. */
describe('the panel, for an anchor draft', () => {
  it('draws no anchor item when no anchorItems is given', () => {
    render(<FillsInAsYouTalk {...nothingYet} />)
    expect(screen.queryByText(ANCHOR_ITEM_LABELS.responsibleFor)).toBeNull()
  })

  it('draws nothing it has not heard yet, when anchorItems is given but empty', () => {
    render(<FillsInAsYouTalk {...nothingYet} anchorItems={{}} />)
    for (const label of Object.values(ANCHOR_ITEM_LABELS)) expect(screen.queryByText(label)).toBeNull()
    expect(document.body.textContent).not.toMatch(/of 7 set|[✓○]/)
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
    expect(screen.getByText('Keeping the whole company moving, not just my own team.')).toBeTruthy()
    expect(screen.getByText('Everyone, not only sales.')).toBeTruthy()
    expect(screen.getByText('Projects keep clients paying, which pays everyone.')).toBeTruthy()
    expect(screen.getByText(ANCHOR_ITEM_LABELS.responsibleFor)).toBeTruthy()
    expect(screen.queryByText(ANCHOR_ITEM_LABELS.whyItBothersYou)).toBeNull()
    expect(screen.queryByText('How often')).toBeNull()
    expect(screen.queryByText('Who’s in it')).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })
})
