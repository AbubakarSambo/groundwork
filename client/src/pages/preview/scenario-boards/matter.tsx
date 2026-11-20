import { Section, Panel, Button, FlexRow, Table, Stack, EvidenceDot, EvidenceKey } from '@/components/gw/ui'
import { ScenarioBoardFrame } from '../ScenarioBoardFrame'
import { ScenarioAnswer } from '../scenario-parts/ScenarioAnswer'
import { ScenarioNotice } from '../scenario-parts/ScenarioNotice'
import { WhereThisIsHeading } from '../scenario-parts/WhereThisIsHeading'
import fixture from '../__fixtures__/scenario-matter.json'

/**
 * THE LAW FIRM MATTER BOARD (prototype: docs/prototype/screens/G1-example-check-ins/matter.txt and matter.jpg).
 * Every sentence is in __fixtures__/scenario-matter.json; this file only lays them out.
 * Sections: where the matter stands and what to decide, two notices, What changed this week, the handover, Where this is heading.
 */
export { fixture }
type Data = typeof fixture

export default function MatterBoard({ data = fixture }: { data?: Data }) {
  const d = data
  return (
    <ScenarioBoardFrame title={d.title} subtitle={d.subtitle} updated={d.updated} aim={d.aim} leadName={d.leadName}>
      <Stack gap={30}>
        <ScenarioAnswer d={d.answer} id="matter-answer" />
        <Stack gap={12}>
          <ScenarioNotice strong {...d.confident} />
          <ScenarioNotice {...d.strategy} />
        </Stack>

        <Section heading={d.changed.heading}>
          <div className="gwui-scn-bare">
            <Table
              onPanel={false}
              caption={d.changed.heading}
              hideHeader
              phone="stack"
              columns={[{ key: 'who', header: 'What changed', rowHeader: true, width: '24%' }, { key: 'said', header: 'What it changed' }]}
              rows={d.changed.rows.map((r) => ({ who: <><EvidenceDot kind={r.kind} />{r.who}</>, said: r.said }))}
            />
          </div>
          <EvidenceKey items={d.changed.key} />
        </Section>

        <Panel>
          <FlexRow justify="space-between" align="center" gap={12}>
            <div className="gw-min0">
              <h3 className="gwui-table-lead">{d.handover.title}</h3>
              <p className="gwui-panel-text-muted">{d.handover.text}</p>
            </div>
            <Button kind="secondary">{d.handover.button}</Button>
          </FlexRow>
        </Panel>

        <WhereThisIsHeading d={d.heading} />
      </Stack>
    </ScenarioBoardFrame>
  )
}
