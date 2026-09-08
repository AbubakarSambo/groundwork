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
 * AND IT NAMES NOBODY, WHICH IS A REVERSAL.
 *
 * It said "It cannot compare anything yet, because Ada Nwosu has not answered yet." Read back:
 * "this area is literally about how much context it has from the chats yet you name Ada?"
 *
 * Right, and the fault is not privacy - the reader may well be entitled to that name, and the page
 * is their own. It is that naming somebody turns a meter about the report into a remark about a
 * colleague. Every other row here counts what the check-in has to work with; that one row pointed
 * at a person and said the shortfall was theirs. On a page that refuses to give verdicts about the
 * reader, it was giving one about somebody who is not even reading it.
 *
 * So the rows count. One of two people has answered; two rounds are needed and one has happened;
 * nothing is attached yet. Who has not answered is a fact about the check-in and it has a home -
 * the roster on the check-in tab, and the report's own waiting-on line - where it is a prompt to go
 * and ask somebody rather than a reason printed against a meter.
 */

export interface CoverageFacts {
  /** Has this reader finished a session. */
  iHaveCheckedIn: boolean
  /** How many of the people on this round have answered, and how many there are. */
  answered: number
  parties: number
  /**
   * KEPT ON THE SHAPE AND DELIBERATELY UNUSED BY THE COPY.
   *
   * Both callers still compute it, and it stays declared so the next person to want a name here
   * finds this note rather than the field's absence. Nothing in this component prints it. See the
   * header: the objection was not that the name was secret, it was that a meter about the report
   * should not point at a person.
   */
  waitingOn?: string[]
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
  const outstanding = Math.max(0, f.parties - f.answered)
  /* A count, never a name. "One more person" is the same fact and points at nobody. */
  const stillToAnswer = outstanding === 1 ? 'one more person' : `${outstanding} more people`
  const haveAnswered = `${f.answered} of ${f.parties} have answered`

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
        : haveAnswered,
    },
    {
      can: (f.corroborated?.checked ?? 0) > 0,
      says: 'Which parts line up with what someone else said',
      because: f.corroborated?.total
        ? `${f.corroborated.checked} of ${f.corroborated.total} so far`
        : 'Needs a second answer to line yours up against',
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

  const canCount = rows.filter(r => r.can).length
  const headline = !f.iHaveCheckedIn
    ? 'Nothing yet. It starts with your first check-in.'
    : canCount === rows.length
      ? 'Everything a report needs is here.'
      : f.answered <= 1 && others > 0
        ? `It can say what you said. It cannot compare anything until ${stillToAnswer} answers.`
        : `It can say ${canCount} of the ${rows.length} things a full report says.`

  return { rows, headline }
}

export function WhatTheReportCanSayYet({ facts }: { facts: CoverageFacts }) {
  const { rows, headline } = whatItCanSay(facts)
  const have = rows.filter(r => r.can).length

  return (
    <div style={{ marginTop: 13, paddingTop: 11, borderTop: '1px solid var(--gw-border)' }}>
      {/*
        THE SAME BARS AS THE ROW ABOVE IT.

        This was a thin segmented meter while the session row above was a set of filling boxes - two
        bar languages in one card, for two things a person is meant to read together. Same boxes,
        same height, filled or not, labelled underneath. The difference between the rows is what the
        labels say, which is the only difference there should be.
      */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)' }}>
          What the report can say so far
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {have} of {rows.length}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 34 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div
              title={r.can ? r.says : `${r.says} - ${r.because ?? 'not yet'}`}
              style={{
                width: '100%', height: 22, borderRadius: 3, position: 'relative', overflow: 'hidden',
                background: r.can ? 'var(--gw-paper-2)' : 'transparent',
                border: r.can ? 'none' : '1px dashed var(--gw-border)',
              }}
            >
              {r.can && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--gw-navy)' }} />
              )}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--gw-muted)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</div>
          </div>
        ))}
      </div>

      {/* One sentence on what a filled bar is, then the state in one more. */}
      <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 7, lineHeight: 1.5 }}>
        Each bar is one thing a full report says: your account, where you differ, what lines up, what
        a document backs, and what has changed. Dashed ones it cannot say yet.
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55, marginTop: 6 }}>{headline}</div>
    </div>
  )
}
