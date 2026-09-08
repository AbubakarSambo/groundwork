/**
 * SPECIFICITY, SHOWN AS THE FIVE THINGS IT IS ACTUALLY MADE OF.
 *
 * "I need specificity to show somehow." It was showing as a bar and a word - "moderate" - which is a
 * mark out of a scale nobody can see, and `specificity-belongs-to-the-person.spec.ts` had already
 * removed the previous version of exactly that for being "a verdict on a person's writing, handed to
 * them with nothing to do about it".
 *
 * The engine has never graded a person in the first place. It reads five separate things off a
 * session and stores them per check-in as `specificityDimensions` - delivery, evidence, enablement,
 * coverage, commitment - and no screen has ever shown them. So the honest read was already there,
 * itemised, and the product was averaging it into one word and printing the word.
 *
 * FOUR LEVELS COLLAPSE TO TWO. The stored values are specific / directional / vague / managed.
 * Nobody needs four grades of their own honesty; they need to know which one to fix. So it is met or
 * not, and the "not" says what is missing rather than how badly.
 *
 * THE FIELD NAMES ARE NOT THE LABELS. "enablement" and "coverage" are the engine's words for its own
 * dimensions. What a person recognises is what they did or did not say, in the second person, which
 * is what the left column is.
 */

export type Level = 'specific' | 'directional' | 'vague' | 'managed' | string

/** met when the engine could find it; the level of not-met is not a person's problem to grade. */
export function wasItThere(level: Level | undefined): boolean {
  return level === 'specific' || level === 'directional'
}

/**
 * SAID AS SOMETHING TO DO, NOT AS A FINDING ABOUT WHAT WAS ABSENT.
 *
 * The first version read: "Mostly the situation, not your part in it. No dates, numbers or
 * documents yet. Nothing on record about what you were waiting on." Read back: "I have no idea what
 * this means, you speak english like a robot."
 *
 * Fair. Every line was a negative sentence with no verb a person could act on, written from the
 * engine's side of the screen - a list of what it failed to find rather than a list of what to say
 * next time. And a row of five of them reads as five accusations.
 *
 * So each is a plain instruction when it is missing, and the same thing in the past tense when it
 * is there. Same five facts, in words somebody would actually use.
 */
const THE_FIVE: { key: string; met: string; missing: string }[] = [
  {
    key: 'delivery',
    met: 'You said what you did',
    missing: 'Say what you did, not just what was going on around you',
  },
  {
    key: 'evidence',
    met: 'You gave a date, a number or a document',
    missing: 'Add a date, a number or a document',
  },
  {
    key: 'enablement',
    met: 'You said what you needed from other people',
    missing: 'Say what you were waiting on from someone else',
  },
  {
    key: 'coverage',
    met: 'You talked about the hard parts too',
    missing: 'Say what went badly, not only what went well',
  },
  {
    key: 'commitment',
    met: 'You said what happens next, who does it and when',
    missing: 'Say what happens next, who does it and by when',
  },
]

export function TheFiveThingsThatMakeItCheckable({
  dimensions,
  sessionNumber,
  whatWouldHelp,
  strongest,
}: {
  /** From the latest finished session. Absent until one has been analysed. */
  dimensions?: Record<string, string> | null
  sessionNumber?: number | null
  /** The one thing the engine could not find across recent answers. */
  whatWouldHelp?: string | null
  /** Their own best answer, quoted back. */
  strongest?: string | null
}) {
  if (!dimensions || Object.keys(dimensions).length === 0) return null

  const rows = THE_FIVE.map(d => ({ ...d, there: wasItThere(dimensions[d.key]) }))
  const shortBy = rows.filter(r => !r.there).length

  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '15px 17px' }}>
      {/*
        THE HEADING NAMES THE SESSION, because nobody knew this was about one.
        "What was in what you said" over a list of absences, with the session number buried in a
        sub-line, left a person reading a permanent judgement instead of a note about session 1.
      */}
      <div style={{ fontSize: 10.5, letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--gw-muted)', marginBottom: 3 }}>
        What would make your next check-in count for more
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 11 }}>
        {/*
          "ACCOUNT" IS THE ROBOT WORD, and it was still in here after being banned once. It means
          somebody's account of what happened; in an app it reads as a login, and nobody stops to
          work out which. So the sentence says the thing instead of naming it.
        */}
        {sessionNumber ? `Session ${sessionNumber} was mostly about the situation around you. ` : ''}
        Five things make it easy for someone else to check what happened. Add one or two next time.
      </div>

      <div style={{ display: 'grid', gap: 7 }}>
        {rows.map(r => (
          <div key={r.key} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <span
              aria-hidden
              style={{
                flex: '0 0 auto', marginTop: 1, width: 15, height: 15, borderRadius: '50%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800,
                background: r.there ? 'var(--gw-green-bg)' : 'var(--gw-paper-2)',
                color: r.there ? 'var(--gw-green-t)' : 'var(--gw-muted)',
                border: '1px solid ' + (r.there ? 'var(--gw-green-b)' : 'var(--gw-border)'),
              }}
            >
              {r.there ? '✓' : ''}
            </span>
            <span style={{
              fontSize: 12.5, lineHeight: 1.5,
              color: r.there ? 'var(--gw-text)' : 'var(--gw-sub)',
            }}>
              {r.there ? r.met : r.missing}
            </span>
          </div>
        ))}
      </div>

      {shortBy > 0 && (
        /* A next action rather than a total. The count is only here to make the sentence true. */
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--gw-border)' }}>
          {shortBy === 1
            ? 'One sentence next time covers it.'
            : 'You do not need all of them. One or two next time makes a difference.'}
        </div>
      )}

      {/* Nobody can act on a word like "low"; everybody can act on "none of your answers say when". */}
      {/* THE ONE THAT WOULD MOVE THEM MOST, marked as such. Five equal suggestions is a list to
          skim; one named as the most useful is a thing to do. */}
      {whatWouldHelp && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 9 }}>
          <span style={{ fontWeight: 700, color: 'var(--gw-text)' }}>Most useful for you. </span>
          {whatWouldHelp}
        </div>
      )}

      {/* Their own best answer. What a checkable account looked like in their own words teaches what
          no description of specificity can. */}
      {strongest && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 9 }}>
          <span style={{ fontWeight: 700, color: 'var(--gw-text)' }}>This one of yours was easy to check. </span>
          <span style={{ fontStyle: 'italic' }}>"{strongest}"</span>
        </div>
      )}
    </div>
  )
}
