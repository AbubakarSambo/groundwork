import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * FAULT 6 (LIVE RE-WALK): "THIS ISN'T RIGHT, CORRECT IT" WAS DARK BLUE ON NAVY, AT 1440 AND 375.
 *
 * `TheReportYouSawAtTheEnd`'s own opening summary sits on a dark card (`.gw-head`, `background:
 * var(--gw-dark)`), and the correction link inside it (`correctionSlot`, supplied by
 * EntryChatPage.tsx) carried only `gwui-plain-link`, whose default ink is `var(--gw-navy)` -
 * unreadable on the ground it sits on.
 *
 * Fixed in the shared stylesheet both reports already draw from (CLOSE_SHEET, the-shape-every-
 * close-is-drawn-in.tsx), scoped to `.gw-head .gwui-plain-link` - not with an inline colour or a
 * new one-off class on EntryChatPage.tsx, which (as a rebuilt page) may carry neither
 * (the-rebuilt-pages-use-only-the-new-parts.spec.ts; one-off-uses-only-go-down.spec.ts, which
 * does not let a file gain its first one-off use).
 */
const entryChatSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'EntryChatPage.tsx'),
  'utf8',
)
const closeSheetSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'components', 'gw', 'the-shape-every-close-is-drawn-in.tsx'),
  'utf8',
)

describe('the correction link inside the dark summary card is readable on it', () => {
  it('the shared stylesheet gives a light ink to a plain link inside the dark head, and nowhere else', () => {
    expect(closeSheetSrc).toMatch(/\.gw-close \.gw-head \.gwui-plain-link\s*\{\s*color:\s*rgba\(255,\s*255,\s*255,\s*\.\d+\)/)
    /* Scoped to `.gw-head`: every other `.gwui-plain-link` in the product - navy on white - is
       untouched, including the second correction link on this very report (`renderCorrect`, used
       inside "What's still open", a white card). */
    expect(closeSheetSrc).not.toMatch(/^\.gwui-plain-link\s*\{/m)
  })

  it('and EntryChatPage.tsx reaches it with the plain shared class alone - no inline colour, no new one-off class', () => {
    const start = entryChatSrc.indexOf('correctionSlot={')
    expect(start).toBeGreaterThan(-1)
    const end = entryChatSrc.indexOf('renderAdd=', start)
    const block = entryChatSrc.slice(start, end)

    const buttonStart = block.indexOf("This isn't right, correct it")
    expect(buttonStart).toBeGreaterThan(-1)
    const buttonBlock = block.slice(Math.max(0, buttonStart - 400), buttonStart)
    expect(buttonBlock).toMatch(/className="gwui-plain-link"/)
    expect(buttonBlock).not.toMatch(/style=/)

    expect(block).not.toMatch(/<style/)
    expect(block).not.toMatch(/gwui-ink-white/)
  })
})
