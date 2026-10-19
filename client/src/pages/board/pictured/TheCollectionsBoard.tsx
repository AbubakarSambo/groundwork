import { Section, Panel, Tag, ProofMark } from '@/components/gw/ui'
import type { TheCollectionsBoard as TheBoard, TheCollectionsTeamReport, TheCollectionsOwnReport } from '@/lib/collect-whats-owed'
import './pictured-board.css'

/**
 * THE COLLECTIONS BOARD, AS PICTURED (Release 2, pull request 2 of 3). The loans type is the kit's loans board
 * (docs/prototype/screens/B5-boards-every-check-in/loans-board.jpg); the fee notes and invoices type takes the same shape in the
 * organisation's own word for the bill. Everything here is what the server served this reader (`collections` on the board), already
 * walled at the server and already worded: this file only lays it out in the picture's order, and words nothing of its own.
 *
 * Order, as the picture draws it: the question and its answer beside What needs you; where they stand; every one, and what shows
 * it; the patterns; follow-up given; what the systems show; where this is heading (served to whoever runs the check-in only).
 */
const GROUP_TONE: Record<string, 'proven' | 'attention' | 'concern' | 'plain'> = {
  paid: 'proven', 'on-track': 'proven', 'behind-in-touch': 'attention', blocked: 'attention', 'not-heard': 'concern', 'on-event': 'plain', 'not-raised': 'plain',
}

type ARoute = { method: 'POST'; path: string; body: Record<string, unknown> }

