import type { ReactNode } from 'react'
import { SCENARIO_FACTS, recommendedSessions } from '@/lib/scenario-catalog'

/**
 * ONE SITUATION CARD, DRAWN ONCE, FOR BOTH PICKERS.
 *
 * Her words, twice: "the entry chat and the in platform scenario picker look different", and then
 * again after the lists had been reconciled - "the scenario cards on the entry chat still look
 * different from what's in the wizard, this one looks off".
 *
 * She was right both times, and reconciling the LISTS was never going to fix it. The two pickers
 * offered the same twenty-two situations, filed in the same groups, and drew them with two different
 * components: `/grounds/new` had a coloured tag, a 14.5px title, the moment you would open the app
 * ("You hired a sales lead. They start Monday."), and a "How it runs" disclosure with what gets
 * agreed and what the check-ins test. `/start` had a smaller title, a 9.5px italic "typically 90
 * days", and an "i" that opened a paragraph. Same situation, two objects.
 *
 * WHICH IS WHY THIS IS A COMPONENT AND NOT A SHARED STYLESHEET. Two files rendering the same data
 * to the same design is a promise that has to be kept by hand every time either one is touched, and
 * the history of this pair is that it never was. There is one card now; a change to it is a change
 * to both doors, and there is nowhere for a difference to live.
 *
 * THE WIZARD'S VERSION WON, and not by seniority. It says what the situation IS in a sentence you
 * can recognise yourself in, and what the run actually does - the two things somebody picking needs
 * and the entry chat's version did not carry. What the entry chat had that was better - showing this
 * to a person with no account - it keeps, because that is where it is used, not what it looks like.
 */
export type SituationCardData = {
  cardKey: string
  scenario: string
  label: string
  tag: string
  tagBg: string
  tagColor: string
  /** The one line on the face: the moment you would open the app, not a description. */
  moment: string
  agreed: string
  tests: string
  examples?: string[]
}

export function SituationCard({
  card,
  label,
  selected = false,
  expanded,
  onToggleExpanded,
  onPick,
  focusable = false,
  extra,
}: {
  card: SituationCardData
  /** The card's name as this surface says it - the describe-your-own card is about the reader. */
  label: string
  selected?: boolean
  expanded: boolean
  onToggleExpanded: () => void
  onPick: () => void
  focusable?: boolean
  /** Anything this surface adds under the title, e.g. the wizard's "you write it on the next screen". */
  extra?: ReactNode
}) {
  const facts = SCENARIO_FACTS[card.scenario as keyof typeof SCENARIO_FACTS]
  const sessions = recommendedSessions(card.scenario as any)

  return (
    <div
      role="radio"
      tabIndex={focusable ? 0 : -1}
      aria-checked={selected}
      aria-label={`${label}. ${card.moment} ${card.agreed}`}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onPick()
        }
      }}
      className={`cg-sit-card${selected ? ' selected' : ''}`}
      onClick={onPick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: card.tagBg, color: card.tagColor }}>{card.tag}</span>
        <div className="cg-sit-check" />
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{label}</div>
      <p className="cg-moment">{card.moment}</p>

      {extra}

      {/*
        * THE DISCLOSURE IS A BUTTON INSIDE A RADIO, WHICH IS INVALID, AND IT IS DELIBERATE HERE.
        *
        * The alternative - the whole card being a button with this beside it - was tried on the
        * entry chat and produced twenty-two unnamed buttons in the accessibility tree, because the
        * only named control in each group was the "i". A radio with a nested button is at least
        * named and reachable; the stopPropagation is what keeps opening it from picking it.
        */}
      <button
        type="button"
        className="cg-more"
        aria-expanded={expanded}
        onClick={(e) => { e.stopPropagation(); onToggleExpanded() }}
      >
        {expanded ? 'How it runs ‹' : 'How it runs ›'}
      </button>
      {expanded && (
        <dl className="cg-arc">
          <div>
            <dt>Agreed at the start</dt>
            <dd>{card.agreed}</dd>
          </div>
          <div>
            <dt>What the check-ins test</dt>
            <dd>{card.tests}</dd>
          </div>
          {facts?.notThisOneIf && (
            <div className="warn">
              <dt>Not this one if</dt>
              <dd>{facts.notThisOneIf}</dd>
            </div>
          )}
          {card.examples && card.examples.length > 0 && (
            <div>
              <dt>Also this</dt>
              <dd>{card.examples.map((ex, i) => <div key={i}>{ex}</div>)}</dd>
            </div>
          )}
        </dl>
      )}

      <dl className="cg-meta">
        <div><dt>Recommended cadence</dt><dd>{facts?.cadence}</dd></div>
        {/* "USUALLY", BECAUSE THE LEAD SETS THE TIMEFRAME AND THIS CARD DOES NOT.
            The entry chat's own card hedged every one of these - "typically 90 days" - and a guard
            held it, on the grounds that a bare duration reads as a commitment the product has not
            made. This card said "Runs for 90 days" flatly. Now that one card serves both doors the
            stricter of the two rules is the one that survives; it costs a word. */}
        <div>
          <dt>Usually runs for</dt>
          <dd>
            {facts?.ongoing
              ? 'As long as you need'
              : facts?.timelineDays === 1
                ? 'One check-in'
                : `${facts?.timelineDays} days`}
          </dd>
        </div>
        <div><dt>Check-ins</dt><dd>{sessions}</dd></div>
      </dl>
    </div>
  )
}
