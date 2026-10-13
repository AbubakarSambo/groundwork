import { useState } from 'react'
import { SubHeading, Panel, RowList, Row, Note, Callout, Stack, Text } from './ui'

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
  /** Decision 141 (2): plain sentences, every number counted by code from the record. */
  theCountsBehindThis?: { says: string[] } | null
}

/**
 * TWO PIECES ARE TWO LINES, NEVER ONE LINE WITH A COLON (U.9).
 *
 * "What this cannot tell you" drew "**The renewals target**: nobody said who set it." and "What the
 * check-ins did not get to" drew "How they vet people: 2 conversations never reached it". Both read
 * as a table row. The engine writes `about` and `why` as full sentences, so each goes on its own
 * line, and the count is a sentence of its own under what it counts.
 *
 * The engine's table is gone: the server no longer sends it to anybody. "See the counts behind this"
 * came back under decision 141 (2) as plain sentences the server counts from the record by code.
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

/** "See the counts behind this": folded under the judgement, opened by the reader. */
function TheCountsBehindThis({ says }: { says: string[] }) {
  const [open, setOpen] = useState(false)
  if (!says.length) return null
  return (
    <div>
      {/* The shared link part: navy, underlined, with a 40px box a finger can hit. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="gwui-plain-link"
      >
        {open ? 'Hide the counts' : 'See the counts behind this'}
      </button>
      {open && (
        <div aria-label="The counts behind this">
          <Text size="15" ink="text" lineHeight={1.6}>
            <Stack gap={4}>
              {says.map((s, i) => <div key={i}>{s}</div>)}
            </Stack>
          </Text>
        </div>
      )}
    </div>
  )
}

export function TheJudgement({ it, hideWhatThisCannotTellYou }: {
  it: TheJudgementRead | null | undefined
  /** THE "MARKETVIEW, WHERE NEXT" BOARD'S OWN PLACE FOR THIS LIST IS ELSEWHERE ON THE PAGE, OUT OF
      THE FOLD (mvnext.txt) - true for that kind alone, so its own copy, further up the board, is
      never read twice here inside the folded "What the answers say". Every other kind draws it
      here exactly as before. */
  hideWhatThisCannotTellYou?: boolean
}) {
  if (!it?.theGap && !it?.whatToDo?.length) return null
  return (
    // U.10: full width, like the rest of the prototype's board - not capped at 760px.
    <div>
      {/* The gap, in the largest type on the board, because it is the one thing they will remember. */}
      {it.theGap && (
        <Callout tone="emphasis" title="The gap">{it.theGap}</Callout>
      )}

      {!!it.whatTheNumbersSay?.length && (
        <>
          <SubHeading tone="kicker">What the numbers say</SubHeading>
          <Panel pad={false}>
            <RowList label="What the numbers say">
              {it.whatTheNumbersSay.map((l, i) => (
                <Row key={i} columns="1fr" inset="kicker">
                  <div className="gwui-pt-11 gwui-pb-11">
                    <div className="gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>{l.says}</div>
                    {l.soWhat && <div className="gwui-mt-3"><Note>{l.soWhat}</Note></div>}
                  </div>
                </Row>
              ))}
            </RowList>
          </Panel>
        </>
      )}

      {/* Ranked, and each one carries what justifies it - a move with no count behind it is a hunch. */}
      {!!it.whatToDo?.length && (
        <>
          <SubHeading tone="kicker">What to do</SubHeading>
          <Panel pad={false}>
            <RowList label="What to do">
              {it.whatToDo.map((m, i) => (
                <Row key={i} columns="1fr" inset="kicker">
                  <div className="gwui-pt-12 gwui-pb-12">
                    <div className="gwui-gap-10" style={{ display: 'flex', alignItems: 'baseline' }}>
                      <span className="gwui-fs-13 gwui-ink-white" style={{
                        flexShrink: 0, width: 18, height: 18, borderRadius: 9, background: 'var(--gw-navy)',
                        fontWeight: 800, textAlign: 'center', lineHeight: '18px',
                      }}>{i + 1}</span>
                      <span className="gwui-fs-16 gwui-ink-dark" style={{ fontWeight: 700, lineHeight: 1.5 }}>{m.move}</span>
                    </div>
                    <div className="gwui-fs-15 gwui-ink-sub gwui-mt-5 gwui-pl-28" style={{ lineHeight: 1.55 }}>
                      {m.because}
                    </div>
                    {m.startWith && (
                      <div className="gwui-fs-15 gwui-ink-text gwui-mt-3 gwui-pl-28" style={{ lineHeight: 1.55 }}>
                        {startWith(m.startWith)}
                      </div>
                    )}
                  </div>
                </Row>
              ))}
            </RowList>
          </Panel>
        </>
      )}

      {/* The edge of the data, named. Without it a reader has no way to tell where to stop trusting. */}
      {!hideWhatThisCannotTellYou && !!it.whatThisCannotTellYou?.length && (
        <>
          <SubHeading tone="kicker">What this cannot tell you</SubHeading>
          <Panel pad={false}>
            <RowList label="What this cannot tell you">
              {it.whatThisCannotTellYou.map((w, i) => (
                <Row key={i} columns="1fr" inset="kicker">
                  <div className="gwui-pt-9 gwui-pb-9 gwui-fs-15 gwui-ink-text" style={{ lineHeight: 1.55 }}>
                    <div style={{ fontWeight: 600 }}>{w.about}</div>
                    {w.why && <div className="gwui-mt-2">{w.why}</div>}
                    {w.toKnow && <div className="gwui-ink-sub gwui-mt-2">{w.toKnow}</div>}
                  </div>
                </Row>
              ))}
            </RowList>
          </Panel>
        </>
      )}

      {/*
        AND OURS, SAID PLAINLY. Eighty-six of a hundred and one conversations never reached how the
        person vets anybody. That is a fact about how we ran the check-in, not about the people in
        it, and burying it would make every count above look better than it is.
      */}
      {!!it.whatWeFailedToAsk?.length && (
        <>
          <SubHeading tone="kicker">What the check-ins did not get to</SubHeading>
          <div className="gwui-fs-15 gwui-ink-sub" style={{ lineHeight: 1.6 }}>
            <Stack gap={6}>
              {it.whatWeFailedToAsk.map((w, i) => (
                <div key={i}>
                  <div className="gwui-ink-text">{w.about}</div>
                  {typeof w.howManyMissedIt === 'number' && <div className="gwui-note">{howManyNeverReachedIt(w.howManyMissedIt)}</div>}
                </div>
              ))}
            </Stack>
          </div>
        </>
      )}

      {!!it.theCountsBehindThis?.says?.length && <TheCountsBehindThis says={it.theCountsBehindThis.says} />}

    </div>
  )
}
