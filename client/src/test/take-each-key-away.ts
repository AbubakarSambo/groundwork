/**
 * THE SWEEP'S ONE HELPER (Hafsah, 15 November 2026: "fix why the page keeps cracking").
 *
 * Every page is served by a server that can leave things out: a board held back sends almost nothing,
 * older data lacks newer fields, a privacy-trimmed answer drops what the reader may not see. So a
 * page is drawn here from a real served payload with each field taken away in turn, at the top, one
 * level in, and in the first row of each list, and has to draw a page every time.
 *
 * `eachKeyTakenAway(fixture)` gives every such copy, named by the path that was taken away.
 * `whatWentWrong(container)` says what is on screen if the page cracked, or null if it did not.
 */
export type ACopy = { path: string; without: any }

const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v)

function without(node: any, path: (string | number)[]): any {
  const [head, ...rest] = path
  if (rest.length === 0) {
    if (Array.isArray(node)) return node.filter((_, i) => i !== head)
    const { [head as string]: _gone, ...others } = node
    return others
  }
  const copy = Array.isArray(node) ? [...node] : { ...node }
  ;(copy as any)[head] = without(node[head], rest)
  return copy
}

export function eachKeyTakenAway(fixture: any, depth = 2): ACopy[] {
  const out: ACopy[] = []
  const walk = (node: any, trail: (string | number)[], left: number) => {
    if (isObject(node)) {
      for (const key of Object.keys(node)) {
        if (key === '_from') continue
        out.push({ path: [...trail, key].join('.'), without: without(fixture, [...trail, key]) })
        if (left > 1) walk(node[key], [...trail, key], left - 1)
      }
    } else if (Array.isArray(node) && node.length > 0 && left > 1) {
      /* Only the first row of a list: every row is drawn by the same code. */
      walk(node[0], [...trail, 0], left - 1)
    }
  }
  walk(fixture, [], depth)
  return out
}

/* 'An undefined role is often the real problem' is a sentence the server writes on purpose. */
const CODE_TEXT = /Cannot read properties|Cannot destructure|TypeError|is not a function|is not iterable|(?<!An )undefined(?! role)|NaN|\[object Object\]/

/**
 * What is on screen if the page cracked, or null when it drew cleanly. One part drawing its one plain line
 * ('This part could not be shown.') is the designed answer to a part that cannot draw, so it is not a crack;
 * `aPartWasLost` says it happened, so the sweep can list it.
 */
export function whatWentWrong(container: HTMLElement): string | null {
  const text = container.textContent ?? ''
  if (text.includes('Something broke on this page')) return 'the whole page broke'
  const code = text.match(CODE_TEXT)
  return code ? `the page shows "${code[0]}" (...${text.slice(Math.max(0, (code.index ?? 0) - 50), (code.index ?? 0) + 20)}...)` : null
}

/** Waits for what the page asked for to arrive and be drawn (the answers come back through the client on the next turns). */
export async function untilDrawn(ms = 50) {
  const { act } = await import('@testing-library/react')
  await act(async () => { await new Promise((r) => setTimeout(r, ms)) })
}

export const aPartWasLost = (container: HTMLElement) => (container.textContent ?? '').includes('This part could not be shown.')
