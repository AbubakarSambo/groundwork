import type { ReactNode } from 'react'
import { SCENARIO_FACTS, recommendedSessions } from '@/lib/scenario-catalog'
import '@/components/gw/ui/gw-ui.css'

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
 *
 * REBUILT FROM THE SHARED PARTS (group 3, piece 4, B1-starting-a-check-in): the old `cg-sit-card`,
 * `cg-sit-check`, `cg-moment`, `cg-arc`, `cg-meta` and `cg-more` classes (index.css) had no shared
 * equivalent for a selectable card with an expandable detail list, so this piece adds one -
 * `gwui-situation-card` and its parts, in gw-ui.css, at the old values (there is no prototype class
 * to read them from: this card is the product's own, the prototype's own B1 screens show the
 * conversational picker instead - see the comment on `CreateGroundPage`). Every attribute the
 * accessibility guard (`every-situation-card-has-a-name.spec.ts`) checks for - the `role="radio"`,
 * `aria-checked`, `aria-label` built from `label`, the `<div>{label}</div>`, the keyboard handler,
 * `aria-expanded`, and the `stopPropagation` on the disclosure button - is unchanged.
 */
export type SituationCardData = {
  cardKey: string
  scenario: string
  label: string
  /**
   * NO TAG, NO COLOURS. They were three fields per card and a third vocabulary beside the headings
   * and the labels; then, briefly, one derived from the group - which was correct and still said
   * the name of the heading the card was already sitting under, in caps, on every card in it. A
   * screen shows one group at a time, so it was the same word down the page.
   */
  /** The one line on the face. Her table's description, and the concrete moment moved to examples. */
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
      className={`gwui-situation-card${selected ? ' gwui-situation-card-selected' : ''}`}
      onClick={onPick}
    >
      {/*
        NO TAG. It said the name of the group the card was already sitting under, in caps, above
        every card in that group - so on a screen showing one group at a time it was the same word
        repeated down the page, and the first thing the eye hit on each card was the one thing on it
        that carried no information.
      */}
      <div className="gwui-situation-check-row">
        <div className="gwui-situation-check" />
      </div>
      <div className="gwui-situation-title">{label}</div>
      <p className="gwui-situation-moment">{card.moment}</p>

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
        className="gwui-situation-more"
        aria-expanded={expanded}
        onClick={(e) => { e.stopPropagation(); onToggleExpanded() }}
      >
        {expanded ? 'How it runs ‹' : 'How it runs ›'}
      </button>
      {expanded && (<>
        <dl className="gwui-situation-arc">
          <div>
            <dt>Agreed at the start</dt>
            <dd>{card.agreed}</dd>
          </div>
          <div>
            <dt>What the check-ins test</dt>
            <dd>{card.tests}</dd>
          </div>
          {facts?.notThisOneIf && (
            <div className="gwui-situation-arc-warn">
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

        {/*
          THE THREE NUMBERS FOLD WITH IT, and that is what "How it runs" was always a promise
          about. Cadence, length and a count sat open on every card in a grid of twenty-three -
          sixty-nine facts on one screen before anybody had chosen anything - under a disclosure
          called How it runs, while the running was already showing.
        */}
        <dl className="gwui-situation-meta">
          <div><dt>Recommended cadence</dt><dd>{facts?.cadence}</dd></div>
          {/* "USUALLY", BECAUSE THE LEAD SETS THE TIMEFRAME AND THIS CARD DOES NOT.
              The entry chat's own card hedged every one of these - "typically 90 days" - and a
              guard held it, on the grounds that a bare duration reads as a commitment the product
              has not made. This card said "Runs for 90 days" flatly. Now that one card serves both
              doors the stricter of the two rules is the one that survives; it costs a word. */}
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
      </>)}
    </div>
  )
}
