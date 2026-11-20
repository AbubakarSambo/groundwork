import { Section, Panel, Table, Stack } from '@/components/gw/ui'
import { ScenarioBoardFrame } from '../ScenarioBoardFrame'
import { GroupCards } from '../scenario-parts/ScenarioCards'
import { WhereThisIsHeading } from '../scenario-parts/WhereThisIsHeading'
import fixture from '../__fixtures__/scenario-mvnext.json'

/**
 * THE MARKETVIEW "WHERE NEXT" BOARD (prototype: docs/prototype/screens/G1-example-check-ins/mvnext.txt and mvnext.jpg).
 * Every sentence and number is in __fixtures__/scenario-mvnext.json; this file only lays them out.
 * Sections: In short, By who they are, Where next ranked, Where they disagree, What this can't tell you, Where this is heading.
 */
export { fixture }
type Data = typeof fixture

export default function MvNextBoard({ data = fixture }: { data?: Data }) {
  const d = data
  return (
    <ScenarioBoardFrame title={d.title} subtitle={d.subtitle} updated={d.updated} leadName={d.leadName}>
      <Stack gap={30}>
        <Section heading={d.short.heading} foot={d.short.foot}>
          {d.short.lines.map((l) => <p key={l} className="gwui-scn-quote gwui-scn-quote-lead">{l}</p>)}
        </Section>

        <Section heading={d.groups.heading} note={d.groups.note}>
          <GroupCards cards={d.groups.cards} label={d.groups.heading} />
        </Section>

        <Section heading={d.ranked.heading} note={d.ranked.note}>
          <Table
            caption={d.ranked.heading}
            hideHeader
            phone="stack"
            columns={[{ key: 'what', header: 'What', rowHeader: true, width: '20%' }, { key: 'answer', header: 'What they said', width: '50%' }, { key: 'count', header: 'From how many, and who' }]}
            rows={d.ranked.rows}
          />
        </Section>

        <Section heading={d.disagree.heading} foot={d.disagree.foot}>
          <Panel>
            <div className="gwui-scn-cols2">
              {d.disagree.sides.map((s) => (
                <div key={s.who}>
                  <h3 className="gwui-table-lead">{s.who}</h3>
                  <p className="gwui-scn-quote">{s.quote}</p>
                </div>
              ))}
            </div>
          </Panel>
        </Section>

        <Section heading={d.cant.heading}>
          <p className="t-body">{d.cant.text}</p>
        </Section>

        <WhereThisIsHeading d={d.heading} />
      </Stack>
    </ScenarioBoardFrame>
  )
}
