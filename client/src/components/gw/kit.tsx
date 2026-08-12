/**
 * THE DESIGN SYSTEM, LIFTED OUT OF THE ONE PAGE THAT HAD IT.
 *
 * `BoardPage.tsx` defined Zone, Sec, Card, Row, Pill and four style objects at the
 * bottom of its own file, and nothing else in the product used them. That is the whole
 * reason the board reads better than every other page: it is the only one built from
 * components instead of inline styles, so its hierarchy is consistent by construction
 * rather than by whoever was typing.
 *
 * The tokens, so they are written down somewhere:
 *
 *   Zone label     11px, uppercase, .7px tracking, weight 800, navy, with a rule
 *   Section label  12.5px, uppercase, .4px tracking, weight 700, muted
 *   Stat value     Georgia serif, 24px, lineHeight 1, 5px under its label
 *   Row value      Georgia serif, 17px, navy
 *
 * The serif numeral against the sans label is why the board's glance row reads
 * instantly, and no other page in the product uses Georgia at all.
 *
 * This is an EXTRACTION, not a redesign: every value here is copied from BoardPage
 * unchanged, so lifting them changes nothing visually and the board keeps rendering
 * exactly as it did. What it buys is that the next page to be rebuilt inherits the
 * hierarchy by importing it, and "make it look like the board" stops being a
 * judgement call.
 */

import React from 'react'

/** A titled band with a rule, grouping sections. */
export function Zone({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '30px 2px 2px' }}>
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 800, color: 'var(--gw-navy)' }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--gw-border)' }} />
    </div>
  )
}

/** A section heading, with an optional note about where its content came from. */
export function Sec({ title, src }: { title: string; src?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '16px 2px 8px' }}>
      <h2 style={{ fontSize: 12.5, letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--gw-sub)', fontWeight: 700 }}>{title}</h2>
      {src && <span style={{ fontSize: 10.5, color: 'var(--gw-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{src}</span>}
    </div>
  )
}

export function Card({ children, pad = true }: { children: React.ReactNode; pad?: boolean }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, boxShadow: '0 1px 2px rgba(20,24,40,.05)', padding: pad ? '6px 16px' : 0 }}>
      {children}
    </div>
  )
}

export function Row({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return <div style={{ padding: '11px 0', borderTop: first ? 'none' : '1px solid var(--gw-border)' }}>{children}</div>
}

export function Pill({ children, tone = 'flat' }: { children: React.ReactNode; tone?: 'good' | 'warn' | 'bad' | 'info' | 'flat' }) {
  const m: Record<string, { bg: string; fg: string }> = {
    good: { bg: 'var(--gw-green-bg)', fg: 'var(--gw-green-t)' },
    warn: { bg: 'var(--gw-amber-bg)', fg: 'var(--gw-amber-t)' },
    bad: { bg: 'var(--gw-red-bg)', fg: 'var(--gw-red-t)' },
    info: { bg: 'var(--gw-blue-bg)', fg: 'var(--gw-blue-t)' },
    flat: { bg: '#EEF0F4', fg: 'var(--gw-sub)' },
  }
  const c = m[tone] ?? m.flat
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 11, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

/**
 * The glance tile: a small uppercase label over a serif value.
 *
 * This is the thing the board has that nothing else does. Extracted as a component
 * rather than left as inline styles so the ground page and the grounds list can
 * answer "what is the state of this" the same way (W8-47, point 3).
 */
export function Stat({ label, value, caption, tone }: { label: string; value: string; caption?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const colour = tone === 'good' ? 'var(--gw-green-t)' : tone === 'warn' ? 'var(--gw-amber-t)' : tone === 'bad' ? 'var(--gw-red-t)' : 'var(--gw-navy)'
  return (
    <div style={{ background: 'white', border: '1px solid var(--gw-border)', borderRadius: 12, padding: '12px 14px', flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--gw-muted)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, marginTop: 5, lineHeight: 1, color: colour }}>{value}</div>
      {caption && <div style={{ fontSize: 11.5, color: 'var(--gw-sub)', marginTop: 4, lineHeight: 1.45 }}>{caption}</div>}
    </div>
  )
}

export const td: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 12, borderBottom: '1px solid var(--gw-border)' }
export const btn: React.CSSProperties = { padding: '9px 16px', borderRadius: 7, background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block' }
export const miniBtn: React.CSSProperties = { width: 22, height: 22, borderRadius: 6, border: '1px solid var(--gw-border)', background: 'white', color: 'var(--gw-sub)', fontSize: 12, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }
export const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 7, background: 'none', color: 'var(--gw-sub)', fontSize: 13, border: '1px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit' }
