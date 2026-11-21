/**
 * THE PROTOTYPE'S OWN INLINE STYLES, PASTED AS THEY ARE (Hafsah, 21 November 2026: port the boards one-to-one, never by eye).
 *
 * The prototype writes most of a board's layout as inline style strings ("display:flex;gap:6px;align-items:center"). React wants an
 * object, so `css()` turns the prototype's own string into one, and every ported board pastes the string from the prototype's
 * rendered DOM (docs/boards-21-nov/prototype-dom/) without re-typing a value.
 */
import type { CSSProperties } from 'react'

const cache = new Map<string, CSSProperties>()

export function css(text: string): CSSProperties {
  const hit = cache.get(text)
  if (hit) return hit
  const out: Record<string, string> = {}
  for (const part of text.split(';')) {
    const i = part.indexOf(':')
    if (i < 0) continue
    const prop = part.slice(0, i).trim()
    const value = part.slice(i + 1).trim()
    if (!prop || !value) continue
    /* A custom property stays as written; everything else in camel case, as React reads it. */
    out[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value
  }
  cache.set(text, out as CSSProperties)
  return out as CSSProperties
}

/** The prototype's small dot in the deal grid, one per weekday ("width:13px;height:13px;border-radius:50%;display:block;" and its fill). */
export const DOT = 'width:13px;height:13px;border-radius:50%;display:block;'
export const DOT_FILL = {
  /* A weekday before today with nothing on record. */
  empty: 'background:#F3ECDF;',
  /* Contact with proof: a photo, a quote, a payment. */
  proof: 'background:var(--rec);',
  /* Contact in their words. */
  said: 'box-shadow:inset 0 0 0 2px var(--ink);',
  /* The next step, booked for this day. */
  booked: 'box-shadow:inset 0 0 0 2px var(--act);background:var(--act-soft);',
  /* A day still to come. */
  ahead: 'background:transparent;',
  /* Today, around whatever the day holds. */
  today: 'outline:2px solid var(--att);outline-offset:1px;',
} as const

