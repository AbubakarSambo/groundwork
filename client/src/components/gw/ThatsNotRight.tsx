import { useAskStore } from '@/stores/ask'

/**
 * "THAT'S NOT RIGHT" ON A LINE (F4 item 3; Hafsah's approval of the plan, 2 November 2026). It opens the assistant on that line: the
 * person's message names it, and the assistant checks the correction against the record like any claim, asks for proof when it is
 * missing, says plainly what changed, and keeps it on the line's assessment item, so every page reads it. No page of its own. Who may
 * correct which line is the server's rule (only lines the asker may read reach the check); the button is only where they are.
 */
export const THATS_NOT_RIGHT = 'That’s not right'

/** What the person sends when they press it: the line, quoted, so the assistant knows which one. */
export function aCorrectionOf(line: string): string {
  const said = String(line ?? '').replace(/\s+/g, ' ').trim().replace(/^["“]|["”]$/g, '')
  return `${THATS_NOT_RIGHT}. “${said}”`
}

export function ThatsNotRight({ line }: { line: string }) {
  const showWith = useAskStore((s) => s.showWith)
  if (!String(line ?? '').trim()) return null
  return (
    <button type="button" className="gwui-plain-link" onClick={() => showWith(aCorrectionOf(line))}>
      {THATS_NOT_RIGHT}
    </button>
  )
}
