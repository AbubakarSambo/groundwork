/**
 * SUGGESTED ANSWERS UNDER THE QUESTION (B3, check-in-start.txt): "Sent it. They liked it but want to
 * wait until after December." and "Not yet", as buttons under Groundwork's question.
 *
 * The engine writes them (docs/conversation-standard.md, point 6: "two to four short ones the person
 * might give. They are a help, never a limit."), and they arrive with its reply. Until the engine
 * sends them this draws nothing, and the box to type in is always there beside them.
 */

/** What the server sent, cleaned: real sentences only, no repeats, at most four. */
export function theSuggestedAnswers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const r of raw) {
    if (typeof r !== 'string') continue
    const t = r.trim()
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    out.push(t)
    if (out.length === 4) break
  }
  return out
}

export function SuggestedAnswers({ answers, onPick, disabled }: {
  answers: unknown
  onPick: (answer: string) => void
  disabled?: boolean
}) {
  const shown = theSuggestedAnswers(answers)
  if (shown.length === 0) return null
  return (
    <div role="group" aria-label="Suggested answers" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      {shown.map(a => (
        <button
          key={a}
          type="button"
          onClick={() => onPick(a)}
          disabled={disabled}
          style={{
            maxWidth: '85%', textAlign: 'left', padding: '8px 14px', borderRadius: 18,
            border: '1.5px solid var(--gw-border)', background: 'white', color: 'var(--gw-text)',
            fontSize: 14, lineHeight: 1.4, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {a}
        </button>
      ))}
    </div>
  )
}
