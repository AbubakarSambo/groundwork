/**
 * ONE PALETTE, AND THE STYLESHEET THAT CARRIES IT ACTUALLY LOADS. W14-8.
 *
 * The marketing site was already using the product's colours - #1A1916, #0C447C, #6B6560 - typed out
 * by hand 538 times with nothing naming them. So there was never a second design language; there was
 * one language with no vocabulary, which is how it drifted:
 *
 *   four near-identical off-whites where the product has one background, and #4A5568 used
 *   thirty-five times for body text, a blue-grey from another palette sitting next to the
 *   product's own #6B6560 on the same pages.
 *
 * Two things this file exists to keep true, because both were wrong when it was written and neither
 * announced itself:
 *
 *   1. The tokens are imported by `Nav.astro`, not `Layout.astro`. The home page - the busiest one -
 *      does not use the layout at all; it is a standalone document with its own head. An import
 *      there reaches four pages out of five.
 *   2. The old `<link rel="stylesheet" href="/src/styles/global.css">` was served by Vite as a
 *      JavaScript module in dev, so it applied nothing. That was invisible while the file held one
 *      Tailwind import and every page wrote literals. The moment tokens went in, the whole site
 *      would have rendered with no palette.
 *
 * Run against the source. `check-one-domain.mjs` is the sibling that guards the nav.
 */
import { readFileSync, readdirSync } from 'fs'

/** Comments stripped first: this guard's own explanation quotes the link tag it forbids. */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const fail = m => { console.error('[one-palette] ' + m); process.exitCode = 1 }

const navRaw = readFileSync('src/components/Nav.astro', 'utf8')
if (!/^import '\.\.\/styles\/global\.css'/m.test(strip(navRaw))) {
  fail('Nav.astro no longer imports the tokens. It is the only file all five pages include.')
}

const layout = strip(readFileSync('src/layouts/Layout.astro', 'utf8'))
if (/<link[^>]+global\.css/.test(layout)) {
  fail('global.css is back as a <link>, which Vite serves as JavaScript in dev. Import it instead.')
}

const css = readFileSync('src/styles/global.css', 'utf8')
for (const token of ['--gw-text', '--gw-navy', '--gw-sub', '--gw-muted', '--gw-border', '--gw-bg']) {
  if (!css.includes(token)) fail(`${token} is missing from global.css, and pages reference it.`)
}

/** The drift, named so it cannot quietly come back. */
const RETIRED = {
  '#4A5568': 'a blue-grey from another palette - use --gw-sub',
  '#F5F3EF': 'one of four near-identical off-whites - use --gw-paper',
  '#E8E6E3': 'one of four near-identical off-whites - use --gw-paper-2',
  '#EDEBE7': 'one of four near-identical off-whites - use --gw-paper-2',
}
const pages = [
  ...readdirSync('src/pages').filter(f => f.endsWith('.astro')).map(f => 'src/pages/' + f),
  ...readdirSync('src/components').filter(f => f.endsWith('.astro')).map(f => 'src/components/' + f),
]
for (const file of pages) {
  const src = readFileSync(file, 'utf8')
  for (const [hex, why] of Object.entries(RETIRED)) {
    if (src.toUpperCase().includes(hex)) fail(`${file} uses ${hex}: ${why}.`)
  }
}

if (!process.exitCode) {
  console.log('[one-palette] tokens load on every page, and no retired colour is back.')
}
