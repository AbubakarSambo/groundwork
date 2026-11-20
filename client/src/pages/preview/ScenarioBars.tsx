import { Section, Panel } from '@/components/gw/ui'

/**
 * THE BARS OF THE SCENARIO BOARDS' "SHAPE OF THE WORK" (prototype: programme.jpg and salesorg.jpg). Plain bars drawn with CSS, each
 * one with its numbers written beside it so nothing is read from the bar alone. Classes `gwui-scb-*` in gw-ui.css.
 */
export type ShapeShare = {
  heading: string; note: string; foot: string
  share: { heading: string; target: number; rows: { label: string; value: string; pct: number; tone: string }[] }
  dropoff: { heading: string; rows: { label: string; value: string; pct: number }[] }
}

/** Two panels: a share against its target (a tick at the target), and how many are left after each step. */
export function ShareAndDropOff({ shape }: { shape: ShapeShare }) {
  return (
    <Section heading={shape.heading} note={shape.note} foot={shape.foot}>
      <div className="gwui-two-up gwui-two-up-top">
        <Panel>
          <h3 className="gwui-subheading gwui-subheading-kicker">{shape.share.heading}</h3>
          <ul className="gwui-scb-bars">
            {shape.share.rows.map((r) => (
              <li key={r.label}>
                <div className="gwui-scb-bar-top"><span>{r.label}</span><strong>{r.value}</strong></div>
                <div className="gwui-scb-track" role="img" aria-label={`${r.label}: ${r.value}, target ${shape.share.target}%`}>
                  <span className={r.tone === 'on' ? 'gwui-scb-fill gwui-scb-fill-on' : 'gwui-scb-fill gwui-scb-fill-att'} style={{ width: `${r.pct}%` }} />
                  <span className="gwui-scb-tick" style={{ left: `${shape.share.target}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h3 className="gwui-subheading gwui-subheading-kicker">{shape.dropoff.heading}</h3>
          <ul className="gwui-scb-steps">
            {shape.dropoff.rows.map((r) => (
              <li key={r.label}>
                <span>{r.label}</span>
                <span className="gwui-scb-track gwui-scb-track-thin" aria-hidden><span className="gwui-scb-fill gwui-scb-fill-navy" style={{ width: `${r.pct}%` }} /></span>
                <span>{r.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Section>
  )
}

export type ShapeReported = {
  heading: string; note: string; foot: string; legend: string; max: number
  rows: { label: string; said: number | null; met: number; value: string }[]
}

/** What people reported (an outlined bar) against what meets the criteria (the filled part), one row per stage. */
export function ReportedAgainstMet({ shape }: { shape: ShapeReported }) {
  return (
    <Section heading={shape.heading} note={shape.note} foot={shape.foot}>
      <Panel>
        <ul className="gwui-scb-steps gwui-scb-steps-reported">
          {shape.rows.map((r) => {
            const whole = r.said ?? r.met
            return (
              <li key={r.label}>
                <span>{r.label}</span>
                <span className="gwui-scb-reported">
                  <span className={r.said ? 'gwui-scb-outline' : 'gwui-scb-outline gwui-scb-outline-none'} style={{ width: `${(whole / shape.max) * 100}%` }}>
                    <span className="gwui-scb-fill gwui-scb-fill-on" style={{ width: `${(r.met / whole) * 100}%` }} />
                  </span>
                </span>
                <span>{r.value}</span>
              </li>
            )
          })}
        </ul>
        <p className="t-small gwui-scb-legend-note">{shape.legend}</p>
      </Panel>
    </Section>
  )
}
