import TeamBoard, { type TeamBoardData } from '../TeamBoardParts'
import fixture from '../__fixtures__/scenario-support.json'

/**
 * THE SUPPORT EXAMPLE BOARD (prototype: docs/prototype/screens/G1-example-check-ins/support.txt and support.jpg).
 * Every sentence and number is in __fixtures__/scenario-support.json; the page itself is the shared team board (TeamBoardParts.tsx).
 */
export { fixture }

export default function Board({ data = fixture as unknown as TeamBoardData }: { data?: TeamBoardData }) {
  return <TeamBoard data={data} />
}
