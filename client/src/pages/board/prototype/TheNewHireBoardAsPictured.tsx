/**
 * A NEW HIRE'S FIRST NINETY DAYS, PORTED FROM THE PROTOTYPE'S OWN MARKUP (Hafsah, 21 November 2026), for whoever runs it, behind the
 * design switch. The prototype's board is "Kwame, first 90 days" (docs/boards-21-nov/prototype-dom/kwame-first-90-days-as-lead.html,
 * B6-ending-a-check-in/day-30-and-60.txt): the same tags, nesting, class names and inline styles, on the prototype's scoped app.css.
 *
 * Every slot is the board the server served this reader: what was agreed at the start (startingState), the change since the last
 * check-in (changeSinceLast), the ninety days in three steps (ninetyDays), the new hire's history (personHistory), where the two of them
 * see it differently (divergence), and where this is heading. Where the record holds nothing for a part the prototype always shows,
 * the part says so in a sentence.
 */
import { Link } from 'react-router-dom'
import { css } from './the-prototype-markup'
import { TheCheckInsHeader, WhereThisIsHeadingAsPictured, EverySession, TheAskBar, theHeaderLine } from './the-prototype-parts'
import './the-prototype-boards.css'

type Any = any
const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''

export interface TheNewHireBoardAsPicturedProps {
  b: Any
  ground: Any
  groundId: string
  tabs: { key: string; label: string; to: string }[]
  addSomething?: React.ReactNode
  showAsk: () => void
  askWith: (q: string) => void
  onRecordTheDecision: () => void
}

