/**
 * YOU, PORTED FROM THE PROTOTYPE'S OWN MARKUP (Hafsah, 21 November 2026), behind the design switch. The prototype's You board
 * (C2-the-you-board, drawn for four readers: docs/boards-21-nov/prototype-dom/you-as-*.html) is one page whose parts appear as the
 * reader has them, so one component draws all four shapes from what GET /you served this reader: the same tags, nesting, class names
 * and inline styles, on the prototype's scoped app.css.
 *
 * In the prototype's order: the page's title and line, Your board (where you stand, your goals, your commitments, your to-dos, what you
 * contributed, coaching), your turn, everything asked of you this week, what you said you'd do, something that keeps coming up, your
 * own reports and your work in each, and your data. The prototype's privacy notes ("Only you see this page.", "Only you see this unless
 * you share it", "Only you, and the people who run your check-ins, see it.") are left out, by Hafsah's standards. Then, after the
 * prototype's sections, the parts it has no place for, so nothing is removed (`more`): your performance history, your leave, your
 * requests, your running record, your CV and emergency contact.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAskStore } from '@/stores/ask'
import { useQuery } from '@tanstack/react-query'
import { todayApi } from '@/api/today'
import type { YourBoard } from '@/api/you'
import { css } from '../board/prototype/the-prototype-markup'
import { theYouSubtitle } from './YouPage'
import { aShortDay } from '../board/pictured/ThePicturedSalesBoard'
import '../board/prototype/the-prototype-boards.css'

const TAG_OF: Record<string, string> = { open: 'tag plain', kept: 'tag rec', not_done: 'tag att' }

/** One line of a "Your board" panel: the prototype's mark and its sentence. */
function ALine({ mark, children }: { mark: 'rec' | 'said' | 'none'; children: ReactNode }) {
  return <div className="row" style={css('grid-template-columns:18px minmax(0,1fr);padding:9px 0;gap:10px')}><i className={`mk ${mark}`} aria-hidden="true" /><span className="t-small">{children}</span></div>
}

