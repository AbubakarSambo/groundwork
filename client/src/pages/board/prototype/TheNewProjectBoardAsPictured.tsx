/**
 * A NEW PROJECT, PORTED FROM THE PROTOTYPE'S OWN MARKUP (Hafsah, 21 November 2026), for whoever runs it, behind the design switch.
 * The prototype's board is "Engineering release" ("Get a new project off to a good start",
 * docs/boards-21-nov/prototype-dom/engineering-release-as-lead.html): the same tags, nesting, class names and inline styles, on the
 * prototype's scoped app.css.
 *
 * Every slot is the board the server served this reader. The prototype's tasks are this check-in's own records, named as the server
 * names what they hold ("incidents" for distribution operations, "tasks" for an engineering release). Where the record holds nothing
 * for a part the prototype always shows, the part says so in a sentence.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from './the-prototype-markup'
import { TheCheckInsHeader, WhereThisIsHeadingAsPictured, EverySession, TheAskBar, theHeaderLine, AllTheSessions } from './the-prototype-parts'
import { useWhatNeedsYou, lastTen, aTagForTheWork, isoDay, aShortDay } from '../pictured/ThePicturedSalesBoard'
import { CORRECT_IT_HERE } from '../pictured/TheBar'
import './the-prototype-boards.css'

type Any = any
const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''
const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export interface TheNewProjectBoardAsPicturedProps {
  b: Any
  ground: Any
  groundId: string
  sessionRows: Any[]
  tabs: { key: string; label: string; to: string }[]
  addSomething?: React.ReactNode
  renderActions: (action: Any) => React.ReactNode
  showAsk: () => void
  askWith: (q: string) => void
  onRecordTheDecision: () => void
}

/** What shows a record, in the prototype's words ("The engineer’s word", "Proof shows it"). */
const WHAT_SHOWS_IT: Record<string, string> = { proven: 'Proof shows it', confirmed: 'Confirmed', said: 'Their own word', memory: 'From memory', none: 'Added here' }

