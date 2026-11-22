import { Section, Empty, RowList, Row, Tag } from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import type { YourBoard, SomethingYouSaid } from '@/api/you'
import { TenAPage } from './TenAPage'

/**
 * YOUR COMMITMENTS (Hafsah, 21 November 2026: "commitments, open and kept, with dates"). What you said you would do in every
 * check-in you are in, and what became of it: `saidYoudDo` on GET /you, the one reading of a promise and its state that My work
 * reads too (your-board.ts, onePromiseOneState), so the two never disagree. The count kept in the last four weeks is `keptLately`,
 * worked out in your-board.ts alone and served to you alone. The heading and its note are the prototype's
 * (you-board-miriam.txt, "What you said you’d do", "From every check-in"). The page writes only the sentence around the server's facts.
 */
export function whatBecameOfIt(s: SomethingYouSaid): string {
  const said = s.saidAt ? whenItWas(s.saidAt, 'dayAndMonthLong') : ''
  const where = s.checkIn ? ` in ${s.checkIn}` : ''
  const first = said ? `You said this${where} on ${said}.` : `You said this${where}.`
  const settled = s.settledOn ? whenItWas(s.settledOn, 'dayAndMonthLong') : ''
  if (s.state === 'kept') return `${first} ${settled ? `You kept it on ${settled}.` : 'You kept it.'}`
  if (s.state === 'not_done') return `${first} ${settled ? `It was marked as not done on ${settled}.` : 'It was marked as not done.'}`
  return `${first} ${s.when ? `It is still open, and you said you would do it ${s.when}.` : 'It is still open.'}`
}

export function YourCommitments({ b }: { b: YourBoard }) {
  const said = b.saidYoudDo ?? []
  return (
    <Section heading="What you said you’d do" note="From every check-in">
      {b.keptLately?.says && <p className="gwui-panel-text">{b.keptLately.says}</p>}
      {said.length === 0 ? (
        <Empty>You have not said you would do anything in a check-in yet. When you do, it is listed here with what became of it.</Empty>
      ) : (
        <TenAPage items={said} label="what you said you’d do">
          {shown => (
            <RowList label="What you said you’d do">
              {shown.map(s => (
                <Row key={s.id} columns="minmax(0, 1fr) auto">
                  <div>
                    <b>{s.text}</b>
                    <p className="gwui-panel-text">{whatBecameOfIt(s)}</p>
                  </div>
                  <span><Tag tone={s.state === 'kept' ? 'proven' : s.state === 'not_done' ? 'concern' : 'plain'}>{s.stateSays}</Tag></span>
                </Row>
              ))}
            </RowList>
          )}
        </TenAPage>
      )}
    </Section>
  )
}
