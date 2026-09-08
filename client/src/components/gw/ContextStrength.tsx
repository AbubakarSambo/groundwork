import type { ContextStrengthRead } from '@/lib/contextStrength'

/**
 * WHAT THIS GROUND CAN AND CANNOT TELL YOU. G25, and G26.
 *
 * G25 is the read itself: not a score, a statement of what this ground will be able
 * to answer given what it has, shown while it can still be fixed.
 *
 * G26 is why this is a component rather than markup on one page: "one context page
 * per ground, the same page for everyone, with the closed part visibly absent
 * rather than silently missing." It lived only on the admin page, so a participant
 * opening Context saw a file picker and no idea what the ground could do with it -
 * which is the opposite of a shared understanding of the same ground.
 *
 * The limits fold away on purpose. On a new ground there is one line of what it can
 * do and up to seven of what it cannot, at the same size, which reads as a product
 * apologising for itself on the screen where somebody decides whether to bother.
 * Every "cannot" line names something you can add, so they are worth keeping - as
 * the answer to "what would make this stronger", not as the headline.
 */
/**
 * THE HONESTY LINE, HOISTED OUT SO IT CAN BE SHOWN WITHOUT THE REST.
 *
 * It used to render only inside this component, which is gated on CONTEXT_ENABLED - so it vanished
 * in exactly the state where it is MOST true. With the flag off every document is private to whoever
 * uploaded it, whatever its visibility column says, so a participant is definitely looking at less
 * than the lead is and nothing on screen said so.
 *
 * G26's "visibly absent": a participant should know the lead holds context they cannot read, rather
 * than believing they are looking at everything.
 */
export const LEAD_HOLDS_MORE =
  'The lead may hold context for this check-in that is not shown here. That is by design, and it never includes anything you have said.'

export function ContextStrength({ read, closedNote }: {
  read: ContextStrengthRead
  /**
   * Shown to somebody who is not the lead. G26's "visibly absent": a participant
   * should know the lead holds context they cannot read, rather than believing they
   * are looking at everything.
   */
  closedNote?: boolean
}) {
  /**
   * REWRITTEN, BECAUSE IT READ AS GENERATED FILLER.
   *
   * "This section of the context page looks like AI slop." It was: an uppercase eyebrow, a green
   * heading reading "It will be able to" over a bulleted list of future-tense promises, and a
   * collapsed amber disclosure counting its own shortcomings - "What would make it stronger (5)".
   * Three colours, two headings and a parenthesised number, for two facts.
   *
   * The facts were never the problem and none of them changed. What it says now is what this
   * check-in can do, in one sentence, and then the things you could add - as things to add, in the
   * page's own voice, with no colour theatre and nothing hidden behind a counter.
   */
  const canLine = read.can.length
    ? `${read.can.map((l, i) => (i === 0 ? l.charAt(0).toUpperCase() + l.slice(1) : l)).join('; ')}.`
    : ''

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gw-text)', marginBottom: 4 }}>
        What this check-in can tell you
      </div>

      {canLine && (
        <div style={{ fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.65, marginBottom: read.cannot.length ? 10 : 0 }}>
          {canLine}
        </div>
      )}

      {read.cannot.length > 0 && (
        <div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 4 }}>
            It cannot do these yet, and each one names what is missing:
          </div>
          <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
            {read.cannot.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      )}

      {closedNote && (
        <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.6, marginTop: 10 }}>
          {LEAD_HOLDS_MORE}
        </div>
      )}
    </div>
  )
}
