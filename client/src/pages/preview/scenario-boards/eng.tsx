import TeamBoard, { type TeamBoardData } from '../TeamBoardParts'
import fixture from '../__fixtures__/scenario-eng.json'

/**
 * THE ENG EXAMPLE BOARD (prototype: docs/prototype/screens/G1-example-check-ins/eng.txt and eng.jpg).
 * Every sentence and number is in __fixtures__/scenario-eng.json; the page itself is the shared team board (TeamBoardParts.tsx).
 */
export { fixture }

export default function Board({ data = fixture as unknown as TeamBoardData }: { data?: TeamBoardData }) {
  return <TeamBoard data={data} />
}
