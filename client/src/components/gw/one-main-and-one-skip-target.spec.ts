/**
 * ONE MAIN, ONE SKIP TARGET.
 *
 * `AppShell` wraps every route and renders `<main id="main">`; thirty-five pages then rendered
 * their own `<main id="main">` inside it. So every page in the product had two nested `main`
 * landmarks and two elements with the same id — and "Skip to content" resolves to the FIRST, which
 * is the shell's, above the navigation. Somebody using the skip link landed on the nav they were
 * skipping.
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const root = path.join(__dirname, '..', '..')

function everyTsx(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) everyTsx(full, out)
    else if (e.name.endsWith('.tsx') && !e.name.includes('.spec.')) out.push(full)
  }
  return out
}

const pages = everyTsx(path.join(root, 'pages'))

describe('one skip target in the whole product', () => {
  it('found the pages at all, so this cannot pass by looking at nothing', () => {
    expect(pages.length).toBeGreaterThan(30)
  })

  it('no page under pages/ declares id="main"', () => {
    const offenders = pages
      .filter((f) => fs.readFileSync(f, 'utf8').includes('id="main"'))
      .map((f) => path.relative(root, f))
    expect(offenders).toEqual([])
  })

  it('and no page renders a <main> inside the shell\'s one', () => {
    const offenders = pages
      .filter((f) => /<main\b/.test(
        fs.readFileSync(f, 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, ''),
      ))
      .map((f) => path.relative(root, f))
    expect(offenders).toEqual([])
  })

  it('the shell still has exactly one, which is the landmark and the target', () => {
    /* Comments stripped: the note above the shell's skip link says "There was no <main> on any
       page", and counting the word inside the explanation of the fix is how a guard fails on the
       reason rather than on the code. See a-guard-that-a-comment-satisfies-is-not-a-guard. */
    const shell = fs
      .readFileSync(path.join(root, 'components', 'gw', 'AppShell.tsx'), 'utf8')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    /* Two branches — with the rail and without it — and one main in each. */
    expect([...shell.matchAll(/id="main"/g)]).toHaveLength(2)
    expect([...shell.matchAll(/<main\b/g)]).toHaveLength(2)
  })
})

describe('and the back office is usable on a phone', () => {
  const layout = fs.readFileSync(path.join(root, 'pages', 'ops', 'OpsLayout.tsx'), 'utf8')

  it('has a media query at all, which it did not', () => {
    expect(layout).toContain('@media (max-width: 720px)')
  })

  it('stops being a fixed rail beside a narrow column', () => {
    /* 186px of nav against roughly 189px of content at 375px. */
    expect(layout).not.toMatch(/width: 186,/)
    expect(layout).toContain('.gw-ops-rail { width: 186px;')
    expect(layout).toMatch(/\.gw-ops-shell \{ display: block; \}/)
  })

  it('and the menu scrolls sideways rather than taking half the screen', () => {
    const narrow = layout.slice(layout.indexOf('@media (max-width: 720px)'))
    expect(narrow).toContain('overflow-x: auto')
  })
})
