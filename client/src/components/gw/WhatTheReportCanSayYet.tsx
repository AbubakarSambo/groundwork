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
  /**
   * NULL WHEN THE EXACT COUNT ISN'T KNOWN (U.8 fifth review, second pass). A check-in that hides
   * peers from each other cannot tell a hidden participant its own true size once the round's
   * report has released - that read is what supplied this number, and it stops being computed at
   * exactly that point. Null here means "more than one party, but not how many" - never a guessed
   * or fabricated total. See `GroundParticipantPage.tsx`'s `coverage.parties`.
   */
  parties: number | null
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
  /** How many files, photos and pins the reader has attached to this check-in (WhatsApp ones included). */
  filesAttached?: number | null
  /** Finished rounds, for whether there is anything to compare over time. */
  roundsFinished: number
}

interface Row {
  can: boolean
  says: string
  because?: string
  /**
   * THE BAR'S OWN NAME, BECAUSE A NUMBER UNDER IT WAS A LIE ABOUT WHAT THE ROW IS.
   *
   * These five bars were numbered 1 to 5, which reads as a sequence somebody is working through -
   * so "3 of 5" above bars filled at 1, 2 and 5 looked like a meter that had skipped two steps and
   * drawn the last one anyway. Reported as exactly that: the screen is not accurate.
   *
   * Nothing was wrong with the data. The bars are five DIFFERENT things a full report says, in no
   * order, and any three of them can be the three that are true. The numbers were the only thing
   * claiming otherwise, and the names were where nobody could read them - in a hover title and in
   * one run-on sentence underneath restating all five.
   */
  short: string
}

/**
 * The rows, in the order somebody would ask them: what is mine, what is ours, what holds up, what is
 * backed, what has changed.
 */
/**
 * `headline` IS STILL RETURNED AND NOTHING RENDERS IT.
 *
 * It read "It can say what you said. It cannot compare anything until one more person answers" -
 * the bars restated in prose, immediately under the bars. Kept on the return because its specs are
 * the readable statement of what each state means, and because a caller that wants one sentence
 * rather than a row of bars is a real thing to want. Nothing on this page wants it.
 */
export function whatItCanSay(f: CoverageFacts): { rows: Row[]; headline: string } {
  const partiesKnown = f.parties !== null
  const others = partiesKnown ? Math.max(0, f.parties! - 1) : null
  const outstanding = partiesKnown ? Math.max(0, f.parties! - f.answered) : null
  /* A count, never a name. "One more person" is the same fact and points at nobody. */
  const stillToAnswer = outstanding === 1 ? 'one more person' : outstanding !== null ? `${outstanding} more people` : 'more people'
  /*
   * WHEN THE EXACT COUNT ISN'T KNOWN, SAY SOMETHING TRUE INSTEAD OF A GUESSED TOTAL (U.8 fifth
   * review, second pass). `parties` is null only once `GroundParticipantPage` cannot learn the true
   * count - a check-in that hides peers from each other, once its report has released. A report only
   * ever releases once every expected party has answered (the check-in tab's own rule: "The report
   * generates once all parties have checked in"), so on exactly this path more than one person HAS
   * answered. Saying that plainly is true; a fabricated "X of 2 have answered" was not, the moment a
   * real team had three or more people in it.
   */
  const haveAnswered = partiesKnown
    ? `${f.answered} of ${f.parties} have answered`
    : 'The team’s report is already out.'

  const rows: Row[] = [
    {
      can: f.iHaveCheckedIn,
      short: 'what you said',
      says: 'What you said happened',
      because: 'Not until you have checked in',
    },
    {
      can: partiesKnown ? (others! > 0 && f.answered > 1) : true,
      short: 'differences',
      says: others === 1 ? 'Where the two of you see it differently' : 'Where people see it differently',
      because: others === 0
        ? 'Nobody else is on this check-in yet'
        : haveAnswered,
    },
    {
      can: (f.corroborated?.checked ?? 0) > 0,
      short: 'what lines up',
      says: 'Which parts line up with what someone else said',
      because: f.corroborated?.total
        ? `${f.corroborated.checked} of ${f.corroborated.total} so far`
        : 'Needs a second answer to line yours up against',
    },
    {
      can: (f.documentBackedPct ?? 0) > 0,
      short: 'backed up',
      says: 'Which parts have a document behind them',
      /* Night quality run 1: Amina sent a photo and a pin on WhatsApp and read "Nothing attached yet". Said truly now. */
      because: (f.filesAttached ?? 0) > 0
        ? `You have attached ${f.filesAttached === 1 ? 'one file' : `${f.filesAttached} files`}, but nothing you said is linked to ${f.filesAttached === 1 ? 'it' : 'one'} yet`
        : 'Nothing attached yet',
    },
    {
      can: f.roundsFinished >= 2,
      short: "what's changed",
      says: 'How this has changed since last time',
      because: 'Needs a second check-in',
    },
  ]

  const canCount = rows.filter(r => r.can).length
  const headline = !f.iHaveCheckedIn
    ? 'Nothing yet. It starts with your first check-in.'
    : canCount === rows.length
      ? 'Everything a report needs is here.'
      : f.answered <= 1 && others !== null && others > 0
        ? `It can say what you said. It cannot compare anything until ${stillToAnswer} answers.`
        : `It can say ${canCount} of the ${rows.length} things a full report says.`

  return { rows, headline }
}

export function WhatTheReportCanSayYet({ facts }: { facts: CoverageFacts }) {
  const { rows } = whatItCanSay(facts)
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
        {/* REVIEW ROUND 3, ITEM 5: NOT SHOUTED IN CAPITALS. */}
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-text)' }}>
          How much the report has to go on
        </div>
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {have} of {rows.length}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
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
            {/*
              RE-REVIEW: A CAPTION, NOT A CLIPPED FRAGMENT. `r.short` is still the field the tests
              (and the code above) key rows by - "differences", "what lines up" - but a lower-case
              fragment with no punctuation is exactly what plain-wording rejects. Capitalised here,
              on render only, so it reads as a short caption under its bar rather than a piece of a
              sentence that got cut off.
            */}
            <div style={{ fontSize: 9, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: '11px' }}>
              {r.short.charAt(0).toUpperCase() + r.short.slice(1)}
            </div>
            {/*
              GROUP 3'S REVIEW, BATCH A FAULT 6: "HOVER ONE TO SEE WHAT IT IS WAITING FOR" ASKED FOR
              AN INTERACTION A PHONE DOES NOT HAVE. The reason a dashed bar cannot say yet now reads
              on the page itself, under its own label, for everyone - not only somebody with a mouse.
              `title` stays too, so a reader with a pointer still sees it on hover, but the words no
              longer depend on it.
            */}
            {!r.can && r.because && (
              <div style={{ fontSize: 9, color: 'var(--gw-muted)', textAlign: 'center', lineHeight: '11px' }}>
                {r.because}
              </div>
            )}
          </div>
        ))}
      </div>

      {/*
        AND THE SENTENCE LISTING ALL FIVE HAS GONE WITH THE NUMBERS.

        It existed to tell somebody which bar was which, because the bars were numbered. Each bar
        says its own name now, so the sentence was the fifth telling of the same five things. What
        is left is the one fact the labels cannot carry: a dashed bar is a thing the report cannot
        say yet, not a thing it failed at.
      */}
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 8, lineHeight: 1.5 }}>
        Dashed ones it cannot say yet. What each one is waiting for is written under it.
      </div>
    </div>
  )
}
