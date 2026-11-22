/**
 * A SALES ORGANISATION'S GOALS, PORTED FROM THE PROTOTYPE'S OWN MARKUP (coordinator's brief, 22 November 2026; Hafsah's rule that the
 * boards follow the prototype word for word). The prototype's board is "Sales org, Q3" ("Set goals and keep the team on track",
 * docs/prototype/screens/G1-example-check-ins/salesorg.txt, and its markup sales-org-as-lead.html): the same sections in the same order,
 * the same headings, labels, button words, tags, class names and inline styles, on the prototype's scoped app.css. For whoever runs it,
 * behind the design switch.
 *
 * Every slot is the board the server served this reader, never the prototype's example numbers. Where the record holds nothing for a
 * part the prototype always shows, the part says so in a sentence. Counts are the served count (the session rows and the one count),
 * never counted here.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { css } from './the-prototype-markup'
import { TheCheckInsHeader, WhereThisIsHeadingAsPictured, EverySession, TheAskBar, theHeaderLine } from './the-prototype-parts'
import { useWhatNeedsYou, lastTen, aTagForTheWork, isoDay } from '../pictured/ThePicturedSalesBoard'
import { TheOtherBoardsYouAreIn } from '../pictured/ThePicturedBoard'
import { CORRECT_IT_HERE } from '../pictured/TheBar'
import './the-prototype-boards.css'

type Any = any
const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''
const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const aNumber = (n: unknown) => Number(n ?? 0).toLocaleString('en-GB')

export interface TheGoalsBoardAsPicturedProps {
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

/** What shows a sale, in the prototype's words ("Payment record", "Rep said"). */
const WHAT_SHOWS_IT: Record<string, string> = { proven: 'Proof shows it', confirmed: 'Confirmed', said: 'Rep said', memory: 'From memory', none: 'Added here' }

/** The tag beside a target, as the server says where it stands ("Close", "Not settled"). */
const aTargetTag = (word: string | null | undefined) => (word ? <span className={/^(on track|met|reached|ahead)/i.test(word) ? 'tag rec' : 'tag att'}>{capital(word)}</span> : <span />)

