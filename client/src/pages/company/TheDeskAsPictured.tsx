/**
 * THE DESK, PORTED FROM THE PROTOTYPE'S OWN MARKUP (Hafsah, 21 November 2026), behind the design switch.
 *
 * The prototype's "Company (the Desk)" board (D2-company, #/company), reproduced from its rendered DOM
 * (docs/boards-21-nov/prototype-dom/the-desk-as-chief-executive.html): the same tags, nesting, class names and inline styles, with
 * the prototype's app.css scoped to html.design-pass .gw-proto (pages/board/prototype/the-prototype-boards.css).
 *
 * Every slot is filled from GET /company, as the server served it to this reader. The documents, and adding one, come after the
 * prototype's sections, as the Desk's own parts; who works here is on People (or listed here for whoever cannot open People).
 *
 * TRIMMED (page audit row 3, Hafsah, 24 November 2026): a section is drawn only when the record has something for it, so "Named by
 * more than one team", "What you say, and where the time goes" and "History" wait for their first entry, with no privacy note.
 * "What new people keep asking" is not drawn: nothing serves it yet, so it could only ever say it was empty.
 */
import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { CompanyPage as Page, CompanyPriority } from '@/api/company'
import { css } from '../board/prototype/the-prototype-markup'
import { whatSuccessLooksLike } from './CompanyPage'
import '../board/prototype/the-prototype-boards.css'

export interface TheDeskAsPicturedProps {
  page: Page
  name: string
  showAsk: () => void
  /** Opens Ask with a question already in it. */
  askWith: (question: string) => void
  /** The Desk's own parts that the prototype's board has no place for: the documents and who works here (nothing is removed). */
  theDesksOwnParts: ReactNode
  /** Links to the direction and policy boards, where the organisation has them switched on. */
  links?: ReactNode
  /** Where the "Teams" tab goes: People, for whoever may open it, or the list of who works here on this page. */
  teams: string
  /** The one "Add or change a goal", under the priorities (drawn only for whoever may change a goal). */
  goals: ReactNode
}

