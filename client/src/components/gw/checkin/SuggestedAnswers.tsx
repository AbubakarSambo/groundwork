import { QuickReplies } from '../ui/QuickReplies'

/**
 * SUGGESTED ANSWERS UNDER THE QUESTION (B3, check-in-start.txt): "Sent it. They liked it but want to
 * wait until after December." and "Not yet", as outlined pills under Groundwork's question.
 *
 * The engine writes them (docs/conversation-standard.md, point 6: "two to four short ones the person
 * might give. They are a help, never a limit."), and they arrive with its reply. Until the engine
 * sends them this draws nothing, and the box to type in is always there beside them.
 *
 * ROUND 4, ITEM B: draws through `components/gw/ui/QuickReplies`, the prototype's own pill. This
 * file keeps the filtering (`theSuggestedAnswers`: real sentences only, no repeats, at most four) -
 * the engine's own rule, not the pill's.
 *
 * GROUP 3 REVIEW, BATCH B: the prototype's own screens (check-in-start.jpg, check-in-phone.jpg)
 * stack these one to a line, at every width, not wrapped into a row - `QuickReplies`' `stacked`
 * mode, already used by `BetweenCheckIns.tsx`. A wrapping row had been tried here instead; that
 * is not what the prototype draws.
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
  return <QuickReplies items={shown} onPick={onPick} disabled={disabled} label="Suggested answers" stacked />
}
