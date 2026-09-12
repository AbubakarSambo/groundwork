import { Pill } from './kit'

/**
 * THE ONE READ A MANAGER OPENS THE BOARD FOR.
 *
 * "I need to know where each person is and what to do with them." The board answers how the TEAM is
 * doing - what is agreed, where people differ, what is in the way - which is right for four people
 * on one thing and wrong for ten people each carrying their own number.
 *
 * SO THE ORDER IS THE PRODUCT. A manager reads down until it stops mattering and then stops. Top of
 * the list is not the worst person, it is the week with the most in it; somebody quietly hitting
 * their number is last precisely because there is nothing to do about them. Nothing here scores
 * anybody and it never sorts on attainment, which would make it a performance ranking published to
 * a manager - a different product, and not this one.
 *
 * AND EVERY ROW HANDS OVER A THING TO ASK FOR, not a verdict. "Musa is blocked" is a status anybody
 * could read off the board. What a manager can act on is how long something has sat against what
 * has actually been tried, and one move to put to them.
 */
export type Reason = 'has not answered' | 'stuck and not chasing' | 'behind the pace' | 'nothing checkable' | 'nothing to do'

export interface Row {
  participantId: string
  who: string
  target: number | null
  count: number
  reason: Reason
  ask: string | null
}

/** What the word means, said once here rather than left for the reader to infer from a colour. */
const MEANS: Record<Reason, string> = {
  'has not answered': 'has not checked in for the round that is open',
  'stuck and not chasing': 'something has sat a fortnight or more and has only been asked about',
  'behind the pace': 'further behind their number than the rounds gone would suggest',
  'nothing checkable': 'nothing said this round can be checked against a date, a number or a document',
  'nothing to do': 'nothing here needs you this week',
}

const TONE: Record<Reason, 'bad' | 'warn' | 'info' | 'flat'> = {
  'has not answered': 'bad',
  'stuck and not chasing': 'bad',
  'behind the pace': 'warn',
  'nothing checkable': 'warn',
  'nothing to do': 'flat',
}

export function WhereEachPersonIs({ rows }: { rows: Row[] }) {
  if (!rows.length) return null
  return (
    <div style={{ background: 'var(--gw-card)', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '2px 16px' }}>
      {rows.map((r, i) => (
        <div key={r.participantId} style={{ padding: '13px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gw-dark)' }}>{r.who}</span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
              {/* The number, where they have one. A person with no target of their own still has a
                  row: what to do about them does not depend on somebody having set them a figure. */}
              {r.target != null && (
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.count} of {r.target}
                </span>
              )}
              <Pill tone={TONE[r.reason]}>{r.reason}</Pill>
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 3, lineHeight: 1.5 }}>{MEANS[r.reason]}</div>
          {/* The whole point of the row. Absent where there is nothing to ask for, rather than
              padded with something to say. */}
          {r.ask && (
            <div style={{ fontSize: 13.5, color: 'var(--gw-text)', marginTop: 7, lineHeight: 1.55 }}>{r.ask}</div>
          )}
        </div>
      ))}
    </div>
  )
}
