import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * RENAMING A CHECK-IN WAS BUILT, AND "I CANNOT RENAME THE CHECK-IN" WAS A FAIR DESCRIPTION OF IT.
 *
 * The control was a pencil at 20% white on a #0D1A2B rail - invisible on any screen not in a dark
 * room. Everything behind it worked: the input, the PATCH, the cache invalidation. None of that is
 * shipped if nobody can find the thing that starts it.
 *
 * It stays quiet, because a rail full of pencils is a rail of buttons rather than a list of names.
 * Quiet now means recessive and legible rather than absent.
 */
const SHELL = readFileSync(join(__dirname, 'AppShell.tsx'), 'utf8')
const CSS = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8')

describe('a control nobody can see is not shipped', () => {
  it('no longer paints the rename control at 20% on a dark rail', () => {
    expect(SHELL).not.toContain("color: 'rgba(255,255,255,.2)'")
  })

  it('carries a class so its states live in the stylesheet', () => {
    expect(SHELL).toContain('className="gw-rename"')
    expect(SHELL).toContain('className="gw-rail-row"')
  })

  it('is legible at rest, clearer on the row you are pointing at, and full strength on itself', () => {
    const rule = CSS.slice(CSS.indexOf('.gw-rename {'))
    expect(rule).toMatch(/opacity:\s*0\.4/)
    expect(CSS).toContain('.gw-rail-row:hover .gw-rename')
    expect(CSS).toContain('.gw-rename:focus-visible')
  })

  it('says which check-in it renames, for anybody not using a mouse', () => {
    expect(SHELL).toContain('aria-label={`Rename ${g.label}`}')
  })
})