export function TheGoalsBoardAsPictured(p: TheGoalsBoardAsPicturedProps) {
  const { b, groundId } = p
  const today = isoDay(new Date())
  const deals = ((b.workRecords ?? []) as Any[]).find((s) => s.section === 'Deal grid') ?? null
  const rows: Any[] = ((deals?.rows ?? []) as Any[]).filter((r) => r.kind === 'deal')
  const [openId, setOpenId] = useState<string | null>(null)
  const open = rows.find((r) => r.id === openId) ?? rows[0] ?? null
  const needs = useWhatNeedsYou({ b, groundId, deals, sessionRows: p.sessionRows })
  const aims: Any[] = ((b.objectives ?? []) as Any[]).filter((o) => o.target != null)
  const headline = b.headline ?? null
  const bar = (headline?.bars ?? [])[0] ?? null
  const leadId = (b.participants ?? []).find((x: Any) => x.partyType === 'INITIATOR')?.id ?? null
  const team: Any[] = (b.eachPersonToday ?? []).filter((r: Any) => r.participantId !== leadId)
  const reasonOf = new Map<string, string>((b.eachPerson ?? []).map((x: Any) => [x.participantId, x.reason]))
  const nameOf = new Map<string, string>((b.participants ?? []).map((x: Any) => [x.id, firstName(x.name)]))
  const called = (pid: string, said: string | null | undefined) => nameOf.get(pid) || said || ''
  /* "Sorted by team. A gap is a missed session." The rows are sorted by the team each person is in, where the record says it. */
  const teamOf = new Map<string, string>((b.participants ?? []).map((x: Any) => [x.id, String(x.team ?? x.department ?? '')]))
  const gridRows: Any[] = ((b.checkInGrid?.rows ?? []) as Any[]).filter((r) => !r.managingOnly && r.participantId !== leadId)
  const byTeamKnown = gridRows.some((r) => teamOf.get(r.participantId))
  const sortedRows = byTeamKnown ? [...gridRows].sort((a, c) => (teamOf.get(a.participantId) ?? '').localeCompare(teamOf.get(c.participantId) ?? '')) : gridRows
  const areas: Any[] = b.byArea?.state === 'filled' ? (b.byArea.areas ?? []) : []
  const stages: Any[] = b.reportedAgainstCriteria?.stages ?? []
  const most = Math.max(1, ...stages.map((s) => s.reported ?? 0), ...stages.map((s) => s.met ?? 0))
  const blockers: Any[] = (b.blockers ?? []).filter((x: Any) => x.state !== 'cleared')
  const carried: Any[] = (b.keepsComingUp ?? []).map((x: Any, i: number) => ({ id: `carried-${i}`, participantId: x.participantId, yours: x.yours, about: 'the work', whatHappened: x.says }))
  const patterns: Any[] = [...(b.patterns ?? []), ...carried]
  const aboutTheWork = patterns.filter((x) => x.about !== 'what is said against what happened')
  const aboutWhatIsSaid = new Map<string, Any[]>()
  for (const x of patterns.filter((y) => y.about === 'what is said against what happened')) aboutWhatIsSaid.set(x.heading, [...(aboutWhatIsSaid.get(x.heading) ?? []), x])
  const teams = areas.length
  const [today_] = p.sessionRows
  return (
    <div className="gw-proto">
      <div className="wrap">
        <TheCheckInsHeader b={b} line={theHeaderLine(b, p.ground)} tabs={p.tabs} lead showAsk={p.showAsk} addSomething={p.addSomething} groundId={groundId} />
        <div className="stack" style={css('gap:40px;margin-top:24px')}>
          <section className="g2" style={css('grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);align-items:start')}>
            <div className="stack" style={css('gap:12px')}>
              {headline?.question && <span className="t-small mut">{headline.question}</span>}
              <p className="t-title" style={css('font-size:30px')}>{headline?.answer ?? (rows.length ? `${rows.length} ${rows.length === 1 ? 'sale is' : 'sales are'} on record so far.` : 'No sales are on record yet.')}</p>
              {bar && bar.filled != null && (
                <div className="bar" role="img" aria-label={`${aNumber(bar.now)} of ${aNumber(bar.target)}`}><i style={css(`width:${Math.max(0, Math.min(100, Number(bar.filled)))}%;background:var(--rec)`)} /></div>
              )}
              {!headline && b.objectivesPrompt && <p className="note">{b.objectivesPrompt}</p>}
            </div>
            <div className="panel pad">
              <h2 className="t-h3">Where each target stands</h2>
              {aims.length ? aims.map((o) => (
                <div key={o.id} className="row" style={css('grid-template-columns:1fr auto;padding:10px 0')}>
                  <span className="t-small"><b>{o.name}</b><span className="mut" style={css('display:block')}>{`${aNumber(o.count)} of ${aNumber(o.target)}`}</span></span>
                  {aTargetTag(o.stands?.word)}
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
            <div className="sec-h"><h2 className="t-h2">Every sale, and what shows it</h2><span className="t-small mut">Ringed is someone’s word; filled is proven. Select one for its detail</span></div>
            {rows.length ? (
              <>
                <div style={css('display:flex;gap:18px;flex-wrap:wrap')} className="t-small mut">
                  <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk rec" aria-hidden="true" />Proof shows it</span>
                  <span style={css('display:flex;gap:6px;align-items:center')}><i className="mk said" aria-hidden="true" />Someone said it</span>
                </div>
                <div className="panel scroll-x">
                  <div style={css('display:grid;grid-template-columns:minmax(210px,1.4fr) 120px 170px 170px minmax(170px,1fr);column-gap:14px;padding:12px 18px;min-width:900px')} className="t-tiny mut">
                    <span>Deal</span><span>Rep</span><span>Stage now</span><span>What shows it</span><span>Next</span>
                  </div>
                  {rows.map((r) => (
                    <button key={r.id} type="button" className={r.id === open?.id ? 'gridrow dealrow on' : 'gridrow dealrow'} onClick={() => setOpenId(r.id)} aria-pressed={r.id === open?.id}
                      style={css('grid-template-columns:minmax(210px,1.4fr) 120px 170px 170px minmax(170px,1fr);column-gap:14px;padding:12px 18px;min-width:900px')}>
                      <span><b className="t-small">{r.name}</b></span>
                      <span className="t-small">{r.ownerParticipantId === b.myParticipantId ? 'You' : firstName(r.owner)}</span>
                      <span className="t-small" style={css('display:flex;gap:6px;align-items:center')}><i className={r.mark === 'proven' ? 'mk rec' : 'mk said'} aria-hidden="true" />{r.stage ?? 'No stage said yet'}</span>
                      <span className="t-small mut">{WHAT_SHOWS_IT[r.mark ?? 'said'] ?? 'Rep said'}</span>
                      <span className="t-small" style={css('color:var(--act)')}>{r.nextStep ?? r.next ?? 'Nothing booked'}</span>
                    </button>
                  ))}
                </div>
                {open && (
                  <div className="panel pad g2" style={css('align-items:start')}>
                    <div className="stack" style={css('gap:6px')}>
                      <span className="t-title" style={css('font-size:21px')}>{open.name}</span>
                      {Object.entries(open.fields ?? {}).map(([k, v]) => (
                        <div key={k} className="row" style={css('grid-template-columns:120px 1fr;padding:8px 0')}><span className="t-small mut">{capital(k)}</span><span className="t-small">{String(v)}</span></div>
                      ))}
                    </div>
                    <div className="stack" style={css('gap:10px')}>
                      <div style={css('background:var(--act-soft);border-radius:10px;padding:12px 14px')} className="t-small"><b style={css('color:var(--act)')}>Next:</b> {open.nextStep ?? open.next ?? 'Nothing booked'}</div>
                      <Link className="btn quiet" to={`/grounds/${groundId}`}>Not right? Tell the check-in</Link>
                    </div>
                  </div>
                )}
                <p className="note">{CORRECT_IT_HERE}</p>
              </>
            ) : <div className="panel pad"><p className="t-small">No sales are on record yet.</p></div>}
          </section>
          {team.length > 0 && (
            <section className="sec">
              <div className="sec-h"><h2 className="t-h2">The team today</h2><span className="t-small mut">Each person’s line, their last 10 check-ins, and what keeps coming up</span></div>
              <div className="panel scroll-x">
                {team.map((r) => {
                  const tag = aTagForTheWork(String(reasonOf.get(r.participantId) ?? ''), rows.filter((d) => d.ownerParticipantId === r.participantId), today, r.workTag)
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
              <p className="note">These are about the work. Open anyone to see what they said and what the proof shows.</p>
            </section>
          )}
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">{teams > 1 ? `Reported vs criteria met, across ${teams} teams` : 'Reported vs criteria met, stage by stage'}</h2><span className="t-small mut">The shape of the work</span></div>
            {stages.length ? (
              <>
                <div className="panel pad stack" style={css('gap:10px')}>
                  {stages.map((s) => (
                    <div key={s.stage} style={css('display:grid;grid-template-columns:160px 1fr 110px;gap:14px;align-items:center')}>
                      <span className="t-small">{s.stage}</span>
                      <div style={css('position:relative;height:22px')} role="img" aria-label={s.says}>
                        {s.reported != null && <i style={css(`position:absolute;inset:0 auto 0 0;width:${(s.reported / most) * 100}%;border:2px solid var(--ink);border-radius:5px;display:block`)} />}
                        {(s.met ?? 0) > 0 && <i style={css(`position:absolute;top:4px;bottom:4px;left:4px;width:calc(${(s.met / most) * 100}% - 8px);background:var(--rec);border-radius:3px;display:block`)} />}
                      </div>
                      <span className="t-small num">{s.reported == null ? `${aNumber(s.met)} met` : `${aNumber(s.reported)} said, ${aNumber(s.met)} met`}</span>
                    </div>
                  ))}
                  <p className="note">Outlined: what people reported. Filled: what meets the criteria.</p>
                </div>
                <p className="note">Dashed: reported. Solid: criteria met (for Won, proven by payment).</p>
              </>
            ) : <div className="panel pad"><p className="t-small">Nobody has reported a sale at any stage yet.</p></div>}
          </section>
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">By team</h2></div>
            {areas.length ? (
              <div className="g4">
                {areas.map((a) => (
                  <div key={a.area} className="panel pad stack" style={css('gap:8px')}>
                    <b>{a.area}</b>
                    <div style={css('display:flex;gap:14px;flex-wrap:wrap')}><div><span className="t-h3 num">{aNumber(a.records)}</span><div className="t-tiny mut">sales</div></div></div>
                    {a.says && <span className="t-small mut">{a.says}</span>}
                  </div>
                ))}
              </div>
            ) : <div className="panel pad"><p className="t-small">Nothing on record says which team each person is in yet, so the work cannot be shown by team.</p></div>}
          </section>
          {sortedRows.length > 0 && (
            <section className="sec">
              <div className="sec-h"><h2 className="t-h2">Who checked in</h2><span className="t-small mut">The last 10 sessions, one row each</span></div>
              <div className="panel scroll-x">
                <div style={css('padding:12px 18px;min-width:520px')}>
                  {sortedRows.map((r) => (
                    <div key={r.participantId} style={css('display:grid;grid-template-columns:110px repeat(10,18px) 1fr;gap:4px;align-items:center;padding:4px 0')}>
                      <span className="t-small">{called(r.participantId, r.name)}</span>
                      {lastTen(b, r.participantId).map((s, i) => <i key={i} aria-label={s === 'done' ? 'Checked in' : s === 'up' ? 'Not open yet' : 'Missed'} style={css(s === 'done' ? 'width:16px;height:16px;border-radius:4px;display:block;background:var(--navy)' : 'width:16px;height:16px;border-radius:4px;display:block;box-shadow:inset 0 0 0 1.5px var(--rule2)')} />)}
                      <span />
                    </div>
                  ))}
                </div>
              </div>
              <p className="note">{byTeamKnown ? 'Sorted by team. A gap is a missed session.' : 'A gap is a missed session.'}</p>
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
              <div className="g2" style={css('align-items:start')}>
                <div className="panel pad stack" style={css('gap:0')}>
                  <b className="t-small mut" style={css('padding-bottom:6px')}>About each person’s work</b>
                  {aboutTheWork.map((x) => <div key={x.id} className="row" style={css('grid-template-columns:110px 1fr')}><b className="t-small">{x.yours ? 'You' : nameOf.get(x.participantId) ?? ''}</b><span className="t-small">{x.whatHappened ?? x.heading}</span></div>)}
                </div>
                <div className="panel pad stack" style={css('gap:0')}>
                  <b className="t-small mut" style={css('padding-bottom:6px')}>How what people say can run ahead of what happened</b>
                  {aboutWhatIsSaid.size ? [...aboutWhatIsSaid.entries()].map(([h, xs]) => (
                    <div key={h} className="row" style={css('grid-template-columns:1fr')}>
                      <b className="t-small">{h}</b>
                      <span className="t-small mut">{xs[0]?.whatHappened ?? ''} <i>{xs.map((x) => (x.yours ? 'You' : nameOf.get(x.participantId) ?? '')).filter(Boolean).join(', ')}</i></span>
                    </div>
                  )) : <span className="t-small">Nothing anybody said has run ahead of what happened yet.</span>}
                </div>
              </div>
            ) : <div className="panel pad"><p className="t-small">Nothing has come up in three check-ins in a row yet.</p></div>}
            <p className="note">Each person sees what’s about them, and can answer it in their own words.</p>
          </section>
          <details className="overtime">
            <summary><span className="t-title" style={css('font-size:24px')}>Over time</span><span className="t-small ot-l" style={css('color:var(--act)')} /></summary>
            <div className="stack" style={css('gap:40px;margin-top:24px')}>
              <div className="panel pad"><p className="t-small">Nothing has been on record long enough to show over time yet.</p></div>
            </div>
          </details>
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">Reports</h2><span className="t-small mut">Each person’s own, the team’s once shared, and a weekly one</span></div>
            <div className="panel">
              {today_ && (
                <Link to={today_.shared ? `/grounds/${groundId}/session/${today_.sessionNumber}` : `/grounds/${groundId}?tab=report`} className="row" style={css('grid-template-columns:220px 1fr auto;padding:14px 18px;text-decoration:none;color:inherit')}>
                  <b className="t-small">Today’s team report</b><span className="t-small mut">{`The day’s gaps: what moved, what didn’t, who’s missing. ${today_.answered} of ${today_.total} checked in.`}</span><span className="t-small" style={css('color:var(--act)')}>Open</span>
                </Link>
              )}
              <Link to={`/grounds/${groundId}?tab=report`} className="row" style={css('grid-template-columns:220px 1fr auto;padding:14px 18px;text-decoration:none;color:inherit')}>
                <b className="t-small">Your own report</b><span className="t-small mut">Only you see it</span><span className="t-small" style={css('color:var(--act)')}>Open</span>
              </Link>
              <Link to={`/grounds/${groundId}/report/week`} className="row" style={css('grid-template-columns:220px 1fr auto;padding:14px 18px;text-decoration:none;color:inherit')}>
                <b className="t-small">This week</b><span className="t-small mut">Patterns, once they’ve held for two weeks</span><span className="t-small" style={css('color:var(--act)')}>Open</span>
              </Link>
            </div>
          </section>
          <EverySession groundId={groundId}><TheOtherBoardsYouAreIn groundId={groundId} /></EverySession>
        </div>
        <WhereThisIsHeadingAsPictured b={b} lead onRecordTheDecision={p.onRecordTheDecision} />
        <TheAskBar example={rows[0] ? `Ask about this board, for example “What is holding up ${rows[0].name}?”` : 'Ask about this board'} askWith={p.askWith} showAsk={p.showAsk} />
      </div>
    </div>
  )
}