export function TheYouBoardAsPictured({ b, more, yourData }: { b: YourBoard; more: ReactNode; yourData: ReactNode }) {
  const checkIns = b.checkIns ?? []
  const goals = b.goals ?? []
  const todos = b.todos ?? []
  const said = b.saidYoudDo ?? []
  const contributed = b.contributed ?? []
  const asked = b.askedOfYou?.items ?? []
  const patterns = (b.patterns ?? []).filter((p: any) => p.yours !== false)
  const reports = b.ownReports ?? []
  const stand = b.whereYouStand?.says ?? b.keptLately?.says ?? null
  /* "Add a to-do" (YourToDos): a to-do is added by asking Groundwork, so the button opens Ask. Kept, since nothing is removed. */
  const showAsk = useAskStore((st) => st.show)
  /* The next check-in, from what is open for you (turns), or else from Today's "coming up" (the same read Today shows). */
  const { data: today } = useQuery({ queryKey: ['today'], queryFn: todayApi.get, staleTime: 30_000, retry: false })
  const next = (today as any)?.comingUp?.[0] ?? null
  const nextDay = next?.at ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(next.at)) : null
  const Empty = ({ children }: { children: ReactNode }) => <p className="t-small" style={css('margin-top:8px')}>{children}</p>
  return (
    <div className="gw-proto">
      <div className="wrap">
        <div>
          <div style={css('max-width:1120px;display:flex;flex-direction:column;gap:36px')}>
            <div>
              <h1 className="t-title">You</h1>
              <p className="t-body mut" style={css('margin-top:4px')}>{theYouSubtitle(checkIns)}</p>
              <section className="sec" id="youboard" style={css('margin-top:6px')}>
                <h2 className="t-h2">Your board</h2>
                {checkIns.length === 0 && todos.length === 0 && <p className="t-small mut">You are not in any check-in yet.</p>}
                <section className="panel pad stack" style={css('gap:6px;margin-top:18px')}>
                  <b className="t-h3">Where you stand</b>
                  <p>{stand ?? 'Nothing needs deciding about your work right now.'}</p>
                  {b.whereYouStand?.whatWouldChangeIt && <p className="t-small">{`What would change this: ${b.whereYouStand.whatWouldChangeIt}`}</p>}
                  {b.whereYouStand?.decision && <p className="t-small">{b.whereYouStand.decision}</p>}
                </section>
                <div className="g2" id="yourside" style={css('display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 16px;')}>
                  <section className="panel pad stack" style={css('gap:6px')}>
                    <b className="t-h3">Worth knowing now</b>
                    {(b.worthKnowing ?? []).length ? b.worthKnowing!.map((w) => <p key={w} className="t-small">{w}</p>) : <p className="t-small">Nothing is worth knowing about your work right now.</p>}
                  </section>
                  <section className="panel pad stack" style={css('gap:6px')}>
                    <b className="t-h3">Something Groundwork noticed about your work</b>
                    <p className="t-small">{b.noticed?.says ?? 'Groundwork has not noticed anything about your work yet.'}</p>
                  </section>
                  <section className="panel pad stack" style={css('gap:6px')}>
                    <b className="t-h3">Coaching, followed over time</b>
                    <p className="t-small">{b.coachingOverTime ?? 'No coaching has been followed over time yet.'}</p>
                  </section>
                </div>
                <div className="g2" style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-top:16px')}>
                  <section className="panel pad">
                    <b className="t-h3">Your goals</b>
                    {goals.length ? goals.map((g) => <ALine key={g.id} mark="said">{g.says}</ALine>) : <Empty>No goal has been set for you yet.</Empty>}
                  </section>
                  <section className="panel pad">
                    <b className="t-h3">Your commitments</b>
                    {b.keptLately?.says && <ALine mark="rec">{b.keptLately.says}</ALine>}
                    {said.filter((x) => x.state === 'open').slice(0, 2).map((x) => <ALine key={x.id} mark="none">{x.text}</ALine>)}
                    {!b.keptLately?.says && !said.some((x) => x.state === 'open') && <Empty>You have not made a commitment on record yet.</Empty>}
                  </section>
                  <section className="panel pad">
                    <b className="t-h3">Your to-dos</b>
                    {todos.length ? todos.map((t) => <ALine key={t.id} mark="none">{t.text}</ALine>) : <Empty>Nothing is on your to-do list.</Empty>}
                    <button type="button" className="btn quiet sm" onClick={showAsk}>Add a to-do</button>
                  </section>
                  <section className="panel pad">
                    <b className="t-h3">What you contributed</b>
                    {contributed.length ? contributed.map((c) => <ALine key={c} mark="rec">{c}</ALine>) : <Empty>Nothing you contributed is on record yet.</Empty>}
                  </section>
                </div>
                <section className="panel pad" style={css('margin-top:16px')}>
                  <b className="t-h3">Coaching</b>
                  <p className="t-small" style={css('margin-top:4px')}>{b.coaching?.says ?? 'There is no coaching for you this week yet.'}</p>
                </section>
              </section>
            </div>
            {(b.turns ?? []).length ? (b.turns ?? []).map((t, i) => (
              <section key={t.key} className="panel pad" style={css('display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap;border-color:var(--ink)')}>
                <div><b className="t-h3">{t.title}</b>{t.detail && <p className="t-small mut" style={css('margin-top:4px')}>{t.detail}</p>}</div>
                <Link className={i === 0 ? 'btn pri big' : 'btn sec big'} to={t.action.to}>{t.action.label}</Link>
              </section>
            )) : (
              <section className="panel pad" style={css('display:flex;justify-content:space-between;gap:20px;align-items:center;flex-wrap:wrap;border-color:var(--ink)')}>
                <div>
                  <b className="t-h3">{next && nextDay ? `Your next check-in opens on ${nextDay}` : 'Nothing is waiting for your check-in right now'}</b>
                  {next?.what && <p className="t-small mut" style={css('margin-top:4px')}>{next.what}</p>}
                </div>
                {next?.to && <Link className="btn sec big" to={next.to}>Open it</Link>}
              </section>
            )}
            {(
              <section className="sec" id="myload" style={css('margin-top: 30px;')}>
                <div className="sec-h"><h2 className="t-h2">Everything asked of you this week</h2><span className="t-small mut">From every check-in you’re in</span></div>
                <div className="panel scroll-x">
                  {!asked.length && <p className="t-small" style={css('padding:14px 18px')}>Nobody has asked anything of you this week.</p>}
                  {asked.map((a) => (
                    <div key={a.id} className="row" style={css('grid-template-columns:160px minmax(0,1fr) minmax(0,1.3fr) 80px;padding:11px 18px;min-width:560px;align-items:center')}>
                      <b className="t-small">{a.who ?? ''}</b>
                      <span className="t-small">{a.checkIn}</span>
                      <span className="t-small">{a.what}</span>
                      <span className="t-small mut">{a.asked}</span>
                    </div>
                  ))}
                </div>
                {b.askedOfYou?.says && <p className="note">{b.askedOfYou.says}</p>}
              </section>
            )}
            {(
              <section className="sec">
                <div className="sec-h"><h2 className="t-h2">What you said you’d do</h2><span className="t-small mut">From every check-in, yours and your team’s</span></div>
                <div>
                  {!said.length && <p className="t-small" style={css('padding:14px 0;border-top:1px solid var(--rule)')}>You have not said you would do anything yet.</p>}
                  {said.map((s) => (
                    <div key={s.id} style={css('display:grid;grid-template-columns:minmax(0,1fr) 190px 130px 250px;gap:18px;padding:14px 0;border-top:1px solid var(--rule);align-items:center')}>
                      <b className="t-body">{s.text}</b>
                      <span className="t-small mut">{s.checkIn}</span>
                      <span className="t-small">{s.when ?? ''}</span>
                      <span><span className={TAG_OF[s.state] ?? 'tag plain'}>{s.stateSays}</span></span>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {(
              <section className="sec">
                <div className="sec-h"><h2 className="t-h2">Something that keeps coming up</h2><span className="t-small mut">About your part in the work</span></div>
                {!patterns.length && <div className="panel pad"><p className="t-small">Nothing has come up about your part in three check-ins in a row yet.</p></div>}
                {patterns.map((p: any) => (
                  <div key={p.id} className="panel pad" style={css('display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:28px;background:var(--att-soft);border-color:#E8A94A')}>
                    <div style={css('display:flex;flex-direction:column;gap:8px')}>
                      <b className="t-h3">{p.heading ?? p.whatHappened}</b>
                      {p.whatHappened && p.heading && <p className="t-body">{p.whatHappened}</p>}
                      {p.howOften && <p className="t-small mut">{p.howOften}</p>}
                    </div>
                    <div style={css('display:flex;flex-direction:column;gap:10px;justify-content:center')} />
                  </div>
                ))}
              </section>
            )}
            {(
              <section style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px;align-items:start')}>
                <div className="sec">
                  <div className="sec-h"><h2 className="t-h2">Your own reports</h2></div>
                  <div>
                    {reports.length ? reports.map((r, i) => (
                      <Link key={`${r.checkIn}-${i}`} to={r.to} style={css('display:grid;grid-template-columns:minmax(0,1fr) 150px 110px auto;gap:14px;padding:12px 0;border-top:1px solid var(--rule);text-decoration:none;color:inherit;align-items:center')}>
                        <b className="t-small">{r.checkIn}</b>
                        <span className="t-small mut">{r.at ? aShortDay(r.at) : ''}</span>
                        <span className="t-small">Your own</span>
                        <span className="t-small" style={css('color:var(--act)')}>Read</span>
                      </Link>
                    )) : <p className="t-small">Your own report comes after your first check-in.</p>}
                  </div>
                </div>
                <div className="sec">
                  <h2 className="t-h2">Your work in each</h2>
                  <div style={css('display:flex;flex-direction:column;gap:10px')}>
                    {!checkIns.length && <p className="t-small">You are not in any check-in yet.</p>}
                    {checkIns.map((c) => (
                      <Link key={c.id} to={c.to} className="panel" style={css('padding:14px 16px;text-decoration:none;color:inherit;display:flex;justify-content:space-between;align-items:center')}>
                        <div><b className="t-small">{c.label}</b><div className="t-tiny mut">{c.line}</div></div>
                        <span className="t-small" style={css('color:var(--act)')}>Open</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
            {yourData}
          </div>
        </div>
        {/* The parts of You the prototype has no place for, after its sections, so nothing is removed. */}
        <div className="stack" style={css('gap:36px;margin-top:36px')}>{more}</div>
      </div>
    </div>
  )
}
