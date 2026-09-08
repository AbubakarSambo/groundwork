/**
 * THE SECOND AXIS. THE PAGE ONLY EVER HAD THE FIRST.
 *
 * Her diagnosis: "the page says the same thing three times... three cards, three vocabularies, one
 * verdict." All three were reads of the PERSON - how specific their answers were - in different
 * words. Nothing anywhere said what the shared report can and cannot say yet, or how far off a
 * complete one is.
 *
 * That is the difference between a page about a record forming over time and a grading sheet. It
 * also usually carries the real reason the picture is thin, and the reason is usually not the
 * person reading it: one of the other parties has not answered.
 *
 * NOTHING NEW IS COMPUTED. Every row reads a field the report and the ground payload already carry -
 * how many people have answered this round, how many claims another account could corroborate, how
 * much has a document behind it, how many rounds are finished.
 *
 * NAMES FALL BACK. Naming who has not answered is the useful form and this page is private to its
 * reader - but peers are hidden on some check-ins, and a page being private does not make somebody
 * else's name the reader's to know. Where they are hidden it says "one person".
 */

export interface CoverageFacts {
  /** Has this reader finished a session. */
  iHaveCheckedIn: boolean
  /** How many of the people on this round have answered, and how many there are. */
  answered: number
  parties: number
  /** Who has not, by the name this reader may use. Empty where peers are hidden. */
  waitingOn: string[]
  /** Claims another account could be lined up against, out of the claims made. */
  corroborated?: { checked: number; total: number } | null
  /** How much of the record has a document behind it. */
  documentBackedPct?: number | null
  /** Finished rounds, for whether there is anything to compare over time. */
  roundsFinished: number
}

interface Row { can: boolean; says: string; because?: string }

/**
 * The rows, in the order somebody would ask them: what is mine, what is ours, what holds up, what is
 * backed, what has changed.
 */
export function whatItCanSay(f: CoverageFacts): { rows: Row[]; headline: string } {
  const others = Math.max(0, f.parties - 1)
  const whoIsMissing = f.waitingOn.length
    ? f.waitingOn.join(' and ')
    : f.parties - f.answered === 1
      ? 'one person'
      : `${f.parties - f.answered} people`
  const missingVerb = f.waitingOn.length === 1 || f.parties - f.answered === 1 ? 'has not answered yet' : 'have not answered yet'

  const rows: Row[] = [
    {
      can: f.iHaveCheckedIn,
      says: 'What you said happened',
      because: 'Not until you have checked in',
    },
    {
      can: others > 0 && f.answered > 1,
      says: others === 1 ? 'Where the two of you see it differently' : 'Where people see it differently',
      because: others === 0
        ? 'Nobody else is on this check-in yet'
        : `${whoIsMissing} ${missingVerb}`,
    },
    {
      can: (f.corroborated?.checked ?? 0) > 0,
      /* "account" is banned in copy - it reads as a login. Say the thing instead. */
      says: 'Which parts line up with what someone else said',
      because: f.corroborated?.total
        ? `${f.corroborated.checked} of ${f.corroborated.total} so far`
        : 'Needs someone else to have answered',
    },
    {
      can: (f.documentBackedPct ?? 0) > 0,
      says: 'Which parts have a document behind them',
      because: 'Nothing attached yet',
    },
    {
      can: f.roundsFinished >= 2,
      says: 'How this has changed since last time',
      because: 'Needs a second round',
    },
  ]

  /* The one line somebody reads if they read nothing else, and it names the real blocker rather than
     the reader. */
  const canCount = rows.filter(r => r.can).length
  const headline = !f.iHaveCheckedIn
    ? 'Nothing yet. It starts with your first check-in.'
    : canCount === rows.length
      ? 'Everything a report needs is here.'
      : f.answered <= 1 && others > 0
        ? `It can say what you said. It cannot compare anything yet, because ${whoIsMissing} ${missingVerb}.`
        : `It can say ${canCount} of the ${rows.length} things a full report says.`

  return { rows, headline }
}

export function WhatTheReportCanSayYet({ facts }: { facts: CoverageFacts }) {
  const { rows, headline } = whatItCanSay(facts)
  const have = rows.filter(r => r.can).length

  return (
    <section>
      {/*
        A METER, NOT A CHECKLIST.

        This shipped as five rows with an empty circle each - the same object, twenty pixels above a
        card that is also five rows with an empty circle each. Nothing told the eye that one is the
        state of the report and the other is advice to the person, and an empty circle in a product
        means a checkbox somebody has not ticked, so both read as things they had failed to do. Two
        of them counted different subjects with the same glyph.

        So the circles belong to exactly one card on this page, and it is the one where a person can
        actually do something. This is a filled bar and a count. Nothing here is anybody's to tick:
        it fills as people check in.
      */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)' }}>
          What the report can say so far
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {have} of {rows.length}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 3, marginBottom: 9 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            title={r.can ? r.says : `${r.says} - ${r.because ?? 'not yet'}`}
            style={{
              flex: 1, height: 6, borderRadius: 3,
              background: r.can ? 'var(--gw-navy)' : 'var(--gw-border)',
            }}
          />
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55, marginBottom: 9 }}>{headline}</div>

      {/* Labels under the meter, in its order, so a segment can be read rather than only counted. */}
      <div style={{ display: 'grid', gap: 4 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 12, lineHeight: 1.5, color: r.can ? 'var(--gw-text)' : 'var(--gw-muted)' }}>
            {r.says}
            {!r.can && r.because && <span> — {r.because}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}