export function TheNewHireBoardAsPictured(p: TheNewHireBoardAsPicturedProps) {
  const { b, groundId } = p
  const lead = (b.participants ?? []).find((x: Any) => x.partyType === 'INITIATOR') ?? null
  const hire = (b.participants ?? []).find((x: Any) => x.partyType !== 'INITIATOR' && !x.managingOnly) ?? null
  const hireName = firstName(hire?.name) || 'the new hire'
  const leadName = firstName(lead?.name)
  const names = hire && leadName ? `${hireName} and ${leadName}.` : null
  /* Done when every planned session is done, by the server's own count of sessions done (howItIsGoing's roundsDone), as the list reads it. */
  const progress = b.howItIsGoing?.glance?.progress
  const lastIsDone = !!progress?.roundsPlanned && (progress.roundsDone ?? 0) >= progress.roundsPlanned
  const agreed: Any[] = typeof b.startingState === 'object' && b.startingState ? b.startingState.rows ?? [] : []
  const changes: Any[] = b.changeSinceLast?.rows ?? []
  const steps: Any[] = b.ninetyDays?.steps ?? []
  const history = (b.personHistory ?? []).find((h: Any) => h.participantId === hire?.id) ?? null
  /* The first thing the two of them see differently, both views word for word (as ThePicturedBoard reads divergence). */
  const accounts: Any[] = ((b.divergence?.items ?? []) as Any[]).find((d) => (d.positions ?? []).length >= 2)?.positions?.slice(0, 2) ?? []
  return (
    <div className="gw-proto">
      <div className="wrap">
        <TheCheckInsHeader b={b} line={theHeaderLine(b, p.ground, names)} tabs={p.tabs} lead showAsk={p.showAsk} addSomething={p.addSomething} groundId={groundId} />
        <div className="stack" style={css('gap:36px;margin-top:24px')}>
          {lastIsDone && (
            <section className="panel pad" style={css('display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;background:var(--act-soft);border-color:transparent')}>
              <div><b className="t-h3">The last session is done</b><p className="t-small" style={css('margin-top:4px')}>It’s yours to decide how this ends.</p></div>
              <Link className="btn pri" to={`/grounds/${groundId}/end`}>Decide how it ends</Link>
            </section>
          )}
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">What was agreed at the start</h2>{agreed.length > 0 && <span className="t-small mut">Confirmed by both on day 1</span>}</div>
            {agreed.length ? (
              <div className="g3">
                {agreed.map((a: Any, i: number) => (
                  <div key={i} className="panel pad">
                    <span className="t-small mut">{a.when}</span>
                    <p style={css('font-weight:700;margin-top:4px')}>{a.what ?? a.says}</p>
                  </div>
                ))}
              </div>
            ) : <div className="panel pad"><p className="t-small">{`Nothing was agreed at the start yet. ${leadName ? `You and ${hireName}` : 'The two of you'} agree it in the first check-ins, and it shows here.`}</p></div>}
          </section>
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">Change since last check-in</h2></div>
            <div className="panel pad">
              {changes.length ? changes.map((c: Any, i: number) => (
                <div key={i} className="row" style={css('grid-template-columns:120px 1fr 100px')}>
                  <b className="t-small">{c.area}</b>
                  <span className="t-small">{c.says}</span>
                  <span className={c.state === 'late' ? 'tag att' : 'tag rec'}>{c.state === 'moved' ? 'Moved' : c.state === 'held' ? 'Held' : 'Late'}</span>
                </div>
              )) : <p className="t-small">Nothing has changed since the last check-in yet.</p>}
            </div>
          </section>
          {steps.length > 0 && (
            <section className="sec" id="steps3" style={css('margin-bottom: 24px;')}>
              <div className="sec-h"><h2 className="t-h2">{b.ninetyDays?.heading ?? 'The 90 days, in three steps'}</h2>{leadName && <span className="t-small mut">{`${leadName} and ${hireName} see the same pictures`}</span>}</div>
              <div className="stack" style={css('gap:12px')}>
                {steps.map((s: Any) => s.day >= 90 ? (
                  <div key={s.day} className="panel pad" style={css('display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap')}>
                    <b>{`${s.step}: ${s.question.charAt(0).toLowerCase()}${s.question.slice(1)}`}</b>
                    <Link className="btn sec sm" to={`/grounds/${groundId}/end`}>Open it</Link>
                  </div>
                ) : (
                  <details key={s.day} className="panel pad" open={s.reached}>
                    <summary style={css('cursor:pointer')}><b>{`${s.step}: ${s.question.charAt(0).toLowerCase()}${s.question.slice(1)}`}</b></summary>
                    <p className="t-small mut" style={css('margin-top:8px')}>{s.says}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
          {history && (
            <section className="sec">
              <div className="sec-h"><h2 className="t-h2">{`${hireName}’s history, ${(history.sessions ?? []).length} ${(history.sessions ?? []).length === 1 ? 'session' : 'sessions'}`}</h2><span className="t-small mut">Agreement, commitments, work, evidence, feedback, changes</span></div>
              <div className="panel">
                <div className="row" style={css('grid-template-columns:150px 1fr;padding:12px 18px')}><b>Check-ins</b><span>{history.says}</span></div>
                {(history.sessions ?? []).map((s: Any) => (
                  <div key={s.n} className="row" style={css('grid-template-columns:150px 1fr;padding:12px 18px')}><b>{`Session ${s.n}`}</b><span>{s.says}</span></div>
                ))}
              </div>
            </section>
          )}
          <section className="sec">
            <div className="sec-h"><h2 className="t-h2">Where you both see it differently</h2></div>
            {accounts.length ? (
              <div className="panel pad g2">
                {accounts.map((a: Any, i: number) => (
                  <div key={i}><b className="t-small">{a.who === 'You' ? 'You' : firstName(a.who)}</b><p className="quote">{`“${a.view}”`}</p></div>
                ))}
              </div>
            ) : <div className="panel pad"><p className="t-small">{`You and ${hireName} have not seen anything differently yet.`}</p></div>}
          </section>
          <EverySession groundId={groundId} />
        </div>
        <WhereThisIsHeadingAsPictured b={b} lead onRecordTheDecision={p.onRecordTheDecision} />
        <TheAskBar example={`Ask about this board, for example “How is ${hireName} settling in?”`} askWith={p.askWith} showAsk={p.showAsk} />
      </div>
    </div>
  )
}
