import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A1, LOOK AND LAYOUT: THE TYPE.
 *
 * The design system: "Atkinson Hyperlegible was designed so similar letters can't be confused,
 * which matters in bright light and on small screens. Literata gives people and check-ins a voice
 * without turning every heading into a headline." Body text is "Regular 16. Everything you read.
 * Never smaller than 13."
 *
 * The product used the phone's system font at 13px, and Georgia for the board's numbers.
 */
const SRC = join(__dirname, '../..')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const CSS = strip(readFileSync(join(SRC, 'index.css'), 'utf8'))
const MAIN = strip(readFileSync(join(SRC, 'main.tsx'), 'utf8'))
const PKG = JSON.parse(readFileSync(join(SRC, '../package.json'), 'utf8'))

const files: string[] = []
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.tsx?$/.test(name) && !name.includes('.spec.')) files.push(p)
  }
}
walk(SRC)

describe('the two typefaces are served by the app itself', () => {
  it('both are dependencies, so they ship with the app instead of coming from Google', () => {
    expect(PKG.dependencies['@fontsource/atkinson-hyperlegible']).toBeTruthy()
    expect(PKG.dependencies['@fontsource/literata']).toBeTruthy()
    expect(readFileSync(join(SRC, '../index.html'), 'utf8')).not.toMatch(/fonts\.googleapis/)
  })

  it('the weights the type scale uses are loaded, before the stylesheet that uses them', () => {
    for (const w of ['atkinson-hyperlegible/400.css', 'atkinson-hyperlegible/700.css', 'literata/400.css', 'literata/500.css']) {
      expect(MAIN).toContain(`@fontsource/${w}`)
    }
    expect(MAIN.indexOf('@fontsource/')).toBeLessThan(MAIN.indexOf("'./index.css'"))
  })

  it('Atkinson Hyperlegible is the face of everything a person reads', () => {
    expect(CSS).toMatch(/--gw-font-ui:\s*'Atkinson Hyperlegible'/)
    const body = CSS.slice(CSS.indexOf('\nbody {'), CSS.indexOf('}', CSS.indexOf('\nbody {')))
    expect(body).toMatch(/font-family:\s*var\(--gw-font-ui\);/)
    expect(body).toMatch(/font-size:\s*16px;/)
  })

  it('Literata is the face for names and greetings, and nothing uses Georgia on its own any more', () => {
    expect(CSS).toMatch(/--gw-font-name:\s*'Literata'/)
    const georgia = files.filter(f => /fontFamily: 'Georgia/.test(strip(readFileSync(f, 'utf8'))))
    expect(georgia.map(f => f.replace(SRC, ''))).toEqual([])
  })
})

describe('the type scale', () => {
  const size = (cls: string) => {
    const m = CSS.match(new RegExp(`\\.${cls}\\s*\\{[^}]*font-size:\\s*([0-9.]+)px`))
    if (!m) throw new Error(`.${cls} has no size`)
    return Number(m[1])
  }

  it('has the sizes the design system names', () => {
    expect(size('gw-t-greet')).toBe(38)
    expect(size('gw-t-title')).toBe(30)
    expect(size('gw-t-h2')).toBe(22)
    expect(size('gw-t-h3')).toBe(18)
    expect(size('gw-t-body')).toBe(16)
  })

  it('and nothing in it is smaller than 13', () => {
    const all = [...CSS.matchAll(/\.gw-t-[a-z0-9]+\s*\{[^}]*font-size:\s*([0-9.]+)px/g)].map(m => Number(m[1]))
    expect(all.length).toBeGreaterThanOrEqual(7)
    expect(Math.min(...all)).toBeGreaterThanOrEqual(13)
  })

  it('the greeting and title are Literata; headings and things to act on are bold Atkinson', () => {
    for (const c of ['gw-t-greet', 'gw-t-title']) {
      expect(CSS).toMatch(new RegExp(`\\.${c}\\s*\\{[^}]*font-family:\\s*var\\(--gw-font-name\\)`))
    }
    for (const c of ['gw-t-h2', 'gw-t-h3']) {
      expect(CSS).toMatch(new RegExp(`\\.${c}\\s*\\{[^}]*font-family:\\s*var\\(--gw-font-ui\\)[^}]*font-weight:\\s*700`))
    }
  })
})
