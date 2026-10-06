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
/**
 * HER WORDS, NOT A PARAPHRASE OF THEM.
 *
 * She wrote the copy for this card out in full. I shipped a version of it with "Say" and "Add"
 * bolted onto the front of every line, which turns a list of things to include into five
 * instructions - the scolding tone she had just asked me to remove, in a different grammar.
 *
 * Noun phrases read as a list of what to bring. Verbs read as a list of what you failed to do.
 *
 * The past-tense forms are mine, because she only wrote the missing case; they are the same five
 * facts said as things that were there.
 */
export const THE_FIVE: { key: string; met: string; missing: string }[] = [
  {
    key: 'delivery',
    met: 'What you did, not just what was happening',
    missing: 'What you did, not just what was happening',
  },
  {
    key: 'evidence',
    met: 'One date, number or document',
    missing: 'One date, number or document',
  },
  {
    key: 'enablement',
    met: 'What you were waiting on, and from whom',
    missing: 'What you were waiting on, and from whom',
  },
  {
    key: 'coverage',
    met: 'What went badly, not only what went well',
    missing: 'What went badly, not only what went well',
  },
  {
    key: 'commitment',
    met: 'What happens next, who does it, by when',
    missing: 'What happens next, who does it, by when',
  },
]

export function TheFiveThingsThatMakeItCheckable({
  dimensions,
  sessionNumber,
  mostUseful,
  strongest,
}: {
  /** From the latest finished session. Absent until one has been analysed. */
  dimensions?: Record<string, string> | null
  sessionNumber?: number | null
  /**
   * WHICH OF THE FIVE WOULD MOVE THEM MOST, and how to say it.
   *
   * "the five, phrased as additions, with the one that would move you most marked." Marked in the
   * list, which needs the list to know which one - so the server names the dimension rather than
   * leaving the client to infer it from a sentence and print the sentence underneath instead.
   */
  mostUseful?: { dimension: string; says: string } | null
  /** Their own best answer, quoted back. */
  strongest?: string | null
}) {
  if (!dimensions || Object.keys(dimensions).length === 0) return null

  const rows = THE_FIVE.map(d => ({
    ...d,
    there: wasItThere(dimensions[d.key]),
    /* Only ever marks something that is actually missing - telling somebody the most useful thing
       they could add is one they already did says nothing. */
    mostUseful: !!mostUseful && mostUseful.dimension === d.key && !wasItThere(dimensions[d.key]),
  }))

  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '15px 17px' }}>
      {/*
        THE HEADING NAMES THE SESSION, because nobody knew this was about one.
        "What was in what you said" over a list of absences, with the session number buried in a
        sub-line, left a person reading a permanent judgement instead of a note about session 1.
      */}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-sub-d)', marginBottom: 3 }}>
        What would make your next check-in count for more
      </div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 11 }}>
        {/*
          "ACCOUNT" IS THE ROBOT WORD, and it was still in here after being banned once. It means
          somebody's account of what happened; in an app it reads as a login, and nobody stops to
          work out which. So the sentence says the thing instead of naming it.
        */}
        {sessionNumber ? `Session ${sessionNumber} was mostly about the situation around you. ` : ''}
        {/* Her sentence, minus the one word she banned: "five things make an account something a
            reader can check" - account means their account of what happened and reads as a login. */}
        Five things make a check-in something a reader can check. Add one or two next time.
      </div>
      {/*
        SAID OUT LOUD, NOT LEFT TO A TICK MARK.

        The row below used to print the same noun phrase either way - "What you did, not just what
        was happening" - whether or not the engine had found it, so the only thing that told found
        from missing was a filled or empty circle. Somebody who cannot see the circle's colour, or
        who is not looking closely, reads five identical lines. And a reader is also entitled to be
        told, in words, that this read can miss real things they said.
      */}
      <p style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.5, marginBottom: 11 }}>
        Groundwork looked for these five things. It may have missed some of what you said.
      </p>

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
                color: r.there ? 'var(--gw-green-t)' : 'var(--gw-sub-d)',
                border: '1px solid ' + (r.there ? 'var(--gw-green-b)' : 'var(--gw-border)'),
              }}
            >
              {r.there ? '✓' : ''}
            </span>
            {/*
              THE SAME WORDS EITHER WAY, AND THE TICK CARRIES THE DIFFERENCE.

              Two wordings meant the list changed shape as sessions went on, so a person could not
              scan the same five things twice. One list, ticked where it was there - and a ticked
              line reads as "you did this" without a sentence having to say so.
            */}
            <span style={{
              fontSize: 12.5, lineHeight: 1.5,
              color: r.there ? 'var(--gw-text)' : r.mostUseful ? 'var(--gw-text)' : 'var(--gw-sub)',
              fontWeight: r.mostUseful ? 700 : 400,
            }}>
              {/*
                U.9 RE-REVIEW, ITEM A: A REAL SPACE, AND A SENTENCE, NOT A SHOUTED BADGE.
                The badge sat right after the sentence with only a CSS margin between them, so the
                text itself read "this time.MOST USEFUL" with nothing between the full stop and the
                next word, and the badge shouted in capitals. It is now the sentence's own words.
              */}
              {r.there ? r.met : r.missing}. {r.there ? 'Groundwork found this.' : 'Groundwork did not pick this up this time.'}
              {r.mostUseful && ' This is the one worth adding first.'}
            </span>
          </div>
        ))}
      </div>

      {/* "Add one or two next time" was here AND in the sentence above the list, twenty lines
          apart, saying the same thing. The intro keeps it. */}

      {/* Nobody can act on a word like "low"; everybody can act on "none of your answers say when". */}
      {/* Her line, under the list the mark is in. Five equal suggestions is something to skim; one
          named as the most useful is a thing to do. */}
      {/*
        THE BADGE SAYS WHICH ONE. THIS SAYS WHY. THEY USED TO SAY BOTH TWICE.

        The row carried "MOST USEFUL" and the line under it opened "Most useful for you:" - the same
        statement in two places, one of them redundant the moment the other exists. The badge is the
        mark she asked for; this keeps only the half the badge cannot carry, which is the reason.
      */}
      {mostUseful && (
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--gw-border)' }}>
          {mostUseful.says.charAt(0).toUpperCase() + mostUseful.says.slice(1)}
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
