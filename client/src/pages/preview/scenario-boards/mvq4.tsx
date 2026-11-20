import { Section, Panel, SubHeading, Table, Stack, EvidenceDot, type TagTone } from '@/components/gw/ui'
import { ScenarioBoardFrame } from '../ScenarioBoardFrame'
import { ScenarioAnswer } from '../scenario-parts/ScenarioAnswer'
import { WhereThisIsHeading } from '../scenario-parts/WhereThisIsHeading'
import fixture from '../__fixtures__/scenario-mvq4.json'

/**
 * THE MARKETVIEW Q4 BOARD (prototype: docs/prototype/screens/G1-example-check-ins/mvq4.txt and mvq4.jpg).
 * Every sentence and number is in __fixtures__/scenario-mvq4.json; this file only lays them out.
 * Sections: the answer and what needs you, What the systems show (with where people and systems differ), Where this is heading.
 */
export { fixture }
type Data = typeof fixture

export default function MvQ4Board({ data = fixture }: { data?: Data }) {
  const d = data
  const s = d.systems
  return (
    <ScenarioBoardFrame title={d.title} subtitle={d.subtitle} updated={d.updated} leadName={d.leadName}>
      <Stack gap={30}>
        <ScenarioAnswer d={d.answer} id="mvq4-answer" />

        <Panel>
          <Section heading={s.heading} note={s.note}>
            <Table
              caption={s.heading}
              minWidth={640}
              columns={[
                { key: 'target', header: s.headers.target, rowHeader: true, width: '28%' },
                { key: 'goal', header: s.headers.goal },
                { key: 'now', header: s.headers.now },
                { key: 'source', header: s.headers.source },
                { key: 'against', header: s.headers.against },
              ]}
              rows={s.rows.map((r) => ({ ...r, source: <><EvidenceDot kind="shown" />{r.source}</> }))}
            />
            <SubHeading as="h3">{s.differLabel}</SubHeading>
            <div className="gwui-scn-bare">
              <Table
                onPanel={false}
                caption={s.differLabel}
                hideHeader
                phone="stack"
                columns={[{ key: 'said', header: 'What people said', width: '40%' }, { key: 'shows', header: 'What the system shows' }, { key: 'tag', header: 'What happened', width: '170px' }]}
                rows={s.differ.map((r) => ({
                  said: <><span className="gwui-scn-said">{r.saidLabel}</span> <span className="gwui-scn-plain">{r.said}</span></>,
                  shows: <><span className="gwui-scn-said">{r.showsLabel}</span> {r.shows}</>,
                  tag: { tag: r.tag, tone: r.tone as TagTone },
                }))}
              />
            </div>
          </Section>
        </Panel>

        <WhereThisIsHeading d={d.heading} />
      </Stack>
    </ScenarioBoardFrame>
  )
}