export function TheNewProjectBoardAsPictured(p: TheNewProjectBoardAsPicturedProps) {
  const { b, groundId } = p
  const today = isoDay(new Date())
  const records = ((b.workRecords ?? []) as Any[]).find((s) => s.state === 'filled' && (s.rows ?? []).length) ?? null
  const rows: Any[] = records?.rows ?? []
  const many: string = records?.holds ?? 'tasks' /* the prototype's own word where the server names none */
  const firstHeader = capital(many.replace(/s$/, ''))
  const ownerHeader = 'Owner'
  const [openId, setOpenId] = useState<string | null>(null)
  const open = rows.find((r) => r.id === openId) ?? rows[0] ?? null
  const needs = useWhatNeedsYou({ b, groundId, deals: null, sessionRows: p.sessionRows })
  const aims: Any[] = ((b.objectives ?? []) as Any[]).filter((o) => o.target != null)
  const leadId = (b.participants ?? []).find((x: Any) => x.partyType === 'INITIATOR')?.id ?? null
  const team: Any[] = (b.eachPersonToday ?? []).filter((r: Any) => r.participantId !== leadId)
  const reasonOf = new Map<string, string>((b.eachPerson ?? []).map((x: Any) => [x.participantId, x.reason]))
  const gridRows: Any[] = (b.checkInGrid?.rows ?? []).filter((r: Any) => !r.managingOnly && r.participantId !== leadId)
  const blockers: Any[] = (b.blockers ?? []).filter((x: Any) => x.state !== 'cleared')
  const patterns: Any[] = b.patterns ?? []
  const nameOf = new Map<string, string>((b.participants ?? []).map((x: Any) => [x.id, firstName(x.name)]))
  /* A person with no name on record is said as the server says them ("One colleague"), never as the first word of that. */
  const called = (pid: string, said: string | null | undefined) => nameOf.get(pid) || said || ''
  const [firstReport, secondReport] = p.sessionRows
  const headline = b.headline ?? null
  return (
    <div className="gw-proto">
      <div className="wrap">
        <TheCheckInsHeader b={b} line={theHeaderLine(b, p.ground)} tabs={p.tabs} lead showAsk={p.showAsk} addSomething={p.addSomething} groundId={groundId} />
        <div className="stack" style={css('gap:40px;margin-top:24px')}>
          <section className="g2" style={css('grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start')}>
            <div className="stack" style={css('gap:12px')}>
              {headline?.question && <span className="t-small mut">{headline.question}</span>}
              <p className="t-title" style={css('font-size:30px')}>{headline?.answer ?? (rows.length ? `${rows.length} ${rows.length === 1 ? many.replace(/s$/, '') : many} on record so far.` : `No ${many} are on record yet.`)}</p>
              {!headline && b.objectivesPrompt && <p className="note">{b.objectivesPrompt}</p>}
            </div>
            <div className="panel pad">
              <h2 className="t-h3">Where each target stands</h2>
              {aims.length ? aims.map((o) => (
                <div key={o.id} className="row" style={css('grid-template-columns:1fr auto;padding:10px 0')}>
                  <span className="t-small"><b>{o.name}</b><span className="mut" style={css('display:block')}>{`${Number(o.count ?? 0).toLocaleString('en-GB')} of ${Number(o.target).toLocaleString('en-GB')}`}</span></span>
                  <span />
                </div>
              )) : <p className="t-small" style={css('margin-top:8px')}>No target is set yet.</p>}
            </div>
          </section>
          {needs.length > 0 && (
            <section className="sec">
              <div className="sec-h"><h2 className="t-h2">What needs you in this check-in</h2></div>
              <div className="list">
                {needs.map((n) => (
                  <div className="item" key={n.key}>
                    <i className={`sp ${n.kind === 'decide' ? 'act' : 'att'}`} />
                    <div><div className="h">{n.title}</div>{n.detail && <div className="s">{n.detail}</div>}</div>
                    {n.node || n.action ? <span style={css('display:flex;gap:6px')}>{n.node ?? p.renderActions(n.action)}</span> : <span />}
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">{`Every ${many.replace(/s$/, '')}, and what shows it`}</h2><span className="t-small mut">Ringed is someone’s word; filled is proven. Select one for its detail</span></div>
            {rows.length ? (
              <>
                <div style={css('display:flex;gap:18px;flex-wrap:wrap')} className="t-small mut">
                  <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk rec" aria-hidden="true" />Proof shows it</span>
                  <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk said" aria-hidden="true" />Someone said it</span>
                </div>
                <div className="panel scroll-x">
                  <div style={css('display:grid;grid-template-columns:minmax(210px,1.4fr) 120px 170px 170px minmax(170px,1fr);column-gap:14px;padding:12px 18px;min-width:900px')} className="t-tiny mut">
                    <span>{firstHeader}</span><span>{ownerHeader}</span><span>Stage now</span><span>What shows it</span><span>Next</span>
                  </div>
                  {rows.map((r) => (
                    <button key={r.id} type="button" className={r.id === open?.id ? 'gridrow dealrow on' : 'gridrow dealrow'} onClick={() => setOpenId(r.id)} aria-pressed={r.id === open?.id}
                      style={css('grid-template-columns:minmax(210px,1.4fr) 120px 170px 170px minmax(170px,1fr);column-gap:14px;padding:12px 18px;min-width:900px')}>
                      <span><b className="t-small">{r.name}</b></span>
                      <span className="t-small">{r.ownerParticipantId === b.myParticipantId ? 'You' : firstName(r.owner)}</span>
                      <span className="t-small" style={css('display:flex;gap:6px;align-items:center')}><i className={r.mark === 'proven' ? 'mk rec' : 'mk said'} aria-hidden="true" />{r.stage ?? 'No stage said yet'}</span>
                      <span className="t-small mut">{WHAT_SHOWS_IT[r.mark ?? 'said'] ?? 'Their own word'}</span>
                      <span className="t-small" style={css(r.nextStep || r.next ? 'color:var(--act)' : 'color:var(--att)')}>{r.nextStep ?? r.next ?? 'Nothing booked'}</span>
                    </button>
                  ))}
                </div>
                {open && (
                  <div className="g3" style={css('align-items:start')}>
                    <div className="panel pad stack" style={css('gap:10px')}>
                      <span className="t-title" style={css('font-size:22px')}>{open.name}</span>
                      {Object.entries(open.fields ?? {}).map(([k, v]) => <span key={k} className="t-small"><span className="mut">{`${k}.`}</span> {String(v)}</span>)}
                      {open.said && <p className="quote">{`“${open.said}”`}</p>}
                    </div>
                    <div className="panel pad stack">
                      <b className="t-small mut">Contact history</b>
                      {(open.contactHistory ?? []).length ? open.contactHistory.slice(0, 5).map((c: Any) => (
                        <div key={c.on} className="row" style={css('grid-template-columns:90px 1fr;padding:8px 0')}><span className="t-small num">{aShortDay(`${c.on}T12:00:00Z`)}</span><span className="t-small">{c.says}</span></div>
                      )) : <span className="t-small">Nobody has spoken about it in a check-in yet.</span>}
                    </div>
                  </div>
                )}
                <p className="t-small mut">{CORRECT_IT_HERE}</p>
              </>
            ) : <div className="panel pad"><p className="t-small">{`No ${many} are on record yet.`}</p></div>}
          </section>
          {team.length > 0 && (
            <section className="sec">
              <div className="sec-h"><h2 className="t-h2">The team today</h2><span className="t-small mut">Each person’s line, their last 10 check-ins, and what keeps coming up</span></div>
              <div className="panel scroll-x">
                {team.map((r) => {
                  const tag = aTagForTheWork(String(reasonOf.get(r.participantId) ?? ''), [], today, r.workTag)
                  return (
                    <div key={r.participantId} className="row" style={css('grid-template-columns:120px minmax(200px,1.2fr) 190px 150px minmax(180px,1fr);padding:14px 18px;min-width:880px')}>
                      <b><Link to={`/grounds/${groundId}/person/${r.participantId}`} style={css('color:inherit;text-decoration:none')}>{called(r.participantId, r.who)}</Link></b>
                      <span className="t-small">{r.line}</span>
                      <span>{tag && <span className={`tag ${tag.tone === 'proven' ? 'rec' : tag.tone === 'attention' ? 'att' : 'plain'}`}>{tag.word}</span>}</span>
                      <span style={css('display:flex;gap:3px')} aria-label="Last 10 check-ins">
                        {lastTen(b, r.participantId).map((s, i) => <i key={i} style={css(s === 'done' ? 'width:9px;height:18px;border-radius:3px;display:block;background:var(--navy)' : 'width:9px;height:18px;border-radius:3px;display:block;box-shadow:inset 0 0 0 1.5px var(--rule2)')} />)}
                      </span>
                      <span className="t-small mut">{r.keepsComingUp ?? ''}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
          {gridRows.length > 0 && (
            <section className="sec">
              <div className="sec-h"><h2 className="t-h2">Who checked in</h2><span className="t-small mut">The last 10 sessions, one row each</span></div>
              <div className="panel scroll-x">
                <div style={css('padding:12px 18px;min-width:520px')}>
                  {gridRows.map((r) => (
                    <div key={r.participantId} style={css('display:grid;grid-template-columns:110px repeat(10,18px) 1fr;gap:4px;align-items:center;padding:4px 0')}>
                      <span className="t-small">{called(r.participantId, (team.find((t) => t.participantId === r.participantId)?.who) ?? 'Somebody with no name on record')}</span>
                      {lastTen(b, r.participantId).map((s, i) => <i key={i} aria-label={s === 'done' ? 'Checked in' : 'Missed'} style={css(s === 'done' ? 'width:16px;height:16px;border-radius:4px;display:block;background:var(--navy)' : 'width:16px;height:16px;border-radius:4px;display:block;box-shadow:inset 0 0 0 1.5px var(--rule2)')} />)}
                      <span />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">Blockers</h2><span className="t-small mut">Each with its history and the one thing that would clear it</span></div>
            {blockers.length ? (
              <div className="stack" style={css('gap:12px')}>
                {blockers.map((x) => (
                  <div key={x.id} className="panel pad stack" style={css('gap:8px')}>
                    <div style={css('display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap')}><b style={css('font-size:17px')}>{x.name ? capital(x.name) : x.says}</b><span className={x.state === 'blocking' ? 'tag con' : 'tag att'}>{x.state === 'blocking' ? 'Blocking' : 'Waiting'}</span></div>
                    {(x.on ?? x.onLabel) && <span className="t-small"><span className="mut">Waiting on:</span> {x.on ?? x.onLabel}</span>}
                    {(x.wouldClearIt ?? x.wouldClearItSays) && <div style={css('background:var(--act-soft);border-radius:10px;padding:10px 14px')} className="t-small"><b style={css('color:var(--act)')}>Would clear it:</b> {x.wouldClearIt ?? x.wouldClearItSays}</div>}
                  </div>
                ))}
              </div>
            ) : <div className="panel pad"><p className="t-small">Nobody has raised anything that blocks the team.</p></div>}
          </section>
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">What keeps coming up</h2><span className="t-small mut">Named after three check-ins in a row, never after one. Each describes the work</span></div>
            {patterns.length ? (
              <div className="panel pad stack" style={css('gap:0')}>
                {patterns.map((x) => <div key={x.id} className="row" style={css('grid-template-columns:110px 1fr')}><b className="t-small">{x.yours ? 'You' : nameOf.get(x.participantId) ?? ''}</b><span className="t-small">{x.whatHappened ?? x.heading}</span></div>)}
              </div>
            ) : <div className="panel pad"><p className="t-small">Nothing has come up in three check-ins in a row yet.</p></div>}
          </section>
          {firstReport && (
            <section className="sec">
              <div className="sec-h"><h2 className="t-h2">Reports</h2><span className="t-small mut">Every session has two: each person’s own, and the team’s once you share it</span></div>
              <div className="panel" style={css('overflow:hidden')}>
                {[firstReport, secondReport].filter(Boolean).map((r: Any, i: number) => (
                  <div key={r.sessionNumber} style={css('display:grid;grid-template-columns:200px 1fr 170px auto;gap:18px;align-items:center;padding:14px 18px;' + (i === 0 ? 'border-top:0' : 'border-top:1px solid var(--rule)'))}>
                    <b className="t-small">{r.opened ? `${aShortDay(r.opened)}, session ${r.sessionNumber}` : `Session ${r.sessionNumber}`}</b>
                    <span className="t-small mut">{`${r.answered} of ${r.total} checked in.`}</span>
                    <span><span className={r.shared ? 'tag rec' : 'tag att'}>{r.shared ? 'Shared' : 'Not shared'}</span></span>
                    <Link className={r.shared ? 'btn sec' : 'btn pri'} to={r.shared ? `/grounds/${groundId}/session/${r.sessionNumber}` : `/grounds/${groundId}?tab=report`} style={css('height:38px')}>{r.shared ? 'Open' : 'Share it'}</Link>
                  </div>
                ))}
              </div>
              <AllTheSessions b={b} groundId={groundId} />
            </section>
          )}
          <EverySession groundId={groundId} />
        </div>
        <WhereThisIsHeadingAsPictured b={b} lead onRecordTheDecision={p.onRecordTheDecision} />
        <TheAskBar example={rows[0] ? `Ask about this board, for example “What is holding up ${rows[0].name.charAt(0).toLowerCase()}${rows[0].name.slice(1)}?”` : 'Ask about this board'} askWith={p.askWith} showAsk={p.showAsk} />
      </div>
    </div>
  )
}
