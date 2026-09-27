import { Button, Mark } from '@/components/gw/kit'
import type { TheEndCard as EngineEndCard } from '@/api/conversation'

/**
 * THE END CARD (B3, docs/prototype/screens/B3-the-check-in/check-in-end-card.txt).
 *
 * Groundwork's last message ("That’s all for today. Below is what I wrote down from your answers. Is
 * anything wrong?") is the engine's and sits above this in the conversation. Under it, three parts:
 *
 *   1. What is now in your record   each line with its mark. Only the engine can write these, from
 *                                   the answers just given (request 7). Left out until it does.
 *   2. Why answering matters        the prototype's words, when the lead also answers this check-in
 *   3. What happens next            when the next one opens, what the engine says would prove a line,
 *                                   and "If you don’t want to talk about something yet, that’s fine."
 *
 * Numbered by what is drawn, so a card with two parts reads 1 and 2, not 2 and 3.
 *
 * The prototype's line "Your team will see what you said today, and a short summary of what moved."
 * is not shown: whether the team sees a person's words is the open question about the invitation's
 * promise (morning report, item 11, conflict A), and a sentence here must match what the server does.
 *
 * "That’s right, finish" is the one press that finishes, and "Change something" goes back to the
 * conversation, where the person says what is wrong in their own words.
 */
export function TheEndCard({
  engine,
  leadName,
  nextOpens,
  finishing,
  whileFinishing,
  onFinish,
  onChange,
}: {
  engine: EngineEndCard | null | undefined
  /** The lead's first name, when the lead also answers this check-in. See whoElseAnswers. */
  leadName: string | null
  /** "Your next check-in opens tomorrow at 4pm.", when it is known. */
  nextOpens: string | null
  finishing: boolean
  /** What to show while finishing, which takes about half a minute. */
  whileFinishing?: React.ReactNode
  onFinish: () => void
  onChange: () => void
}) {
  const record = (engine?.inYourRecord ?? []).filter(l => typeof l?.says === 'string' && l.says.trim())
  const fromTheEngine = (engine?.next ?? []).filter(l => typeof l === 'string' && l.trim())
  const next = [
    ...(nextOpens ? [nextOpens] : []),
    ...fromTheEngine,
    'If you don’t want to talk about something yet, that’s fine. You can leave it for now.',
  ]

  let n = 0
  const part = () => (n += 1)

  return (
    <section aria-label="What I wrote down" style={{ display: 'grid', gap: 12, padding: '4px 0 8px' }}>
      {record.length > 0 && (
        <div style={box}>
          <h2 style={heading}>{part()}. What is now in your record</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {record.map((l, i) => (
              <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--gw-border)' : undefined }}>
                <span style={{ width: 16, flexShrink: 0, paddingTop: 3 }}><Mark mark={l.mark} /></span>
                <span>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--gw-text)', lineHeight: 1.45 }}>{l.says}</span>
                  {l.how && <span style={{ display: 'block', fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.45, marginTop: 2 }}>{l.how}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {leadName && (
        <div style={box}>
          <h2 style={heading}>{part()}. Why answering matters</h2>
          <p style={body}>
            {leadName} also answers a check-in. The report puts the answers side by side. It shows where you agree and where you see things differently. It does not decide who is right.
          </p>
        </div>
      )}

      <div style={box}>
        <h2 style={heading}>{part()}. What happens next</h2>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
          {next.map((l, i) => <li key={i} style={body}>{l}</li>)}
        </ul>
      </div>

      {finishing && whileFinishing}
      <div style={{ display: 'grid', gap: 10 }}>
        <Button kind="primary" wide onClick={onFinish} disabled={finishing}>
          {finishing ? 'Saving…' : 'That’s right, finish'}
        </Button>
        <Button kind="secondary" wide onClick={onChange} disabled={finishing}>
          Change something
        </Button>
      </div>
    </section>
  )
}

const box: React.CSSProperties = { border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 16px', background: 'white' }
const heading: React.CSSProperties = { margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--gw-text)' }
const body: React.CSSProperties = { margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--gw-text)' }
