import { Section, Panel, Button, SubHeading, Table, Stack, EvidenceDot, type TagTone } from '@/components/gw/ui'

/**
 * "WHERE THIS IS HEADING" of a scenario board (prototype: the last section of every board in
 * docs/prototype/screens/G1-example-check-ins/). The possible outcomes on the left, each a title and optionally one line;
 * on the right the signals behind them (an evidence dot, the line, where it comes from, and optionally a tag), what would
 * settle it, and the dark card that names who decides. Every word comes from the board's fixture.
 */
export type HeadingData = {
  heading: string
  note: string
  outcomesLabel: string
  outcomes: { title: string; sub?: string }[]
  signalsLabel: string
  signals: { line: string; from: string; kind: string; tag?: { tag: string; tone: string } }[]
  settleLabel: string
  settle: string
  decider: string
  deciderNote: string
  button: string
}

export function WhereThisIsHeading({ d }: { d: HeadingData }) {
  const withTags = d.signals.some((s) => s.tag)
  return (
    <Section heading={d.heading} note={d.note}>
      <div className="gwui-two-up gwui-two-up-top">
        <div>
          <SubHeading as="h3" tone="kicker">{d.outcomesLabel}</SubHeading>
          <ul className="gwui-scn-outcomes" aria-label={d.outcomesLabel}>
            {d.outcomes.map((o) => (
              <li key={o.title} className="panel gwui-scn-outcome">
                {o.title}
                {o.sub && <span className="gwui-scn-outcome-sub">{o.sub}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SubHeading as="h3" tone="kicker">{d.signalsLabel}</SubHeading>
          <Stack gap={12}>
            <Table
              onPanel={false}
              caption={d.signalsLabel}
              hideHeader
              phone="stack"
              columns={[{ key: 'signal', header: 'Signal', rowHeader: true }, ...(withTags ? [{ key: 'tag', header: 'How much weight it carries', numeric: true, width: '110px' }] : [])]}
              rows={d.signals.map((s) => ({
                signal: <><EvidenceDot kind={s.kind} /><span className="gwui-table-lead gwui-table-inline">{s.line}</span><span className="gwui-table-sub gwui-table-indent">{s.from}</span></>,
                tag: s.tag ? { tag: s.tag.tag, tone: s.tag.tone as TagTone } : undefined,
              }))}
            />
            <Panel>
              <h3 className="gwui-table-lead">{d.settleLabel}</h3>
              <p className="gwui-panel-text">{d.settle}</p>
            </Panel>
            <Panel className="gwui-panel-dark">
              <h3 className="gwui-table-lead gwui-table-on-dark">{d.decider}</h3>
              <p className="gwui-table-on-dark-sub">{d.deciderNote}</p>
              <Button kind="secondary">{d.button}</Button>
            </Panel>
          </Stack>
        </div>
      </div>
    </Section>
  )
}
