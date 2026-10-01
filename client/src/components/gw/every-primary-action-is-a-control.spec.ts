import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * EVERY PRIMARY ACTION IS A CONTROL, AND HAS A NAME. Three shapes: a div or span that should be a
 * button (the keyboard cannot reach it); a button whose only content is a glyph; a button whose only
 * meaning is in a title. Not bolted onto an-icon-is-not-a-target.spec.ts, which owns tap-target SIZE
 * and reads two files on purpose.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', '..')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
const read = (rel: string) => strip(readFileSync(path.join(SRC, rel), 'utf8'))

/** Every opening tag of the named elements, read to its real end: a `>` at brace depth zero. */
function tagsOf(src: string, names: string[]): string[] {
  const out: string[] = []
  const re = new RegExp(`<(${names.join('|')})\\b`, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    let depth = 0
    for (let i = m.index; i < src.length; i++) {
      const c = src[i]
      if (c === '{') depth++
      else if (c === '}') depth--
      else if (c === '>' && depth === 0) { out.push(src.slice(m.index, i + 1)); break }
    }
  }
  return out
}

const EDITED = [
  'pages/auth/LinkSentPanel.tsx', 'pages/auth/AuthPage.tsx', 'pages/enter/EntryChatPage.tsx',
  'pages/grounds/GroundParticipantPage.tsx', 'pages/grounds/GroundAdminPage.tsx',
  'pages/billing/BillingPage.tsx', 'pages/billing/PaymentPage.tsx', 'pages/chat/ChatPage.tsx', 'pages/board/BoardPage.tsx',
]

describe('no span or div is a control', () => {
  it.each(EDITED)('%s', (rel) => {
    const src = read(rel)
    /* A div that only stops propagation on a scrim is not a control. */
    /* Whole opening tags, found by walking braces: `=>` inside a style object ends a naive [^>]* match. A
       scrim that closes on click-outside, a radio-role card with its own keyboard handler, and a
       stopPropagation wrapper are not primary actions. */
    const offenders = tagsOf(src, ['div', 'span'])
      .filter((t) => /onClick=/.test(t))
      .filter((t) => !/role="radio"/.test(t) && !/stopPropagation/.test(t) && !/position: 'fixed'/.test(t))
      .map((t) => t.slice(0, 80))
    expect(offenders).toEqual([])
  })
})

describe('a glyph carries a name', () => {
  it('every send arrow is labelled', () => {
    /**
     * ROUND 5, ITEM B: ChatPage.tsx's send arrow moved into components/gw/ui/Composer.tsx, whose
     * own `aria-label` comes from a `sendLabel` prop rather than a literal string - so the
     * guarantee splits in two: Composer's own button really does carry whatever name it is given
     * (checked once, in general, here), and every caller really does give it a real one.
     *
     * 4D-4: EntryChatPage.tsx's own check-in composer (it used to write its own `<button>↑</button>
     * aria-label="Send message">` by hand) moved onto this same shared Composer, so it joins
     * ChatPage.tsx on this side of the check rather than being read for a literal arrow of its
     * own - there is no longer a bare `<button>` with "↑" in that file at all.
     */
    const composer = read('components/gw/ui/Composer.tsx')
    const at = composer.indexOf('↑')
    const open = composer.lastIndexOf('<button', at)
    expect(composer.slice(open, at)).toContain('aria-label={sendLabel}')
    expect(read('pages/chat/ChatPage.tsx')).toMatch(/sendLabel="Send message"/)
    expect(read('pages/enter/EntryChatPage.tsx')).toMatch(/sendLabel="Send message"/)
    expect(read('pages/enter/EntryChatPage.tsx')).not.toContain('↑')
  })
  it('the board counts and the download buttons are named for their target', () => {
    const board = read('pages/board/BoardPage.tsx')
    expect(board).toContain('aria-label={`One fewer: ${o.name}`}')
    expect(board).toContain('aria-label={`One more: ${o.name}`}')
    /* Moved from the dead ReportBody (ReportPage.tsx) to SessionReportPage.tsx, which is already
       the one session the download is for - see the comment at the top of ReportPage.tsx. */
    expect(read('pages/report/SessionReportPage.tsx')).toContain('aria-label={`Download your session ${data.sessionNumber} record`}')
    expect(read('pages/grounds/GroundAdminPage.tsx')).toMatch(/aria-label=\{`Session \$\{ci\.sessionNumber\}:/)
  })
  it('the session chip has a space in the string, not in the CSS', () => {
    /* U.6 review: the number is plannedNow (it follows how often it runs); the space rule is
       unchanged. Was `{plannedNow}</span><span>{' '}{...}</span>` across two spans (group 3, piece
       4d-1 moved this onto the shared `Button`, which renders plain text); a literal space between
       two expressions on the same JSX line is still real text, not a CSS gap. */
    expect(read('pages/enter/EntryChatPage.tsx')).toMatch(/\{plannedNow\} \{plannedNow === 1 \? 'session planned' : 'sessions planned'\}/)
  })
  it('TextAction lives in the kit and AuthPage does not keep its own', () => {
    expect(read('components/gw/kit.tsx')).toMatch(/export function TextAction\(/)
    expect(read('pages/auth/AuthPage.tsx')).not.toMatch(/^function TextAction\(/m)
  })
})