function APriority({ pr }: { pr: CompanyPriority }) {
  const tag = pr.reading?.tag ?? pr.tag
  const success = whatSuccessLooksLike(pr.measure, pr.target)
  return (
    <div className="panel" style={css('padding:20px 22px;display:flex;flex-direction:column;gap:10px')}>
      <div style={css('display:flex;justify-content:space-between;align-items:center;gap:10px')}>
        <span className="t-small mut">{`Priority ${pr.number}`}</span>
        {tag && <span className="tag att">{tag}</span>}
      </div>
      <h3 className="t-h3">{pr.title}</h3>
      {pr.reading?.says && <p className="t-small">{pr.reading.says}</p>}
      {pr.owner && <p className="t-small">{`${pr.owner} is responsible for this.`}</p>}
      {success && <p className="t-small">{success}</p>}
      {pr.staleSays && <p className="t-small mut">{pr.staleSays}</p>}
      {pr.fedBy && <span className="t-small mut">{pr.fedBy}</span>}
      {/* What each level understood, top down (the Desk's own part; the prototype's card has no place for it, and nothing is removed). */}
      {((pr.levels ?? []).length > 1 || (pr.levels ?? []).some((l) => l.changedHere)) && (
        <div className="stack" style={css('gap:0')}>
          <b className="t-small mut" style={css('padding-bottom:6px')}>What each level understood</b>
          {pr.levels!.map((l) => (
            <div key={l.id} className="row" style={css('grid-template-columns:90px 1fr;padding:8px 0')}>
              <span className="t-tiny mut">{l.level}</span>
              <div>
                <b className="t-small">{l.title}</b>
                {l.changedHere && <p className="t-small">{l.changedHere}</p>}
                {l.fedBy && <p className="t-tiny mut">{l.fedBy}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TheDeskAsPictured({ page, name, showAsk, askWith, theDesksOwnParts, links, teams, goals }: TheDeskAsPicturedProps) {
  const priorities = page.priorities ?? []
  /* The strategy's own line ("Strategy v2, since 1 September.") where the server serves one, then its count of people and check-ins. */
  const strategy = (page as any).strategy as { says: string; history?: { number: number; says: string; whatChanged: string | null }[] } | null | undefined
  const headerLine = [strategy?.says, page.line].filter(Boolean).join(' ')
  const history = strategy?.history ?? []
  /* Arriving at #goals (from "Company context" or "Add or change a goal"), the page opens at the goals. */
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    const t = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 50)
    return () => window.clearTimeout(t)
  }, [hash])
  return (
    <div className="gw-proto">
      <div className="wrap">
        <div data-fr="">
          <div style={css('max-width:1120px')}>
            {/* flex-wrap added to the prototype's header row: in a narrow pane its buttons go under the title, never off the edge. */}
            <div style={css('display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap')}>
              <div>
                <h1 className="t-title">{name}</h1>
                <div style={css('margin:10px 0 4px')}>
                  <button type="button" className="btn sec" id="orgaskbtn" onClick={showAsk}>Ask about the whole organisation</button>
                </div>
                {headerLine && <p className="t-body mut" style={css('margin-top:4px')}>{headerLine}</p>}
              </div>
              <div style={css('display:flex;gap:8px')}>
                {/* The prototype's "Company context" opens /company/context, where the strategy is set: on the Desk, its goals. */}
                <Link className="btn sec" to="/company/context">Company context</Link>
                <button type="button" className="btn sec" onClick={() => askWith('Is the strategy moving?')}>Ask about the strategy</button>
                {links}
              </div>
            </div>
            <nav className="tabs" aria-label="The Desk">
              <a className="tab on" href="#strategy" aria-current="page">Is the strategy moving?</a>
              {teams.startsWith('#') ? <a className="tab" href={teams}>Teams</a> : <Link className="tab" to={teams}>Teams</Link>}
              {history.length > 0 && <a className="tab" href="#history">History</a>}
            </nav>
            <div id="strategy" style={css('display:flex;flex-direction:column;gap:44px;margin-top:28px')}>
              {priorities.length > 0 ? (
                /* The prototype's three across, as its own narrow grids do (repeat(auto-fit,minmax(…,1fr))): fewer columns as the width
                   drops, never a sideways scroll (Hafsah, 21 November, in an 800px pane). */
                <section style={css('display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;align-items:stretch')}>
                  {priorities.map((pr) => <APriority key={pr.id} pr={pr} />)}
                </section>
              ) : (
                <p className="t-small">No priorities yet.</p>
              )}
              {/* Where the strategy is set, from the strategy itself (Hafsah, 21 November): the one "Add or change a goal". */}
              {goals}
              {(page.notReaching ?? []).length > 0 && (
                <section className="sec">
                  <div className="sec-h"><h2 className="t-h2">Where the strategy isn’t reaching the work</h2><span className="t-small mut">Questions for the person who can answer each one</span></div>
                  <div className="list">
                    {page.notReaching!.map((o) => (
                      <div key={o.id} className="item" style={css('grid-template-columns:4px minmax(0,1fr) 180px auto')}>
                        <i className="sp act" />
                        <div>
                          <div className="h">{o.observation}</div>
                          <div className="s">{o.question}</div>
                        </div>
                        <span className="t-small mut">{o.forWhom}</span>
                        <button type="button" className="btn sec" onClick={() => askWith(o.question)}>{o.forWhom === 'For you' ? 'Decide' : 'Ask'}</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(page.namedByTeams ?? []).map((n) => (
                <section key={n.id} className="sec">
                  <div className="sec-h"><h2 className="t-h2">Named by more than one team</h2><span className="t-small mut">Nobody on a single team would see this</span></div>
                  <div className="panel pad" style={css('display:flex;flex-direction:column;gap:16px')}>
                    <div style={css('display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap')}>
                      <h3 className="t-h3">{n.title}</h3>
                      {n.touches && <span className="t-small mut">{n.touches}</span>}
                    </div>
                    <div style={css('display:grid;grid-template-columns:repeat(3,1fr);gap:24px')}>
                      {n.teams.map((t) => (
                        <div key={t.team} style={css('border-top:3px solid var(--ink);padding-top:10px')}>
                          <b className="t-body">{t.team}</b>
                          <p className="t-small" style={css('margin-top:4px')}>{t.says}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ))}
              {(page.saidAndShown ?? []).length > 0 && (
                <section className="sec">
                  <h2 className="t-h2">What you say, and where the time goes</h2>
                  <div>
                    <div style={css('display:grid;grid-template-columns:220px minmax(0,1fr) minmax(0,1fr);gap:24px;padding:14px 0;border-top:1px solid var(--rule)')}>
                      <span className="t-small mut" />
                      <b className="t-small">You said</b>
                      <b className="t-small">The check-ins show</b>
                    </div>
                    {page.saidAndShown!.map((s) => (
                      <div key={s.id} style={css('display:grid;grid-template-columns:220px minmax(0,1fr) minmax(0,1fr);gap:24px;padding:14px 0;border-top:1px solid var(--rule)')}>
                        <b className="t-body">{s.area}</b>
                        <p className="quote">{`“${s.youSaid}”`}</p>
                        <p className="t-body">{s.checkInsShow}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {(page.whatWeKeep?.items ?? []).length > 0 && (
                <section className="sec">
                  <div className="sec-h"><h2 className="t-h2">Kept from check-ins</h2></div>
                  <div className="panel pad">
                    {page.whatWeKeep!.items.map((k) => (
                      <div key={k.id} className="row" style={css('grid-template-columns:minmax(0,1fr);padding:12px 0')}>
                        <div>
                          <b className="t-small">{/[.!?]$/.test((k.says ?? '').trim()) ? (k.says ?? '').trim() : `${(k.says ?? '').trim()}.`}</b>
                          <div className="t-tiny mut">{k.source}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
        {history.length > 0 && (
          <section className="sec" id="history" style={css('margin-top: 36px;')}>
            <div className="sec-h"><h2 className="t-h2">History</h2></div>
            <div className="panel pad">
              {history.map((h) => (
                <div key={h.number} className="row" style={css('grid-template-columns:minmax(0,1fr);padding:12px 0')}>
                  <div><b className="t-small">{h.says}</b>{h.whatChanged && <div className="t-tiny mut">{h.whatChanged}</div>}</div>
                </div>
              ))}
            </div>
          </section>
        )}
        {/* The Desk's own parts, each a section 36px apart, as the prototype spaces "What new people keep asking" (margin-top: 36px). */}
        <div className="stack" style={css('gap:36px;margin-top:36px')}>{theDesksOwnParts}</div>
      </div>
    </div>
  )
}
