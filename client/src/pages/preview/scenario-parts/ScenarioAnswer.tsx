import { Panel } from '@/components/gw/ui'

/**
 * THE TOP OF A SCENARIO BOARD (prototype: loans.jpg, matter.jpg, mvq4.jpg): the question in small type, the answer in the
 * serif at headline size, optionally a bar that shows how far along it is and a line under it, and beside it the panel of
 * what needs the lead (with a heading of its own: "What needs you", "What you need to decide").
 */
export type AnswerData = {
  label: string
  answer: string
  bar?: { value: number; max: number }
  foot?: string
  needsHeading: string
  needs: { title: string; text: string }[]
}

export function ScenarioAnswer({ d, id }: { d: AnswerData; id: string }) {
  return (
    <div className="gwui-scn-answer">
      <section aria-labelledby={id}>
        <p id={id} className="t-small mut">{d.label}</p>
        <p className="gwui-scn-lead">{d.answer}</p>
        {d.bar && (
          <div className="gwui-scn-bar" role="progressbar" aria-label={d.label} aria-valuemin={0} aria-valuemax={d.bar.max} aria-valuenow={d.bar.value}>
            <span style={{ width: `${(d.bar.value / d.bar.max) * 100}%` }} />
          </div>
        )}
        {d.foot && <p className="t-small mut gwui-scn-foot">{d.foot}</p>}
      </section>
      <Panel as="section" aria-label={d.needsHeading}>
        <h2 className="gwui-scn-needs-h">{d.needsHeading}</h2>
        <ul className="gwui-scn-needs">
          {d.needs.map((n) => (
            <li key={n.title}>
              <h3 className="gwui-table-lead">{n.title}</h3>
              <p className="gwui-panel-text-muted">{n.text}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
