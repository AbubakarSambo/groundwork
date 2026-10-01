import { ShowAFew } from './a-long-list-is-not-a-page'
import { PeopleTable, PersonRow, Tag, type TagTone, Note, Stack } from './ui'
import { initialsOf } from '@/pages/org/people-here'

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
export type Reason = 'has not answered' | 'stuck and not chasing' | 'behind the pace' | 'nothing checkable' | 'nothing to do' | 'not let in'

export interface Row {
  participantId: string
  who: string
  /** True where `who` is their role standing in for a name nobody has given. */
  nameIsTheirRole?: boolean
  target: number | null
  count: number
  /** What the number counts (the matching objective's own name, e.g. "shops in Westlands") - so
      the count reads as a sentence, not a bare "0 of 4" (re-review, 30 September). */
  targetName?: string | null
  reason: Reason
  /** What happened and what would change it, a full sentence from the server. Shown under the pill in place of a fixed phrase. */
  says: string
  ask: string | null
  /** The product's finding for this person, written from the record. See the-finding-per-person on the API. */
  finding?: string | null
  hasGap?: boolean
  /** What keeps coming up about this person's work, one plain sentence (board-as-lead.txt, "The team today"). */
  keepsComingUp?: string | null
  /**
   * RE-REVIEW, 30 SEPTEMBER: "Nothing to do" beside Amani while the same board tells the reader
   * "Amani Wekesa has been waiting 2 days on you for the price list." `reason` itself is the
   * engine's own classification (board.service.ts), not invented here - but the board already
   * knows, from its own "Waiting on" handoffs, when this person is waiting on the reader, and a
   * tag that contradicts a sentence three sections down is still wrong to show. Only overrides
   * the label when the engine's own reason is "nothing to do"; every other reason stands.
   */
  waitingOnReader?: boolean
  /**
   * REQUEST 85: AN ADMIN DID NOT LET THIS PERSON IN. `reason` is `'not let in'`, sorted last, `ask`
   * is always null, and `says` already carries the row's own sentence ("Faraji Odhiambo was not let
   * in by Juma Mwangi, so there is nobody to ask."). No chasing (there is nothing to ask) and no
   * label (this is not a judgement on the person) - the row draws its sentence alone.
   */
}

/** The tag's label for each reason, sentence case throughout - not just "Nothing checkable". `'not
    let in'` has no label: see the comment on `Row.reason` above - the row's own sentence is enough. */
const LABEL: Record<Reason, string> = {
  'has not answered': 'Has not answered',
  'stuck and not chasing': 'Stuck and not chasing',
  'behind the pace': 'Behind the pace',
  'nothing checkable': 'Nothing checkable',
  'nothing to do': 'Nothing to do',
  'not let in': '',
}

const TONE: Record<Reason, TagTone> = {
  'has not answered': 'concern',
  'stuck and not chasing': 'concern',
  'behind the pace': 'attention',
  'nothing checkable': 'attention',
  'nothing to do': 'plain',
  'not let in': 'plain',
}

export type Square = { key: number; state: 'done' | 'empty' | 'upcoming' }

/**
 * U.10 (c1): "THE TEAM TODAY", REBUILT FROM THE SHARED PARTS - a `PeopleTable` of `PersonRow`s
 * (components/gw/ui), replacing the hand-rolled white card and divider rows this drew before.
 *
 * Name, a one-line summary, a reason tag, then ten small navy squares for the last ten check-ins.
 * The prototype's rightmost column - "what keeps coming up" ("Same leads, 3 check-ins running") -
 * is `keepsComingUp`, one quiet line under the summary; it is left off a row with nothing to add,
 * and there is nothing there at all while patterns are off.
 *
 * PICTURE-CHECK ROUND 6, ITEM C: ONE COMPACT ROW, NOT A STACKED CARD. The first pass drew each
 * person as a tall card (name, pill, says, squares, ask, a quoted finding, each on its own line) -
 * the prototype draws one table row: name | summary | tag | squares. `ask` and `finding` are not
 * in the prototype's table at all, so rather than drop them (the whole point of a row - the one
 * thing a lead can act on) they sit as a single quiet second line under the summary, smaller and
 * greyer than `says`, instead of each getting a card-sized block of their own.
 */
export function WhereEachPersonIs({ rows, squaresFor }: { rows: Row[]; squaresFor?: (participantId: string) => Square[] }) {
  if (!rows.length) return null
  return (
    <PeopleTable>
      {/*
        A HUNDRED OF THESE IS NOT A GLANCE. The rows are ordered by what needs the lead first, so
        the few at the top are the ones this section exists for - and on a check-in run across a
        network the rest is a hundred identical lines saying somebody has not answered yet. See
        a-long-list-is-not-a-page.
      */}
      <ShowAFew rows={rows} few={10} what="people">
      {(r: Row) => (
        <PersonRow
          key={r.participantId}
          extraColumns="1fr auto 170px"
          person={{ initials: initialsOf(r.who), name: r.who, level: r.nameIsTheirRole ? 'Has not given a name' : undefined }}
        >
          <div style={{ minWidth: 0 }}>
            <Stack gap={2}>
              {/* The number, where they have one. A person with no target of their own still has a
                  row: what to do about them does not depend on somebody having set them a figure.
                  RE-REVIEW, 30 SEPTEMBER: a bare "0 of 4" read as a stray fragment - it is what the
                  number counts, said as a sentence, using the matching objective's own name where
                  the server sent one. */}
              {r.target != null && (
                <Note>
                  {r.who} has {r.count === 0 ? 'none' : r.count} of {r.count === 0 ? 'their' : 'the'} {r.target} {r.targetName ?? (r.target === 1 ? 'target' : 'targets')}{r.count === 0 ? ' yet' : ' so far'}.
                </Note>
              )}
              <Stack gap={4}>
                <div className="gwui-fs-15 gwui-ink-sub">{r.says}</div>
                {/* `ask` and `finding`, kept as one quiet line rather than dropped - not in the
                    prototype's table, but the whole point of a row for a lead who can act on it. */}
                {(r.ask || r.finding) && (
                  <Note tone={r.hasGap ? 'amber' : 'muted'}>
                    {[r.ask, r.finding].filter(Boolean).join(' ')}
                  </Note>
                )}
                {r.keepsComingUp && <Note tone="muted">{r.keepsComingUp}</Note>}
              </Stack>
            </Stack>
          </div>
          {r.reason === 'not let in'
            ? <span />
            : r.reason === 'nothing to do' && r.waitingOnReader
              ? <Tag tone="attention">Waiting on you</Tag>
              : <Tag tone={TONE[r.reason]}>{LABEL[r.reason]}</Tag>}
          {/* The last-10 squares, the same mark and the same data "Who checked in" draws, in their
              own fixed-width column so they line up across every row. */}
          {squaresFor ? (
            <div className="gwui-gap-5" style={{ display: 'flex', width: 170, justifyContent: 'flex-end', flexShrink: 0 }}>
              {squaresFor(r.participantId).map((sq) => (
                <span
                  key={sq.key}
                  aria-label={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                  title={sq.state === 'upcoming' ? 'Not open yet' : sq.state === 'done' ? 'Checked in' : 'Missed'}
                  className={sq.state === 'empty' ? 'gwui-rule-square' : undefined}
                  style={{
                    display: 'inline-block', width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                    background: sq.state === 'done' ? 'var(--gw-navy)' : 'transparent',
                  }}
                />
              ))}
            </div>
          ) : <span />}
        </PersonRow>
      )}
      </ShowAFew>
    </PeopleTable>
  )
}
