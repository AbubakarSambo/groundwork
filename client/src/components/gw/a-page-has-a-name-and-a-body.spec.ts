import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

/**
 * EVERY PAGE HAD A TITLE AND NONE OF THEM WAS A HEADING.
 *
 * Measured across the five main screens: zero <main> elements, zero skip links, and the dashboard,
 * the check-in page and the setup flow contained no heading of any level at all. The visual
 * hierarchy was there - `.gw-ttl` is a styled div - but the document had none, so heading navigation,
 * the primary way a screen-reader user moves through a page, did nothing.
 *
 * The rail is also the first thing in the tab order on every screen. At ten check-ins that is twenty
 * or so stops before the content, on every navigation, for anybody using a keyboard.
 *
 * WHAT THIS DELIBERATELY DOES NOT ASSERT: that a specific page has a specific title. Those move. It
 * asserts the two structural facts that were missing everywhere and that nothing else would catch.
 *
 * Comments stripped: this file names the classes it protects.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
const read = (...p: string[]) => strip(readFileSync(join(__dirname, ...p), 'utf8'))

const SHELL = read('AppShell.tsx')
const APP = read('..', '..', 'App.tsx')
const CSS = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8')

describe('a page has a name and a body', () => {
  it('the routed content is a <main>, in both shell branches', () => {
    /* The chromeless branch returns children directly and was the easier one to forget. */
    /**
     * REVIEW ROUND 3, ITEM 7: THE CLASS IS CONDITIONAL NOW - `gw-main-content gw-focus` on the
     * conversation (so it can drop the room the app's bottom bar used to reserve, which that page
     * no longer shows), `gw-main-content` alone everywhere else. Still one <main id="main">, still
     * carrying `gw-main-content` either way.
     */
    expect(SHELL).toContain("<main id=\"main\" className={onConversationPage ? 'gw-main-content gw-focus' : 'gw-main-content'}>")
    expect(SHELL).toContain('<main id="main">{children}</main>')
  })

  it('the skip link exists and points at it', () => {
    expect(APP).toContain('href="#main"')
    expect(APP).toContain('Skip to content')
  })

  it('and it is the first focusable thing in the document', () => {
    /*
     * It was inside the shell, after the help button, which made it the second tab stop and
     * therefore pointless. Its position relative to the other chrome is the whole feature.
     */
    const skip = APP.indexOf('href="#main"')
    for (const later of ['<Toaster', '<HelpModal', '<AppShell']) {
      expect(APP.indexOf(later)).toBeGreaterThan(skip)
    }
  })

  it('it is invisible until focused, and visible when it is', () => {
    expect(CSS).toMatch(/\.gw-skip\s*\{[^}]*translateY\(-200%\)/)
    expect(CSS).toMatch(/\.gw-skip:focus\s*\{[^}]*translateY\(0\)/)
  })

  it('the page title is a heading, everywhere it appears', () => {
    const pages = join(__dirname, '..', '..', 'pages')
    const files: string[] = []
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name))
        else if (e.name.endsWith('.tsx') && !e.name.includes('.spec.')) files.push(join(d, e.name))
      }
    }
    walk(pages)
    const offenders = files
      .filter(f => strip(readFileSync(f, 'utf8')).includes('<div className="gw-ttl"'))
      .map(f => f.split('/').pop())
    expect(offenders).toEqual([])
  })

  it('and a heading class carries no margin of its own, so nothing moved', () => {
    /* An h1 brings a browser margin-top that a div did not. Every page would have shifted. */
    /* UPDATED 24 October: .gw-ttl and .gw-page-h1 were removed with the styles nothing used; the prototype's own stylesheet
       takes every heading's browser margin away (h1,h2,h3,p{margin:0}). */
    const PROTO = readFileSync(join(__dirname, '../../styles/prototype.css'), 'utf8')
    expect(PROTO).toMatch(/h1,h2,h3,p\{margin:0\}/)
  })
})
