/**
 * THE JUDGEMENT, ON THE BOARD, WHERE SOMEBODY DECIDES SOMETHING.
 *
 * Two customers read a report that listed what people said. "It did not classify things or assess
 * or recommend well." "Too abstract, talked in parables rather than being clear in normal human
 * language about the gap." "Imagine you were building a strategy as a data collector - will this
 * help you?"
 *
 * So this is the answer to that question and it is laid out in the order somebody reads it in: the
 * gap first, because it is the only thing they will remember; then what the counts say and what each
 * one changes; then what to do, ranked, each with the count that justifies it and who to start with;
 * then what this data cannot tell them, because a reader who cannot see the edge of it calls the
 * whole thing abstract; then what we failed to ask, which is ours to own.
 *
 * EVERY SENTENCE HERE ARRIVES WITH A NUMBER IN IT. Not as a style rule - the server drops any
 * finding that does not carry one before this ever sees it. That is what makes this a judgement
 * rather than an impression, and the last report was thrown out for being an impression.
 */
export interface TheJudgementRead {
  theGap?: string
  whatTheNumbersSay?: { fieldId?: string; says: string; soWhat?: string }[]
  whatToDo?: { move: string; because: string; startWith?: string }[]
  whatThisCannotTellYou?: { about: string; why?: string; toKnow?: string }[]
  whatWeFailedToAsk?: { about: string; howManyMissedIt?: number }[]
}

const Head = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.1px', color: 'var(--gw-sub)', margin: '18px 0 7px' }}>
    {children}
  </div>
)

/**
 * TWO PIECES ARE TWO LINES, NEVER ONE LINE WITH A COLON (U.9).
 *
 * "What this cannot tell you" drew "**The renewals target**: nobody said who set it." and "What the
 * check-ins did not get to" drew "How they vet people: 2 conversations never reached it". Both read
 * as a table row. The engine writes `about` and `why` as full sentences, so each goes on its own
 * line, and the count is a sentence of its own under what it counts.
 *
 * The table ("See the counts behind this") is gone: the server no longer sends it to anybody.
 */
export function howManyNeverReachedIt(n: number): string {
  if (n === 1) return 'One conversation never reached this.'
  return `${n} conversations never reached this.`
}

/**
 * "Start with: Aisha" was a label and a colon. `startWith` is who to begin with, so it becomes one
 * sentence. And "Start with You." is nobody's own sentence about themselves - a reader is "you" to
 * the product, not a name it hands back to them, so when the answer is the reader, it reads "Start
 * with yourself."
 */
export function startWith(who: string): string {
  const w = who.trim().replace(/^start with\s+/i, '').replace(/^(The|A|An|Each|Every|All|Any)\b/, (d) => d.toLowerCase())
  if (/^you$/i.test(w)) return 'Start with yourself.'
  return `Start with ${w}${/[.!?]$/.test(w) ? '' : '.'}`
}

export function TheJudgement({ it }: { it: TheJudgementRead | null | undefined }) {
  if (!it?.theGap && !it?.whatToDo?.length) return null
  return (
    // U.10: full width, like the rest of the prototype's board - not capped at 760px.
    <div>
      {/* The gap, in the largest type on the board, because it is the one thing they will remember. */}
      {it.theGap && (
        <div style={{
          background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 10,
          padding: '14px 16px', marginBottom: 4,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.4px', color: 'var(--gw-navy)', marginBottom: 5 }}>The gap</div>
          <div style={{ fontSize: 15.5, color: 'var(--gw-text)', lineHeight: 1.55, fontWeight: 600 }}>{it.theGap}</div>
        </div>
      )}

      {!!it.whatTheNumbersSay?.length && (
        <>
          <Head>What the numbers say</Head>
          <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
            {it.whatTheNumbersSay.map((l, i) => (
              <div key={i} style={{ padding: '11px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-line)' }}>
                <div style={{ fontSize: 13.5, color: 'var(--gw-text)', lineHeight: 1.55 }}>{l.says}</div>
                {l.soWhat && (
                  <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.5, marginTop: 3 }}>{l.soWhat}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Ranked, and each one carries what justifies it - a move with no count behind it is a hunch. */}
      {!!it.whatToDo?.length && (
        <>
          <Head>What to do</Head>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {it.whatToDo.map((m, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{
                    flexShrink: 0, width: 18, height: 18, borderRadius: 9, background: 'var(--gw-navy)', color: 'white',
                    fontSize: 11, fontWeight: 800, textAlign: 'center', lineHeight: '18px',
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-dark)', lineHeight: 1.5 }}>{m.move}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 5, paddingLeft: 28 }}>
                  {m.because}
                </div>
                {m.startWith && (
                  <div style={{ fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55, marginTop: 3, paddingLeft: 28 }}>
                    {startWith(m.startWith)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* The edge of the data, named. Without it a reader has no way to tell where to stop trusting. */}
      {!!it.whatThisCannotTellYou?.length && (
        <>
          <Head>What this cannot tell you</Head>
          <div style={{ background: 'var(--gw-bg)', border: '1px solid var(--gw-border)', borderRadius: 10, padding: '4px 0' }}>
            {it.whatThisCannotTellYou.map((w, i) => (
              <div key={i} style={{ padding: '9px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--gw-line)', fontSize: 12.5, color: 'var(--gw-text)', lineHeight: 1.55 }}>
                <div style={{ fontWeight: 600 }}>{w.about}</div>
                {w.why && <div style={{ marginTop: 2 }}>{w.why}</div>}
                {w.toKnow && <div style={{ color: 'var(--gw-sub)', marginTop: 2 }}>{w.toKnow}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {/*
        AND OURS, SAID PLAINLY. Eighty-six of a hundred and one conversations never reached how the
        person vets anybody. That is a fact about how we ran the check-in, not about the people in
        it, and burying it would make every count above look better than it is.
      */}
      {!!it.whatWeFailedToAsk?.length && (
        <>
          <Head>What the check-ins did not get to</Head>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
            {it.whatWeFailedToAsk.map((w, i) => (
              <div key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>
                <div style={{ color: 'var(--gw-text)' }}>{w.about}</div>
                {typeof w.howManyMissedIt === 'number' && <div>{howManyNeverReachedIt(w.howManyMissedIt)}</div>}
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}
