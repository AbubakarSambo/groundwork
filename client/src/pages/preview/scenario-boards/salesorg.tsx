import { Stack } from '@/components/gw/ui'
import { ScenarioBoardFrame } from '../ScenarioBoardFrame'
import { TargetHero, NeedsRows, ProofSection, TeamToday, StatCards, CheckedIn, BlockerCards, KeepsComingUp, ReportsTable, OtherBoardCards, WhereHeading } from '../ScenarioBoardParts'
import { ReportedAgainstMet } from '../ScenarioBars'
import fixture from '../__fixtures__/scenario-salesorg.json'

/**
 * THE SALES ORGANISATION'S BOARD (prototype: docs/prototype/screens/G1-example-check-ins/salesorg.txt and salesorg.jpg).
 * Every sentence and number is in __fixtures__/scenario-salesorg.json; the sections are the shared ones in ScenarioBoardParts.
 */
export { fixture }
type Data = typeof fixture

export default function SalesorgBoard({ data = fixture }: { data?: Data }) {
  const d = data
  return (
    <ScenarioBoardFrame title={d.title} subtitle={d.subtitle} updated={d.updated} aim={d.aim} leadName={d.leadName}>
      <Stack gap={30}>
        <TargetHero hero={d.hero} />
        <NeedsRows needs={d.needs} />
        <ProofSection proof={d.proof} />
        <TeamToday team={d.team} />
        <ReportedAgainstMet shape={d.shape} />
        <StatCards cards={d.cards} />
        <CheckedIn checked={d.checked} />
        <BlockerCards blockers={d.blockers} />
        <KeepsComingUp keeps={d.keeps} />
        <ReportsTable reports={d.reports} />
        <OtherBoardCards boards={d.boards} />
        <WhereHeading h={d.heading} />
      </Stack>
    </ScenarioBoardFrame>
  )
}
