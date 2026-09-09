import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatToProbeThemOn } from './WhatToProbeThemOn'
import { HowSpecificThisSessionWas } from './HowSpecificThisSessionWas'

/**
 * TWO ENGINES THAT RENDERED ON THE WRONG PAGE.
 *
 * `what-a-leader-can-weigh` is lead-scoped and rendered on the ground report only. It is about the
 * whole ground, so it belongs on both: there because that is the ground's report, here because this
 * is where a lead lands after a session and decides what to say. Same object, nothing recomputed.
 *
 * `softSpots` / `whatWouldRaiseIt` rendered for the lead about each participant. The person never
 * saw the engine's read of their own account; the meter said it with a hand-written sentence. When
 * the engine has a read, the meter shows it; when it has none, the sentence stays.
 *
 * On a live mid-run ground both are legitimately empty: the weigh read is a closing-session read by
 * design (G10), and every soft-spot rule needs two sessions, three specifics or a document. So the
 * proof is a render test, not a screenshot of an empty ground.
 */
const weigh = {
  whatYouSaidGoodMeans: [{ text: 'The rota is written down and held to', session: 0 }],
  whatTheRecordHolds: [{ kind: 'COMMITMENT', text: 'I will publish the rota by Friday', session: 1 }],
  whatNobodyHasEvidenceFor: ['Nights are covered without calling the lead'],
  note: 'One thing you said mattered was never reached.',
}

describe('the lead weighs on the session page too', () => {
  it('renders the weigh section when the server sends one', () => {
    render(<WhatToProbeThemOn reads={[]} weigh={weigh} weighNote="This is material, not a verdict." />)
    expect(screen.getByText('What you said you were looking for, and what the record holds')).toBeTruthy()
    expect(screen.getByText('The rota is written down and held to')).toBeTruthy()
    expect(screen.getByText('Nights are covered without calling the lead')).toBeTruthy()
    expect(screen.getByText('This is material, not a verdict.')).toBeTruthy()
  })

  it('and nothing about it when there is none, rather than an empty heading', () => {
    render(<WhatToProbeThemOn reads={[]} weigh={null} />)
    expect(screen.queryByText('What you said you were looking for, and what the record holds')).toBeNull()
  })
})

describe('the meter shows the engine\'s own read of thinness', () => {
  const spots = [{ line: 'Nothing else in this ground touches any part of this account.', wouldRaiseIt: 'One other person mentioning the same work would.' }]

  it('replaces the hand-written line when the engine has a read', () => {
    render(<HowSpecificThisSessionWas level="medium" recall="low" spots={spots} />)
    expect(screen.getByText(/Nothing else in this ground touches/)).toBeTruthy()
    expect(screen.getByText(/One other person mentioning/)).toBeTruthy()
    expect(screen.queryByText(/One date, one number or one document/)).toBeNull()
  })

  it('and keeps the line when the engine has none', () => {
    render(<HowSpecificThisSessionWas level="medium" recall="low" spots={[]} />)
    expect(screen.getByText(/One date, one number or one document/)).toBeTruthy()
  })
})
