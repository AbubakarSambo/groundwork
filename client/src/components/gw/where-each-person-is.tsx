import { ShowAFew } from './a-long-list-is-not-a-page'
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
  /** True where `who` is their role standing in for a name nobody has given. */
  nameIsTheirRole?: boolean
  target: number | null
  count: number
  reason: Reason
  /** What happened and what would change it, a full sentence from the server. Shown under the pill in place of a fixed phrase. */
  says: string
  ask: string | null
  /** The product's finding for this person, written from the record. See the-finding-per-person on the API. */
  finding?: string | null
  hasGap?: boolean
}

/** The pill's label for each reason, sentence case throughout - not just "Nothing checkable". */
const LABEL: Record<Reason, string> = {
  'has not answered': 'Has not answered',
  'stuck and not chasing': 'Stuck and not chasing',
  'behind the pace': 'Behind the pace',
  'nothing checkable': 'Nothing checkable',
  'nothing to do': 'Nothing to do',
}

const TONE: Record<Reason, 'bad' | 'warn' | 'info' | 'flat'> = {
  'has not answered': 'bad',
  'stuck and not chasing': 'bad',
  'behind the pace': 'warn',
  'nothing checkable': 'warn',
  'nothing to do': 'flat',
}

export type Square = { key: number; state: 'done' | 'empty' | 'upcoming' }

/**
 * U.10: "THE TEAM TODAY", THE PROTOTYPE'S WHITE TABLE (board-as-lead.jpg).
 *
 * Name, a one-line summary, a reason pill, then ten small navy squares for the last ten
 * check-ins. The prototype's rightmost column - "what keeps coming up" - is left out here: it
 * needs pattern detection, which is off while patterns are off (see `shown.patterns` on the
 * board), so nothing is faked in its place.
 *
 * PICTURE-CHECK ROUND 6, ITEM C: ONE COMPACT ROW, NOT A STACKED CARD. The first pass drew each
 * person as a tall card (name, pill, says, squares, ask, a quoted finding, each on its own line) -
 * the prototype draws one table row: name | summary | pill | squares. `ask` and `finding` are not
 * in the prototype's table at all, so rather than drop them (the whole point of a row - the one
 * thing a lead can act on) they sit as a single quiet second line under the summary, smaller and
 * greyer than `says`, instead of each getting a card-sized block of their own.
 */
export function WhereEachPersonIs({ rows, squaresFor }: { rows: Row[]; squaresFor?: (participantId: string) => Square[] }) {
  if (!rows.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '2px 16px' }}>
      {/*
        A HUNDRED OF THESE IS NOT A GLANCE. The rows are ordered by what needs the lead first, so
        the few at the top are the ones this section exists for - and on a check-in run across a
        network the rest is a hundred identical lines saying somebody has not answered yet. See
        a-long-list-is-not-a-page.
      */}
      <ShowAFew rows={rows} few={10} what="people">
      {(r: Row, i: number) => (
        <div key={r.participantId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--gw-border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-dark)' }}>
                {r.who}
                {/*
                  Nobody has given a name, so this is their role. Said plainly, because on a list of
                  people a role reads as a name. "A colleague · no name given" joined a role and a
                  fact with a middle dot; now it is one clause read straight through.
                */}
                {r.nameIsTheirRole && (
                  <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--gw-sub)' }}>, who has not given a name</span>
                )}
              </span>
              {/* The number, where they have one. A person with no target of their own still has a
                  row: what to do about them does not depend on somebody having set them a figure. */}
              {r.target != null && (
                <span style={{ fontSize: 12.5, color: 'var(--gw-sub)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.count} of {r.target}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginTop: 2, lineHeight: 1.5 }}>{r.says}</div>
            {/* `ask` and `finding`, kept as one quiet line rather than dropped - not in the
                prototype's table, but the whole point of a row for a lead who can act on it. */}
            {(r.ask || r.finding) && (
              <div style={{ fontSize: 12, color: r.hasGap ? 'var(--gw-amber-t)' : 'var(--gw-muted)', marginTop: 4, lineHeight: 1.5 }}>
                {[r.ask, r.finding].filter(Boolean).join(' ')}
              </div>
            )}
          </div>
          <div style={{ flexShrink: 0 }}>
            <Pill tone={TONE[r.reason]}>{LABEL[r.reason]}</Pill>
          </div>
          {/* The last-10 squares, the same mark and the same data "Who checked in" draws, in their
              own fixed-width column so they line up across every row. */}
          {squaresFor && (
            <div style={{ display: 'flex', gap: 5, width: 170, justifyContent: 'flex-end', flexShrink: 0 }}>
              {squaresFor(r.participantId).map((sq) => (
                <span
                  key={sq.key}
                  aria-label={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                  title={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                  style={{
                    display: 'inline-block', width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                    background: sq.state === 'done' ? 'var(--gw-navy)' : 'transparent',
                    border: sq.state === 'empty' ? '1.5px solid var(--gw-border)' : 'none',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </ShowAFew>
    </div>
  )
}
