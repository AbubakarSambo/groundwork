import type { ReactNode } from 'react'
import { Section, Panel, ProofMark } from '@/components/gw/ui'
import type { TheMatterBoard as TheBoard } from '@/lib/collect-whats-owed'
import './pictured-board.css'
import { theMorningNeedsNotOnTheBoard, WhatIsClosing, YourTeamToday } from './TheMorningOnTheBoard'
import { WhereThisIsHeading } from './ThePicturedSalesBoard'

/**
 * THE MATTER BOARD, AS PICTURED (Release 2, pull request 3 of 3; the kit's matter board,
 * docs/prototype/screens/B5-boards-every-check-in/matter-board.jpg). Everything here is what the server served this reader (`matter`
 * on the board), already walled at the server and already worded: this file only lays it out in the picture's order, and words
 * nothing of its own.
 *
 * Order, as the picture draws it: what the check-in covers; where each matter stands, with one line for its fees, beside what you
 * need to decide (whoever runs it only); what changed this week and what it changed, each line marked by how it is known, with the
 * legend under it.
 */
export function TheMatterBoard({ board: m, b = null, renderActions, onRecordTheDecision }: {
  board: TheBoard
  /** The whole board as served: the lead's morning (`theMorning`) and where this is heading, both served to her alone. */
  b?: any
  /** The board's own action buttons for a decision (BoardPage's ActionButtons). */
  renderActions?: (action: any) => ReactNode
  onRecordTheDecision?: () => void
}) {
  /* Her morning's needs lines that are not already a decision here (boards audit M1). */
  const morningNeeds = theMorningNeedsNotOnTheBoard(b, new Set((m.decide?.rows ?? []).map((d) => d.ref ?? d.question)))
  return (
    <div className="pb" data-matter-board>
      <p className="pb-matter-intro">{m.intro}</p>

      <section className={m.decide ? 'pb-head' : undefined} aria-label={m.question}>
        <div>
          <p className="pb-q">{m.question}</p>
          {m.matters.length ? m.matters.map((x) => (
            <div className="pb-card" key={x.key} data-matter={x.key} style={{ marginTop: 14 }}>
              <p className="pb-card-h">{x.name}</p>
              <p className="pb-matter-stands">{x.stands}</p>
              <p className="pb-matter-fees">
                {x.feeMark !== 'none' && <ProofMark mark={x.feeMark} />}
                <span>{x.fees}</span>
              </p>
            </div>
          )) : <p className="pb-answer">{m.mattersEmpty}</p>}
          <p className="pb-note">{m.feesNote}</p>
        </div>
        {m.decide && (
          <Panel heading={m.decide.heading}>
            {m.decide.rows.length ? m.decide.rows.map((d) => (
              <div className="pb-kv-list" key={d.question}>
                <p className="pb-card-h">{d.question}</p>
                {d.why && <p className="gwui-panel-text">{d.why}</p>}
                {/* What she can do about it, as every board draws a decision (boards audit M4). */}
                {!!d.action && renderActions && <div className="pb-issue-acts">{renderActions(d.action)}</div>}
              </div>
            )) : (morningNeeds.length ? null : <p className="gwui-panel-text">{m.decide.empty}</p>)}
            {morningNeeds.map((l) => (
              <div className="pb-kv-list" key={l.text}>
                <p className="pb-card-h">{l.row?.title ?? l.text}</p>
                {l.row?.detail && <p className="gwui-panel-text">{l.row.detail}</p>}
              </div>
            ))}
          </Panel>
        )}
      </section>

      {/* What is due in the next seven days and who has it, and the team's check-ins with a nudge for each, from her morning (boards audit M1). */}
      <WhatIsClosing b={b} />
      <YourTeamToday b={b} />

      <Section heading={m.changed.heading} foot={m.changed.note}>
        {m.changed.rows.length ? (
          <div>
            {m.changed.rows.map((r) => (
              <div className="pb-changed" key={r.id} data-changed={r.id}>
                <ProofMark mark={r.mark} />
                <span className="pb-changed-who">{r.matter ? `${r.who}, on ${r.matter}` : r.who}</span>
                <span>
                  {r.said}
                  {r.itChanged && <span className="pb-sub">{` ${r.itChanged}`}</span>}
                </span>
              </div>
            ))}
            <div className="pb-legend" role="list" aria-label="How each line is known">
              {m.changed.legend.map((l) => (
                <span role="listitem" key={l.mark}><ProofMark mark={l.mark} /> {l.says}</span>
              ))}
            </div>
          </div>
        ) : <Panel><p className="gwui-panel-text">{m.changed.empty}</p></Panel>}
      </Section>

      {/* Where this is heading, as the prototype's matter board and the collections board have it (boards audit M5). */}
      {b?.whereThisIsHeading && <WhereThisIsHeading b={b} onRecordTheDecision={onRecordTheDecision ?? (() => undefined)} readOnly={!onRecordTheDecision} />}
    </div>
  )
}
