import { Section, Tag, Table, Button, Dot } from '@/components/gw/ui'
import { THE_LEGEND, CORRECT_IT_HERE } from './TheBar'
import './pictured-board.css'
import { theShapeOfTheRecords } from './the-shape-of-a-list'

type Any = any
const firstName = (n: unknown) => String(n ?? '').trim().split(/\s+/)[0] ?? ''
const NOT_SAID = 'Not said yet'

/**
 * EVERY TRADER, AND WHAT SHOWS IT (loans.txt), one open table, one row for each loan on record. The figures are the ones the
 * person gave in their own check-in (`fields` on the record: Business, Place, Sales, Repayment, In the way, Next step); a figure
 * nobody has said reads "Not said yet". A filled dot is only drawn where a document backs the line the record came from
 * (`mark` is "proven"); every other row is ringed, which the key above the table says is their word.
 */
export function EveryTraderAndWhatShowsIt({ section, groundId, me }: { section: Any; groundId: string; me: string | null }) {
  const rows: Any[] = (section.rows ?? []).filter((r: Any) => r.kind !== 'county')
  if (!rows.length) return null
  const said = (r: Any, label: string): string => String(r.fields?.[label] ?? '').trim()
  const dot = (r: Any) => <Dot filled={r.mark === 'proven'} />
  return (
    <Section heading="Every trader, and what shows it" note={THE_LEGEND} foot={CORRECT_IT_HERE}>
      <Table
        caption="Each loan, with the trader and the figures they gave in their check-in"
        phone="stack"
        what="loans"
        summary={theShapeOfTheRecords(rows, 'loans')}
        minWidth={860}
        columns={[
          { key: 'trader', header: 'Trader', rowHeader: true },
          { key: 'business', header: 'Business' },
          { key: 'sales', header: 'Sales, 4 weeks' },
          { key: 'repayment', header: 'Repayment' },
          { key: 'way', header: 'What’s in the way, in their words' },
          { key: 'next', header: 'Next' },
        ]}
        rows={rows.map((r) => {
          const repayment = said(r, 'Repayment') || r.stage || ''
          return {
            trader: <><b>{me && r.ownerParticipantId === me ? 'You' : r.owner ? firstName(r.owner) : 'Nobody yet'}</b>{said(r, 'Place') && <div className="pb-sub">{said(r, 'Place')}</div>}</>,
            /* One dot for the row, at the start of its business, as the picture draws it: filled where a document backs the line it came from, ringed where it is the trader's word. */
            business: <>{dot(r)}{said(r, 'Business') || r.name || NOT_SAID}</>,
            sales: said(r, 'Sales') || NOT_SAID,
            repayment: repayment ? <Tag tone={r.mark === 'proven' ? 'proven' : 'plain'}>{repayment}</Tag> : NOT_SAID,
            way: said(r, 'In the way') || NOT_SAID,
            next: r.nextStep ?? r.next ?? (said(r, 'Next step') || NOT_SAID),
          }
        })}
      />
      <div style={{ textAlign: 'center' }}><Button kind="quiet" to={`/grounds/${groundId}`}>Not right? Tell the check-in</Button></div>
    </Section>
  )
}
