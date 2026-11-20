import { Section, Table, Stack, EvidenceDot, type TagTone } from '@/components/gw/ui'
import { ScenarioBoardFrame } from '../ScenarioBoardFrame'
import { ScenarioAnswer } from '../scenario-parts/ScenarioAnswer'
import { CountCards } from '../scenario-parts/ScenarioCards'
import { ScenarioPatterns } from '../scenario-parts/ScenarioPatterns'
import { WhereThisIsHeading } from '../scenario-parts/WhereThisIsHeading'
import fixture from '../__fixtures__/scenario-loans.json'

/**
 * THE ASSET LOANS BOARD (prototype: docs/prototype/screens/G1-example-check-ins/loans.txt and loans.jpg).
 * Every sentence and number is in __fixtures__/scenario-loans.json; this file only lays them out.
 * Sections: the answer and what needs you, Where the cohort stands, Every trader, One person a place or the model,
 * Support given, Where this is heading.
 */
export { fixture }
type Data = typeof fixture

export default function LoansBoard({ data = fixture }: { data?: Data }) {
  const d = data
  const h = d.traders.headers
  return (
    <ScenarioBoardFrame title={d.title} subtitle={d.subtitle} updated={d.updated} leadName={d.leadName}>
      <Stack gap={30}>
        <ScenarioAnswer d={d.answer} id="loans-answer" />

        <Section heading={d.stands.heading} note={d.stands.note}>
          <CountCards cards={d.stands.cards} label={d.stands.heading} />
        </Section>

        <Section heading={d.traders.heading} note={d.traders.note} foot={d.traders.foot}>
          <Table
            caption={d.traders.heading}
            minWidth={860}
            columns={[
              { key: 'trader', header: h.trader, rowHeader: true },
              { key: 'business', header: h.business },
              { key: 'sales', header: h.sales },
              { key: 'repayment', header: h.repayment },
              { key: 'way', header: h.way },
              { key: 'next', header: h.next },
            ]}
            rows={d.traders.rows.map((r) => ({
              trader: <>{r.name}<span className="gwui-table-sub">{r.place}</span></>,
              business: <><EvidenceDot kind={r.dot} />{r.business}</>,
              sales: r.sales,
              repayment: { tag: r.repayment, tone: r.tone as TagTone },
              way: r.way,
              next: <span className="gwui-scn-next">{r.next}</span>,
            }))}
          />
        </Section>

        <Section heading={d.patterns.heading} note={d.patterns.note}>
          <ScenarioPatterns items={d.patterns.items} label={d.patterns.heading} />
        </Section>

        <Section heading={d.support.heading}>
          <div className="gwui-scn-bare">
            <Table
              onPanel={false}
              caption={d.support.heading}
              hideHeader
              phone="stack"
              columns={[{ key: 'what', header: 'Support', rowHeader: true, width: '40%' }, { key: 'who', header: 'Who had it', width: '22%' }, { key: 'result', header: 'What happened' }]}
              rows={d.support.rows}
            />
          </div>
        </Section>

        <WhereThisIsHeading d={d.heading} />
      </Stack>
    </ScenarioBoardFrame>
  )
}
