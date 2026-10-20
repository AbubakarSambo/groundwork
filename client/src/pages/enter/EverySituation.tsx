import { useEffect, useRef, useState } from 'react'
import { scrollTo } from '@/lib/scroll-to'
import { SCENARIOS, groupOfCard, type ScenarioCard } from '@/pages/grounds/CreateGroundPage'
import { sentenceCase } from '@/pages/grounds/how-a-row-reads'
import { EVERY_SITUATION, FOR_EXAMPLE, HOW_IT_WORKS, THE_DOOR_SIGNED_OUT, THE_GROUPS_IN_ORDER, THE_ONE_LINE, orderWithinGroup } from './the-way-in'

/*
 * EVERY SITUATION IN ONE LIST (U.6, B1): #/start/all.
 *
 * For someone who would rather browse than describe. Every card the catalogue offers is here, under
 * the prototype's headings and in its order, each with its one line. Pressing a card only picks it:
 * the panel beside the list says what it starts the conversation with, and "Start with this" sends
 * that sentence. "Work through something else" and "Describe it" both go to describing it in your
 * own words, because that situation has no opening sentence of its own.
 */

/** A card offered only where the organisation's switch says so (Release 2's "Collect what's owed"), with the heading it sits under. */
export interface ACardBehindASwitch {
  card: ScenarioCard
  group: (typeof THE_GROUPS_IN_ORDER)[number]['key']
  /** Its own "For example" lines, since it has none in the list every card shares. */
  forExample: [string, string]
}

/**
 * The cards under one heading, in the prototype's order. "Work through something else" ends the last group. A card behind a
 * switch goes last under its heading, and only when it is passed: with none passed, the list is exactly what it was.
 */
export function cardsUnder(group: (typeof THE_GROUPS_IN_ORDER)[number]['key'], alsoOffered: readonly ACardBehindASwitch[] = []): ScenarioCard[] {
  return [
    ...SCENARIOS
      .filter((c) => (c.scenario === 'OPEN_READ' ? group === 'off' : groupOfCard(c) === group))
      .sort((a, b) => orderWithinGroup(a.cardKey) - orderWithinGroup(b.cardKey)),
    ...alsoOffered.filter((x) => x.group === group).map((x) => x.card),
  ]
}

export function theOneLine(card: ScenarioCard): string {
  return THE_ONE_LINE[card.cardKey] ?? card.moment
}

export function EverySituation({
  signedIn,
  openerFor,
  onSend,
  onStart,
  onDescribe,
  alsoOffered = [],
}: {
  signedIn: boolean
  /** Cards offered only where the organisation's switch is on, as the server says. None by default. */
  alsoOffered?: readonly ACardBehindASwitch[]
  /** The sentence a card starts the conversation with, or nothing when it has none. */
  openerFor: (card: ScenarioCard) => string | undefined
  onSend: (text: string) => void
  onStart: (card: ScenarioCard, opener: string) => void
  onDescribe: () => void
}) {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<ScenarioCard | null>(null)
  const opener = picked ? openerFor(picked) : undefined
  const forExample = picked ? (FOR_EXAMPLE[picked.cardKey] ?? alsoOffered.find((x) => x.card.cardKey === picked.cardKey)?.forExample) : undefined
  /* On a narrow screen the panel sits under the whole list, so picking brings it into view. */
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (picked) scrollTo(panel.current, { block: 'nearest' })
  }, [picked])

  return (
    <div style={{ width: '100%', maxWidth: 1080, margin: '0 auto', display: 'flex', gap: 36, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 420px', minWidth: 0 }}>
        <h1 style={{ fontFamily: 'var(--gw-font-name)', fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 500, lineHeight: 1.2, color: 'var(--gw-text)', margin: '0 0 8px' }}>
          {EVERY_SITUATION.heading}
        </h1>
        <p style={{ fontSize: 15.5, color: 'var(--gw-sub)', lineHeight: 1.6, margin: '0 0 14px' }}>{EVERY_SITUATION.help}</p>
        <div style={{ display: 'flex', gap: 8, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 8, marginBottom: 24 }}>
          <input
            className="gw-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) onSend(text.trim()) }}
            placeholder={THE_DOOR_SIGNED_OUT.placeholder}
            aria-label={EVERY_SITUATION.heading}
            style={{ flex: 1, minWidth: 0, border: 0 }}
          />
          <button type="button" className="gw-btn" disabled={!text.trim()} onClick={() => onSend(text.trim())}>
            {EVERY_SITUATION.start}
          </button>
        </div>

        {THE_GROUPS_IN_ORDER.map((group) => (
          <section key={group.key} style={{ marginBottom: 22 }} aria-label={group.heading}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-text)', margin: '0 0 10px' }}>{group.heading}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {cardsUnder(group.key, alsoOffered).map((card) => {
                const chosen = picked?.cardKey === card.cardKey
                return (
                  <button
                    className={`gwui-choice-card${chosen ? ' gwui-choice-card-on' : ''}`}
                    key={card.cardKey}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => (card.scenario === 'OPEN_READ' ? onDescribe() : setPicked(card))}
                  >
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>{sentenceCase(card.label)}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.45 }}>{theOneLine(card)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 18px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gw-text)' }}>{EVERY_SITUATION.somethingElse}</div>
            <div style={{ fontSize: 13.5, color: 'var(--gw-sub)' }}>{EVERY_SITUATION.somethingElseHelp}</div>
          </div>
          <button type="button" className="gw-btn-sec" onClick={onDescribe}>{EVERY_SITUATION.describeIt}</button>
        </div>
      </div>

      {picked && (
        <aside ref={panel} aria-label={EVERY_SITUATION.youPicked} style={{ flex: '0 1 320px', background: 'white', border: '1px solid var(--gw-text)', borderRadius: 10, padding: 20, position: 'sticky', top: 16 }}>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 6 }}>{EVERY_SITUATION.youPicked}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 8 }}>{sentenceCase(picked.label)}</div>
          <p style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.5, margin: '0 0 12px' }}>{theOneLine(picked)}</p>
          {HOW_IT_WORKS[picked.cardKey] && (
            <p style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.5, margin: '0 0 12px' }}>{HOW_IT_WORKS[picked.cardKey]}</p>
          )}
          {!!forExample && (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 4 }}>{EVERY_SITUATION.forExample}</div>
              {forExample.map((e) => (
                <p key={e} style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.5, margin: '0 0 8px' }}>{e}</p>
              ))}
            </>
          )}
          {opener && (
            <>
              <button type="button" className="gw-btn" style={{ width: '100%', margin: '6px 0 10px' }} onClick={() => onStart(picked, opener)}>
                {EVERY_SITUATION.startWithThis}
              </button>
              <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, margin: '0 0 8px' }}>{EVERY_SITUATION.itStartsWith(opener)}</p>
            </>
          )}
          {!signedIn && (
            <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, margin: 0 }}>{EVERY_SITUATION.noAccountNeeded}</p>
          )}
        </aside>
      )}
    </div>
  )
}