export function TheCollectionsBoard({ board: c, onRecordTheDecision, onAnswer, answering }: { board: TheBoard; onRecordTheDecision?: () => void; onAnswer?: (route: ARoute) => void; answering?: boolean }) {
  const loans = c.type === 'loans'
  return (
    <div className="pb" data-collections-board={c.type}>
      <section className="pb-head" aria-label={c.question}>
        <div>
          <p className="pb-q">{c.question}</p>
          <p className="pb-answer">{c.answer}</p>
          {c.bar && (
            <div className="pb-bar" role="img" aria-label={`${c.bar.proven}% paid with proof, and ${c.bar.said}% on somebody’s word only.`}>
              <span className="pb-bar-done" style={{ width: `${c.bar.proven}%` }} />
              <span className="pb-bar-likely" style={{ width: `${c.bar.said}%` }} />
            </div>
          )}
          <p className="pb-note">{c.answerFrom}</p>
        </div>
        <Panel heading={c.needsYou.heading}>
          {c.needsYou.rows.length ? c.needsYou.rows.map((r) => (
            <div className="pb-kv-list" key={r.title}>
              <p className="pb-card-h">{r.title}</p>
              <p className="gwui-panel-text">{r.says}</p>
            </div>
          )) : (c.needsYou.empty ? <p className="gwui-panel-text">{c.needsYou.empty}</p> : null)}
          {(c.needsYou.toConfirm ?? []).map((q) => (
            <div className="pb-kv-list" key={q.id} data-to-confirm={q.id}>
              <p className="pb-card-h">{q.title}</p>
              <p className="gwui-panel-text">{q.says}</p>
              {onAnswer && (
                <div className="pb-choices">
                  {q.choices.map((ch) => (
                    <button
                      key={ch.label}
                      type="button"
                      className={`gwui-btn ${/^No\b/.test(ch.label) ? 'gwui-btn-quiet' : 'gwui-btn-secondary'}`}
                      disabled={answering}
                      onClick={() => onAnswer(ch.route)}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Panel>
      </section>

      <Section heading={c.stand.heading} note={c.stand.total}>
        <div className="pb-cards4">
          {c.stand.groups.map((g) => (
            <Panel key={g.group}>
              <div className="pb-card-top">
                <b>{g.label}</b>
                <Tag tone={g.count ? GROUP_TONE[g.group] : 'plain'}>{g.count}</Tag>
              </div>
              <p className="gwui-panel-text pb-sub">{g.says}</p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section heading={c.every.heading} note={c.every.note} foot={c.every.foot ?? undefined}>
        {c.every.rows.length ? (
          <div className="pb-grid">
            <table>
              <thead><tr>{c.every.columns.map((h) => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {c.every.rows.map((r) => (
                  <tr key={r.id}>
                    {loans ? (
                      <>
                        <td><b>{r.who}</b>{r.amount && <div className="pb-sub">{r.amount}</div>}</td>
                        <td>{r.business}</td>
                        <td>{r.sales}</td>
                        <td>{r.repayment && <Tag tone={r.repayment.tone}>{r.repayment.says}</Tag>}<div className="pb-sub">{r.payment.says}</div></td>
                        <td>{r.inTheWay}</td>
                        <td>{r.next}</td>
                      </>
                    ) : (
                      <>
                        <td><b>{r.who}</b>{r.matter && <div className="pb-sub">{r.matter}</div>}</td>
                        <td>{r.number ?? 'Not raised yet'}</td>
                        <td>{r.amount ?? 'Not said yet'}</td>
                        <td>{r.followsUp}</td>
                        <td>{r.fallsDue}</td>
                        <td>
                          {r.payment.mark !== 'none' && <ProofMark mark={r.payment.mark} />} {r.payment.says}
                          {r.proof.map((p) => <div className="pb-sub" key={p}>{p}</div>)}
                        </td>
                        <td>{r.inTheWay}</td>
                        <td>{r.next}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Panel><p className="gwui-panel-text">{c.every.empty}</p></Panel>}
      </Section>

      <Section heading={c.patterns.heading} note={c.patterns.note} foot={c.patterns.foot}>
        <Panel>
          {c.patterns.rows.length ? c.patterns.rows.map((p) => (
            <div className="pb-card-top" key={p.title}>
              <div><p className="pb-card-h">{p.title}</p><p className="gwui-panel-text">{p.says}</p></div>
              <Tag tone="action">{p.tag}</Tag>
            </div>
          )) : <p className="gwui-panel-text">{c.patterns.empty}</p>}
        </Panel>
      </Section>

      <Section heading={c.followUp.heading}>
        <Panel>
          {c.followUp.rows.length ? c.followUp.rows.map((f) => (
            <div className="pb-kv" key={f.what}><b>{f.what}</b><span>{`${f.howMany}. ${f.whatFollowed}`}</span></div>
          )) : <p className="gwui-panel-text">{c.followUp.empty}</p>}
        </Panel>
      </Section>

      <Section heading={c.systems.heading}>
        <Panel><p className="gwui-panel-text">{c.systems.says}</p></Panel>
      </Section>

      {c.heading && (
        <Section heading={c.heading.heading}>
          <div className="pb-heading">
            <div>
              <h3 className="pb-small-h">The possible outcomes</h3>
              {c.heading.outcomes.length ? c.heading.outcomes.map((o) => (
                <div className="pb-outcome" key={o.says}>{o.says}<span className="pb-outcome-sub">{o.more}</span></div>
              )) : <p className="gwui-panel-text">{c.heading.outcomesSays}</p>}
            </div>
            <div>
              <h3 className="pb-small-h">The signals behind them</h3>
              {c.heading.signals.length ? c.heading.signals.map((s) => (
                <div className="pb-signal" key={s.says}>
                  <span><b>{s.says}</b><span className="pb-sub">{` ${s.from}.`}</span></span>
                  <Tag tone={s.tone === 'concern' ? 'concern' : 'attention'}>{s.tone === 'concern' ? 'Concern' : 'Watch'}</Tag>
                </div>
              )) : <p className="gwui-panel-text">{c.heading.signalsSays}</p>}
              <Panel heading="What would settle it"><p className="gwui-panel-text">{c.heading.whatWouldSettleIt}</p></Panel>
              <div className="pb-decides">
                <b>{c.heading.whoDecides}</b>
                <p>{c.heading.groundworkDoesNotChoose}</p>
                {onRecordTheDecision && <button type="button" className="gwui-btn gwui-btn-secondary" onClick={onRecordTheDecision}>Record the decision</button>}
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}

/** The team's report on the bills, in the full shape, as the server words it (to whoever runs the check-in). */
export function TheCollectionsTeamReportSections({ r }: { r: TheCollectionsTeamReport }) {
  return (
    <div className="pb" data-collections-report="team">
      {/* The page's own title is the report's title (ThePicturedTeamReport). */}
      <Section heading="In short">
        <div className="pb-in-short">{r.inShort.map((x) => <p className="pb-read" key={x}>{x}</p>)}</div>
      </Section>
      <Section heading="What moved"><Panel>{r.whatMoved.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>)}</Panel></Section>
      <Section heading="What each person said">
        <Panel>
          {r.eachPerson.map((p) => (
            <div className="pb-kv" key={p.who}><b><ProofMark mark={p.mark} /> {p.who}</b><span>{p.says}</span></div>
          ))}
        </Panel>
      </Section>
      <Section heading="Where people see it differently"><Panel>{r.seeItDifferently.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>)}</Panel></Section>
      <Section heading="What this report can’t tell you"><Panel>{r.cantTell.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>)}</Panel></Section>
      <Section heading="What I don’t know yet">
        <Panel>{r.dontKnowYet.length ? r.dontKnowYet.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>) : <p className="gwui-panel-text">Nothing is missing on the record.</p>}</Panel>
      </Section>
    </div>
  )
}

/** Each person's own report on their own bills, as the server words it. */
export function TheCollectionsOwnReportSections({ r }: { r: TheCollectionsOwnReport }) {
  return (
    <div className="pb" data-collections-report="own">
      <Section heading={r.title}>
        <Panel heading="In short">{r.inShort.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>)}</Panel>
      </Section>
      <Section heading="What moved"><Panel>{r.whatMoved.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>)}</Panel></Section>
      {r.forYouToDo.length > 0 && <Section heading="For you to do"><Panel>{r.forYouToDo.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>)}</Panel></Section>}
      {r.dontKnowYet.length > 0 && <Section heading="What I don’t know yet"><Panel>{r.dontKnowYet.map((x) => <p className="gwui-panel-text" key={x}>{x}</p>)}</Panel></Section>}
    </div>
  )
}
