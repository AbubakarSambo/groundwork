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
export function ContextStrength({ read, closedNote }: {
  read: ContextStrengthRead
  /**
   * Shown to somebody who is not the lead. G26's "visibly absent": a participant
   * should know the lead holds context they cannot read, rather than believing they
   * are looking at everything.
   */
  closedNote?: boolean
}) {
  return (
    <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gw-sub)', marginBottom: 8 }}>
        What this ground can tell you
      </div>

      {read.can.length > 0 && (
        <div style={{ marginBottom: read.cannot.length ? 10 : 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#085041', marginBottom: 4 }}>It will be able to</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.7 }}>
            {read.can.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </div>
      )}

      {read.cannot.length > 0 && (
        <details>
          <summary style={{ fontSize: 12, fontWeight: 700, color: '#8A5C1A', marginBottom: 4, cursor: 'pointer' }}>
            What would make it stronger ({read.cannot.length})
          </summary>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
            {read.cannot.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </details>
      )}

      {closedNote && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--gw-border)' }}>
          The lead may hold context for this ground that is not shown here. That is by
          design, and it never includes anything you have said.
        </div>
      )}
    </div>
  )
}
