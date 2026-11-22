import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

/**
 * RULE 12, COUNTED (docs/groundwork-design-guide.md, section 4a, Hafsah, 23 November 2026): "Any page
 * that sets its own spacing, size or colour (an inline `style`, or its own stylesheet) is refused by a
 * check." This counts, for every file in client/src, how often it does:
 *
 *  - each spacing, size or colour property inside an inline `style={{ ... }}`;
 *  - each hex colour and each pixel value anywhere else in the file (a stylesheet of its own, a
 *    class string, a constant).
 *
 * Comments are not counted. Only styles/tokens.css may hold values; components/gw/ui/blocks.css reads
 * them and must count nothing (the phone width in its @media lines is the one exception, held equal to
 * the token). Tests are not counted.
 */
export const SRC = __dirname

/** The one file allowed to hold values. */
export const TOKENS = 'styles/tokens.css'
/** The building blocks' stylesheet, which reads only the tokens. */
export const BLOCKS = 'components/gw/ui/blocks.css'
/** This counter and its frozen list, which talk about pixels by their nature. */
const SELF = ['a-page-sets-no-spacing-size-or-colour-of-its-own.ts', 'own-spacing-size-and-colour-per-file.ts']

const OWN_STYLE = /(?<![\w$-])(margin\w*|padding\w*|gap|rowGap|columnGap|fontSize|lineHeight|fontWeight|fontFamily|letterSpacing|width|height|minWidth|maxWidth|minHeight|maxHeight|color|background\w*|border\w*|outline\w*|boxShadow|fill|stroke|top|left|right|bottom|inset)\s*:/g
const HEX = /(?<![\w&#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g
const PX = /(?<![\w.-])-?\d*\.?\d+px(?![\w-])/g

const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => line.replace(/(^|[\s;,{}()])\/\/.*$/, '$1'))
    .join('\n')

/** Every inline `style={{ ... }}`, as written, with its own braces. */
export function inlineStyles(src: string): string[] {
  const found: string[] = []
  let at = src.indexOf('style={{')
  while (at !== -1) {
    let depth = 0
    let end = at + 'style='.length
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++
      else if (src[end] === '}') { depth--; if (depth === 0) break }
    }
    found.push(src.slice(at, end + 1))
    at = src.indexOf('style={{', end)
  }
  return found
}

export type Count = { styles: number; properties: number; values: number; total: number }

export function countOwnStyle(path: string, raw: string): Count {
  let src = stripComments(raw)
  /* A media query cannot read a variable, so its width is not a value set by the page. */
  if (path.endsWith('.css')) src = src.replace(/@media[^{]*\{/g, '@media {')
  const styles = inlineStyles(src)
  const own = styles.map((s) => s.match(OWN_STYLE)?.length ?? 0)
  for (const s of styles) src = src.split(s).join(' ')
  const properties = own.reduce((a, b) => a + b, 0)
  const values = (src.match(HEX)?.length ?? 0) + (src.match(PX)?.length ?? 0)
  return { styles: own.filter((n) => n > 0).length, properties, values, total: properties + values }
}

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n)
    if (statSync(p).isDirectory()) return n === 'node_modules' || n === 'test' ? [] : walk(p)
    return /\.(tsx?|css)$/.test(n) && !/\.spec\.tsx?$/.test(n) && !/\.d\.ts$/.test(n) ? [p] : []
  })

/** Every counted file and its count, today. */
export function countEveryFile(): Record<string, Count> {
  const out: Record<string, Count> = {}
  for (const p of walk(SRC)) {
    const r = relative(SRC, p)
    if (r === TOKENS || SELF.includes(r)) continue
    const c = countOwnStyle(r, readFileSync(p, 'utf8'))
    if (c.total > 0 || r === BLOCKS) out[r] = c
  }
  return out
}
