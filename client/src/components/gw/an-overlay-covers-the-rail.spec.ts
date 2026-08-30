import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/**
 * A FULL-SCREEN OVERLAY HAS TO BE ABOVE THE NAVIGATION.
 *
 * The entry chat's save card - the panel where somebody types their email to keep their check-in -
 * sat below the rail. It is `position: fixed; inset: 0` with a 640px card centred on the viewport,
 * so on any screen narrower than about 1120 the rail drew over its left edge and clipped it.
 *
 * Wide screens hide this completely, which is why it survived: at 1440 the card starts at 400 and
 * the rail is 240 wide, so they never touch. Found at 953.
 */
const SRC = join(__dirname, '..', '..')
const RAIL = 40 /* AppShell's own z-index. */

function everyFile(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) { everyFile(full, out); continue }
    if (/\.tsx$/.test(name) && !/\.spec\./.test(name)) out.push(full)
  }
  return out
}

describe('anything that covers the screen covers the rail too', () => {
  it('finds no full-screen overlay sitting under the navigation', () => {
    const under: string[] = []
    for (const file of everyFile(SRC)) {
      const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ')
      /* The shape that matters: fixed, covering everything, with its own z-index. */
      for (const m of text.matchAll(/position:\s*'fixed',\s*inset:\s*0,[^}]*?zIndex:\s*(\d+)/g)) {
        if (Number(m[1]) < RAIL) under.push(`${file.replace(SRC, '')} → zIndex ${m[1]}`)
      }
    }
    expect(under).toEqual([])
  })

  it('and the rail is still where this thinks it is', () => {
    /* If the rail moves, this guard is comparing against a number that means nothing. */
    const shell = readFileSync(join(SRC, 'components', 'gw', 'AppShell.tsx'), 'utf8')
    expect(shell).toContain(`zIndex: ${RAIL}`)
  })
})
