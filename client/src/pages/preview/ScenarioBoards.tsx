import { Link, useParams } from 'react-router-dom'
import { PageTitle, Section, Panel, Stack } from '@/components/gw/ui'
import { SCENARIO_BOARDS } from './scenario-boards'

/**
 * THE SCENARIO BOARDS' PREVIEW (development builds only, never in production). /scenario-boards lists the eleven example boards;
 * /scenario-boards/:kind draws one with its demo data. No sign-in, no server. How to add a board: see scenario-boards.ts.
 */
export function ScenarioBoards() {
  const { kind } = useParams()
  if (!kind) {
    return (
      <div className="main" data-scenario-index>
        <PageTitle title="Example boards" subtitle="The lead’s board for eleven kinds of work, drawn from the prototype with sample data." />
        <Section heading="Eleven kinds of work">
          <Stack gap={12}>
            {SCENARIO_BOARDS.map((b) => (
              <Panel key={b.kind}>
                {b.Component ? <Link to={`/scenario-boards/${b.kind}`} className="gwui-table-lead">{b.title}</Link> : <span className="gwui-table-lead">{b.title}</span>}
                <p className="gwui-panel-text-muted">{b.about}{b.Component ? '' : ' Not built yet.'}</p>
              </Panel>
            ))}
          </Stack>
        </Section>
      </div>
    )
  }
  const board = SCENARIO_BOARDS.find((b) => b.kind === kind)
  if (!board || !board.Component) {
    return (
      <div className="main">
        <PageTitle crumbs={[{ label: 'Example boards', to: '/scenario-boards' }]} title={board ? board.title : 'No such board'} subtitle={board ? 'This board is not built yet.' : 'There is no example board with that name.'} />
        <p className="gwui-panel-text">Go back to the <Link to="/scenario-boards">list of example boards</Link>.</p>
      </div>
    )
  }
  const Board = board.Component
  return <Board />
}
