import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * HAFSAH'S RULE: NO TEXT IS BELOW 13PX, EVEN ON THE FROZEN CLOSE.
 *
 * `TheReportYouSawAtTheEnd.tsx` is the report a stranger with no account reads at the end of
 * their very first session, so its sizing is deliberately frozen (see the file's own comments) and
 * moved only through the `--er-lead` / `--er-body` / `--er-label` custom properties a media query
 * shrinks for a phone. Before this change, two of those read 12px and 9px on desktop, and the
 * phone media query still had one at 11px - all below the 13px floor. This spec reads the file's
 * own `SIZES` style string and checks every `--er-*` custom property, in the base block and the
 * phone media query alike, is 13px or larger. It does not touch the handful of unrelated literal
 * `fontSize` values inside the component itself (an 11px/12px caption here and there) - raising
 * those is a different, wider change than the narrow one Hafsah asked for here.
 */
const FILE = join(__dirname, 'TheReportYouSawAtTheEnd.tsx')
const read = () => readFileSync(FILE, 'utf8')

function sizesBlock(src: string): string {
  const m = src.match(/const SIZES = `([\s\S]*?)`/)
  if (!m) throw new Error('could not find the SIZES style string in TheReportYouSawAtTheEnd.tsx')
  return m[1]
}

/* Only the three TEXT-SIZE custom properties the file's own comments name (`--er-lead`,
   `--er-body`, `--er-label`). `--er-box*` and `--er-gap*` are padding and spacing, not text
   size, and are left exactly as they were - the task is the text-size floor, nothing else. */
const TEXT_SIZE_PROPERTIES = ['--er-lead', '--er-body', '--er-label']

function textSizeCustomProperties(css: string): { name: string; px: number }[] {
  const out: { name: string; px: number }[] = []
  for (const m of css.matchAll(/(--er-[a-z]+):\s*([\d.]+)px;/g)) {
    if (TEXT_SIZE_PROPERTIES.includes(m[1])) out.push({ name: m[1], px: parseFloat(m[2]) })
  }
  return out
}

describe('the frozen entry-close report never sizes text below 13px', () => {
  it('every text-size custom property, desktop and the phone media query alike, is at least 13px', () => {
    const css = sizesBlock(read())
    const sizes = textSizeCustomProperties(css)
    expect(sizes.length).toBeGreaterThan(0)
    for (const { name, px } of sizes) {
      expect(px, `${name}: ${px}px`).toBeGreaterThanOrEqual(13)
    }
  })
})
