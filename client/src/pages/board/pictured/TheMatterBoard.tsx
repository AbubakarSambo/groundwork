import { theMatterWithoutTheClient } from '@/lib/the-matter-without-the-client'
import type { ReactNode } from 'react'
import { Section, Panel, ProofMark, Table } from '@/components/gw/ui'
import type { TheMatterBoard as TheBoard } from '@/lib/collect-whats-owed'
import './pictured-board.css'
import { theMorningNeedsNotOnTheBoard, WhatIsClosing, YourTeamToday } from './TheMorningOnTheBoard'
import { WhereThisIsHeading } from './ThePicturedSalesBoard'
import { ContradictionsSection } from '../TheSwitchboardsSections'

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
      <section aria-label={m.question}>
        <p className="pb-q">{m.question}</p>
        <p className="pb-answer">{m.intro}</p>
        {m.matters.length ? (
          <Table
            caption="Where each matter stands, with one line for its fees"
            phone="stack"
            minWidth={640}
            columns={[
              { key: 'matter', header: 'Matter', rowHeader: true, width: '24%' },
              { key: 'stands', header: 'Where it stands', width: '38%' },
              { key: 'fees', header: 'Its fees' },
            ]}
            rows={m.matters.map((x) => ({
              matter: x.name,
              stands: x.stands,
              fees: <>{x.feeMark !== 'none' && <ProofMark mark={x.feeMark} />} {x.fees}</>,
            }))}
          />
        ) : <p className="pb-answer">{m.mattersEmpty}</p>}
        <p className="pb-note">{m.feesNote}</p>
      </section>

      {m.decide && (
        <Section heading={m.decide.heading}>
          <Panel>
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
        </Section>
      )}

      {/* What is due in the next seven days and who has it, and the team's check-ins with a nudge for each, from her morning (boards audit M1). */}
      <WhatIsClosing b={b} />
      <YourTeamToday b={b} />

      {/* Where one person's own record says two different things, as the server served it to this reader (it walls them). */}
      {!!b?.contradictions?.length && <ContradictionsSection rows={b.contradictions} />}

      <Section heading={m.changed.heading} foot={m.changed.note}>
        {m.changed.rows.length ? (
          <>
            <Table
              caption="What changed this week, one row for each line"
              phone="stack"
              minWidth={640}
              columns={[
                { key: 'who', header: 'Who and what about', rowHeader: true, width: '20%' },
                { key: 'said', header: 'What was said' },
                { key: 'known', header: 'How it is known', width: '24%' },
                ...(m.changed.rows.some((r) => r.itChanged) ? [{ key: 'changed', header: 'What it changed', width: '24%' }] : []),
              ]}
              rows={m.changed.rows.map((r) => ({
                who: theMatterWithoutTheClient(r.who, r.matter, false) ? `${r.who}, on ${theMatterWithoutTheClient(r.who, r.matter, false)}` : r.who,
                said: r.said,
                known: <><ProofMark mark={r.mark} /> {r.markSays}</>,
                changed: r.itChanged,
              }))}
            />
            <div className="pb-legend" role="list" aria-label="How each line is known">
              {m.changed.legend.map((l) => (
                <span role="listitem" key={l.mark}><ProofMark mark={l.mark} /> {l.says}</span>
              ))}
            </div>
          </>
        ) : <Panel><p className="gwui-panel-text">{m.changed.empty}</p></Panel>}
      </Section>

      {/* Where this is heading, as the prototype's matter board and the collections board have it (boards audit M5). */}
      {b?.whereThisIsHeading && <WhereThisIsHeading b={b} onRecordTheDecision={onRecordTheDecision ?? (() => undefined)} readOnly={!onRecordTheDecision} />}
    </div>
  )
}
