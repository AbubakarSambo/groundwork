import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { WhatToProbeThemOn } from '@/components/gw/WhatToProbeThemOn'

const PROBE_SRC = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'WhatToProbeThemOn.tsx'), 'utf8')

/**
 * THE CONFIDENCE READ EXISTED ON THE SERVER AND NOWHERE ELSE. W14-1.
 *
 * `what-a-leader-can-weigh.ts` and `harder-to-fool.ts` have been producing this for months: the
 * lead's own words for what doing well means, what the record holds against them, **the standards
 * nothing ever reached**, and where each account is thin with the thing that would settle it.
 *
 * MOVED FROM THE DEAD REPORT BODY. This used to render `ReportBody` (`ReportPage.tsx`) as source
 * text, because that was the only place any of this was drawn. It now renders the live component,
 * `WhatToProbeThemOn` (`SessionReportPage.tsx`'s lead-only surface), which the weigh section and the
 * soft spots both moved into.
 *
 * THREE RULES FROM THE MODULES' OWN DESIGN NOTES, carried over unchanged: each is a decision about
 * what must NOT appear.
 */
const weigh = {
  whatYouSaidGoodMeans: [{ text: 'The rota is written down and held to', session: 0 }],
  whatTheRecordHolds: [{ kind: 'COMMITMENT', text: 'I will publish the rota by Friday', session: 1 }],
  whatNobodyHasEvidenceFor: [] as string[],
  note: 'Three things you said mattered were never reached.',
}

describe('the weigh section reaches the page', () => {
  it('renders the three parts, in the order the module builds them', () => {
    const { container } = render(<WhatToProbeThemOn reads={[]} weigh={weigh} weighNote="This is material, not a verdict." />)
    const html = container.innerHTML
    const a = html.indexOf('The rota is written down and held to')
    const b = html.indexOf('I will publish the rota by Friday')
    const c = html.indexOf('Everything you named was reached by something somebody said.')
    expect(a).toBeGreaterThan(-1)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })

  it('and "what nobody has evidence for" says so rather than rendering an empty list', () => {
    // The part that earns the section: absence is invisible, so an empty list would read as
    // "nothing to see" when it means the opposite.
    render(<WhatToProbeThemOn reads={[]} weigh={weigh} weighNote="x" />)
    expect(screen.getByText('Everything you named was reached by something somebody said.')).toBeTruthy()
  })

  it('it carries the module\'s own note, and the standing caveat, not one instead of the other', () => {
    render(<WhatToProbeThemOn reads={[]} weigh={weigh} weighNote="This is material, not a verdict." />)
    expect(screen.getByText(weigh.note)).toBeTruthy()
    expect(screen.getByText('This is material, not a verdict.')).toBeTruthy()
  })
})

describe('the soft spots reach the page', () => {
  const softSpots = { 'p-a': [{ line: 'Nothing else in this ground touches any part of this account.', wouldRaiseIt: 'One other person mentioning the same work would.' }] }

  it('where the picture is thin, per account, and every spot carries what would settle it', () => {
    render(<WhatToProbeThemOn reads={[]} softSpots={softSpots} nameFor={() => 'Baraka'} />)
    expect(screen.getByText('Where this picture is thin')).toBeTruthy()
    expect(screen.getByText('Nothing else in this ground touches any part of this account.')).toBeTruthy()
    expect(screen.getByText('One other person mentioning the same work would.')).toBeTruthy()
  })

  it('worded about the record, never about the person', () => {
    /**
     * `confidence-in-the-picture.ts`: "low specificity" reads as a judgement of somebody; "we are
     * not confident this part of the picture is complete" is the same fact without the verdict.
     * A record can be thin. A person cannot be thin.
     */
    const { container } = render(<WhatToProbeThemOn reads={[]} softSpots={softSpots} nameFor={() => 'Baraka'} />)
    expect(screen.getByText('Not a mark on anybody. It is what the record cannot yet support, and what would settle it.')).toBeTruthy()
    expect(container.textContent).not.toMatch(/low specificity/i)
  })
})

