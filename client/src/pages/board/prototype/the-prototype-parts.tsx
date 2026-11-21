/**
 * THE PARTS EVERY PORTED CHECK-IN BOARD SHARES (Hafsah, 21 November 2026), each the prototype's markup as its boards draw it
 * (docs/boards-21-nov/prototype-dom/*.html): the header with its tabs and "Last updated" line, "Where this is heading", "Every session"
 * and the Ask bar. One copy each, so the ported boards cannot drift apart.
 */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { css } from './the-prototype-markup'
import { SpeechMark, THE_BOARD_ONLY_CHANGES } from './TheSalesBoardAsPictured'
import { OUTCOME_WORDS, OUTCOME_ORDER } from '../pictured/ThePicturedSalesBoard'
import { whenTheBoardLastChanged } from '../when-the-board-last-changed'
import { theScheduleInWords } from '../pictured/ThePicturedSalesBoard'
import { phaseSpineSentence } from '@/lib/phase-spine-sentence'

type Any = any

/** "Every Friday. Session 2 of 6. Runs until 21 January.", or with the names first ("Imani and Baraka. ..."). */
export function theHeaderLine(b: Any, ground: Any, names?: string | null): string {
  return [
    names,
    theScheduleInWords(ground, b.phaseSpine?.sessions?.[b.phaseSpine.sessions.length - 1]?.opensOn ?? null),
    phaseSpineSentence(b.phaseSpine?.currentSession ? { startsAt: null, endsAt: b.phaseSpine?.endsAt ?? null, currentSession: b.phaseSpine.currentSession } : null, b.phaseSpine?.plannedSessions ?? null, 'Session'),
  ].filter(Boolean).join(' ')
}

/** The header of kwame-first-90-days-as-lead.html: crumb, title, line, "Your check-in", "Ask", the tabs, and "Last updated …". */
export function TheCheckInsHeader({ b, line, tabs, lead, showAsk, addSomething, groundId }: {
  b: Any; line: string; tabs: { key: string; label: string; to: string }[]; lead: boolean; showAsk: () => void; addSomething?: ReactNode; groundId: string
}) {
  const updated = whenTheBoardLastChanged(b.lastChangedAt)
  return (
    <>
      <div className="crumb"><Link to="/grounds">Check-ins</Link><span aria-hidden="true">/</span><span>{b.title}</span></div>
      <div style={css('display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:10px;flex-wrap:wrap')}>
        <div>
          <h1 className="t-title">{b.title}</h1>
          {line && <p className="mut" style={css('margin-top:4px')}>{line}</p>}
        </div>
        <Link className="btn pri" to={`/grounds/${groundId}`}>{lead ? 'Your check-in' : 'Start my check-in'}</Link>
        {addSomething}
        <button type="button" className="btn quiet askbtn" onClick={showAsk}><SpeechMark size={18} /><span>Ask</span></button>
      </div>
      <nav className="tabs" aria-label="This check-in">
        {tabs.map((t) => <Link key={t.key} className={t.key === 'board' ? 'tab on' : 'tab'} to={t.to} aria-current={t.key === 'board' ? 'page' : undefined}>{t.label}</Link>)}
      </nav>
      {updated && <p className="t-tiny mut" id="fromreports" style={css('margin-top:8px')}>{`${updated} ${THE_BOARD_ONLY_CHANGES}`}</p>}
    </>
  )
}

/** "Where this is heading": the outcomes in the prototype's short words, the signals, what would settle it, and who decides. */
export function WhereThisIsHeadingAsPictured({ b, lead, onRecordTheDecision }: { b: Any; lead: boolean; onRecordTheDecision: () => void }) {
  const heading = b.whereThisIsHeading
  if (!heading) return null
  const rank = (v: string) => (OUTCOME_ORDER.includes(v) ? OUTCOME_ORDER.indexOf(v) : 99)
  const outcomes: Any[] = (heading.outcomes ?? []).filter((o: Any) => o.value !== 'NOT_YET').sort((a: Any, c: Any) => rank(a.value) - rank(c.value))
  return (
    <section className="sec" id="heading" style={css('margin-top:44px')}>
      <div className="sec-h"><h2 className="t-h2">{heading.heading ?? 'Where this is heading'}</h2>{heading.about && <span className="t-small mut">{heading.about}</span>}</div>
      <div className="hero2" style={css('display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:28px;align-items:start')}>
        <div className="stack" style={css('gap:10px')}>
          <b className="t-small mut">The possible outcomes</b>
          {outcomes.length ? outcomes.map((o) => <div key={o.value} className="panel" style={css('padding:14px 16px;')}><b>{OUTCOME_WORDS[o.value] ?? o.says}</b></div>) : <span className="t-small">{heading.outcomesSays}</span>}
        </div>
        <div className="stack" style={css('gap:16px')}>
          {(heading.signals ?? []).length > 0 && (
            <div>
              <b className="t-small mut">The signals behind them</b>
              {heading.signals.map((s: Any, i: number) => (
                <div key={i} style={css('display:grid;grid-template-columns:18px minmax(0,1fr) 90px;gap:10px;padding:10px 0;border-top:1px solid var(--rule);align-items:start')}>
                  <i className={s.mark === 'proven' ? 'mk rec' : 'mk said'} aria-hidden="true" />
                  <div><b className="t-small">{s.says}</b><div className="t-tiny mut">{s.from}</div></div>
                  <span />
                </div>
              ))}
            </div>
          )}
          {(heading.whatWouldSettleIt ?? []).length > 0 && (
            <div className="panel pad stack" style={css('gap:6px')}>
              <b className="t-small">What would settle it</b>
              {heading.whatWouldSettleIt.map((w: string) => <span key={w} className="t-small">{w}</span>)}
            </div>
          )}
          <div style={css('background:var(--dark);color:#fff;border-radius:12px;padding:14px 16px')}>
            <b>{heading.whoDecides}</b>
            <p className="t-small" style={css('opacity:.8;margin-top:4px')}>Groundwork lays out the outcomes and the proof. It doesn’t choose.</p>
            {heading.decided ? <p className="t-small" style={css('margin-top:10px')}>{heading.decided}</p> : lead ? <button type="button" className="btn" style={css('margin-top:10px;background:#fff;color:var(--ink)')} onClick={onRecordTheDecision}>{heading.recordTheDecision ?? 'Record the decision'}</button> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

/** "Every session", the prototype's full-width secondary button. */
export function EverySession({ groundId, children }: { groundId: string; children?: ReactNode }) {
  return <div className="stack" style={css('gap:20px;margin-top:36px')}><Link className="btn sec" to={`/grounds/${groundId}?tab=report`}>Every session</Link>{children}</div>
}

/** The Ask bar at the foot of every board. */
export function TheAskBar({ example, askWith, showAsk }: { example: string; askWith: (q: string) => void; showAsk: () => void }) {
  const [q, setQ] = useState('')
  const ask = () => { if (q.trim()) askWith(q.trim()); else showAsk() }
  return (
    <div className="askdock" style={css('margin-top:36px')}>
      <SpeechMark size={20} />
      <input className="input" placeholder={example} aria-label="Ask about this board" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask() }} />
      <button type="button" className="btn pri" onClick={ask}>Ask</button>
    </div>
  )
}
