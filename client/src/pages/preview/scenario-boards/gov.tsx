import { Section, Panel, Button, SubHeading, FlexRow, Table, Dot, Stack } from '@/components/gw/ui'
import { ScenarioBoardFrame } from '../ScenarioBoardFrame'
import fixture from '../__fixtures__/scenario-gov.json'

/**
 * THE GOVERNMENT PROGRAMME'S BOARD (prototype: docs/prototype/screens/G1-example-check-ins/gov.txt and gov.jpg).
 * Every sentence and number is in __fixtures__/scenario-gov.json; this file only lays them out.
 * Sections: Where it stands, What each level understood, The three counties, the counties' question, Where this is heading.
 */
export { fixture }
type Data = typeof fixture

export default function GovBoard({ data = fixture }: { data?: Data }) {
  const d = data
  return (
    <ScenarioBoardFrame title={d.title} subtitle={d.subtitle} updated={d.updated} aim={d.aim} leadName={d.leadName}>
      <Stack gap={30}>
        <section aria-labelledby="gov-stands">
          <p id="gov-stands" className="t-small mut">Where it stands</p>
          <p className="gwui-scn-lead">{d.whereItStands}</p>
        </section>

        <Section heading={d.levels.heading} note={d.levels.note}>
          <Table
            caption={d.levels.heading}
            hideHeader
            phone="stack"
            columns={[{ key: 'who', header: 'Level', rowHeader: true, width: '23%' }, { key: 'said', header: 'What it understood' }]}
            rows={d.levels.rows.map((r) => ({
              _highlight: !!r.flag,
              who: <><Dot filled={r.onRecord} />{r.who}</>,
              said: r.flag ? <>{r.said}<span className="gwui-table-flag">{r.flag}</span></> : r.said,
            }))}
          />
        </Section>

        <Section heading={d.counties.heading} note={d.counties.note}>
          <Panel pad={false}>
            <Table
              onPanel={false}
              caption={d.counties.heading}
              hideHeader
              phone="stack"
              columns={[{ key: 'county', header: 'County', rowHeader: true, width: '13%' }, { key: 'numbers', header: 'What the visit log shows', width: '37%' }, { key: 'why', header: 'What is behind it' }]}
              rows={d.counties.rows}
            />
            <p className="gwui-panel-text gwui-table-foot"><strong>{d.counties.foot.lead}</strong> {d.counties.foot.text}</p>
          </Panel>
        </Section>

        <Panel>
          <FlexRow justify="space-between" align="center" gap={12}>
            <div className="gw-min0">
              <h3 className="gwui-table-lead">{d.questions.heading}</h3>
              <p className="gwui-panel-text-muted">{d.questions.text}</p>
            </div>
            <Button kind="secondary">{d.questions.button}</Button>
          </FlexRow>
        </Panel>

        <Section heading={d.heading.heading} note={d.heading.note}>
          <div className="gwui-two-up gwui-two-up-top">
            <div>
              <SubHeading as="h3" tone="kicker">{d.heading.outcomesLabel}</SubHeading>
              <ul className="gwui-scn-outcomes" aria-label={d.heading.outcomesLabel}>
                {d.heading.outcomes.map((o) => <li key={o} className="panel gwui-scn-outcome">{o}</li>)}
              </ul>
            </div>
            <div>
              <SubHeading as="h3" tone="kicker">{d.heading.signalsLabel}</SubHeading>
              <Stack gap={12}>
              <Table
                onPanel={false}
                caption={d.heading.signalsLabel}
                hideHeader
                phone="stack"
                columns={[{ key: 'signal', header: 'Signal', rowHeader: true }]}
                rows={d.heading.signals.map((s) => ({
                  signal: <><Dot filled={s.onRecord} /><span className="gwui-table-lead gwui-table-inline">{s.line}</span><span className="gwui-table-sub gwui-table-indent">{s.from}</span></>,
                }))}
              />
              <Panel>
                <h3 className="gwui-table-lead">{d.heading.settleLabel}</h3>
                <p className="gwui-panel-text">{d.heading.settle}</p>
              </Panel>
              <Panel className="gwui-panel-dark">
                <h3 className="gwui-table-lead gwui-table-on-dark">{d.heading.decider}</h3>
                <p className="gwui-table-on-dark-sub">{d.heading.deciderNote}</p>
                <Button kind="secondary">{d.heading.button}</Button>
              </Panel>
              </Stack>
            </div>
          </div>
        </Section>
      </Stack>
    </ScenarioBoardFrame>
  )
}