describe('the engine\'s own markers do not reach the reader raw', () => {
  /**
   * `[INFERRED: <reason>]` is how the engine marks something it concluded rather than heard.
   * The weigh section is the one surface whose whole promise is the lead's own words, so a marker
   * found there is split out and labelled rather than printed raw or deleted silently.
   */
  it('the marker is split out of the text, labelled rather than deleted', () => {
    const marked = {
      ...weigh,
      whatYouSaidGoodMeans: [{ text: 'him deciding anything without checking with me first [INFERRED: Implied that success is seeing him act with independent judgment]', session: 0 }],
    }
    render(<WhatToProbeThemOn reads={[]} weigh={marked} />)
    expect(screen.getByText(/him deciding anything without checking with me first/)).toBeTruthy()
    expect(screen.queryByText(/\[INFERRED/)).toBeNull()
    expect(screen.getByText('inferred')).toBeTruthy()
  })
})

describe('what must not appear', () => {
  it('nothing renders for a reader with no probes, no weigh and nothing thin', () => {
    const { container } = render(<WhatToProbeThemOn reads={[]} weigh={null} softSpots={null} />)
    expect(container.textContent).toBe('')
  })

  it('the specificity score is not rendered anywhere on this surface', () => {
    /**
     * The sharpest rule in `what-a-leader-can-weigh.ts`: specificity measures how somebody
     * WRITES, and using it as a proxy for how they work is "the quiet unfairness this product
     * exists to prevent". It belongs to the person as feedback on their own record, never to a
     * lead as a number beside their name.
     */
    expect(PROBE_SRC).not.toMatch(/specificityLevel|specificityScore|specificitySignal/)
  })

  it('and nothing on this surface synthesises the weigh section itself', () => {
    /**
     * `whatALeaderCanWeigh` returns null unless `isClosing`, so the page shows this only when the
     * server sends it. Asserted as the absence of a client-side override: if this component ever
     * synthesises the section itself, that constraint is gone.
     */
    expect(PROBE_SRC).not.toMatch(/whatALeaderCanWeigh\(/)
  })
})

/*
 * HAFSAH, 1 OCTOBER (request 99). The two explaining sentences dropped in the move are back, word for
 * word, and the person a one-person check-in is about is never called the lead.
 */
describe('the two sentences under the starting point and what it rested on', () => {
  const startedAt = [{ text: 'Two shops were open.', session: 1 }]
  const restedOn = ['The supplier delivers on time.']
  it('"What you said it rested on" carries its sentence, word for word', () => {
    render(<WhatToProbeThemOn weigh={weigh} restedOn={restedOn} startedAt={startedAt} />)
    expect(screen.getByText('What you said it rested on')).toBeTruthy()
    expect(screen.getByText('These were not in their hands. Read anything unmet above against them first.')).toBeTruthy()
  })
  it('"Where this stood at the start" carries its sentence, word for word', () => {
    render(<WhatToProbeThemOn weigh={weigh} restedOn={restedOn} startedAt={startedAt} />)
    expect(screen.getByText('Where this stood at the start')).toBeTruthy()
    expect(screen.getByText('Written at the beginning and left as it was. Read what people shared above against it.')).toBeTruthy()
  })
})

describe('the person a check-in is about reads it as theirs, not as the lead', () => {
  it('is never called the lead, and still sees the section, worded for them', () => {
    const { container } = render(<WhatToProbeThemOn weigh={weigh} restedOn={['The supplier delivers on time.']} readerRunsIt={false} />)
    const text = container.textContent ?? ''
    expect(text).not.toContain('Yours as the lead')
    expect(text).not.toContain('What you said good would mean')
    expect(screen.getByText('What your lead is looking for')).toBeTruthy()
    expect(screen.getByText('What your lead said good would mean')).toBeTruthy()
    expect(screen.getByText('What your lead said it rested on')).toBeTruthy()
    expect(screen.getByText('These were not in their hands. Read anything unmet above against them first.')).toBeTruthy()
    expect(screen.getByText('The rota is written down and held to')).toBeTruthy()
  })
  it('and the lead still reads it as the lead', () => {
    render(<WhatToProbeThemOn weigh={weigh} />)
    expect(screen.getByText('Yours as the lead')).toBeTruthy()
    expect(screen.getByText('What to ask each person')).toBeTruthy()
  })
})
