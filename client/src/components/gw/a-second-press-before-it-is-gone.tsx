import { useState } from 'react'

/**
 * A SECOND PRESS BEFORE IT IS GONE.
 *
 * Six destructive controls fired on one press: revoking a key whose secret is hashed at issue,
 * removing a webhook endpoint, removing a target from the board, ending an engagement, and throwing
 * away an anonymous conversation and its report. The reference is GroundAdminPage's inline two-step:
 * name the object, a distinct keep-shaped cancel, a pending label, the server's refusal inline.
 *
 * This owns the SHAPE and never the copy. Every caller names its own object in `saying`; a generic
 * "Are you sure?" is the thing being replaced. Not `window.confirm` here - AppShell keeps its own,
 * by a written decision (switching-organisation-is-not-a-stray-click.spec.tsx), and that is a
 * different case: a navigation, not a deletion.
 */
export function useAreYouSure<T = string>() {
  const [armed, setArmed] = useState<T | null>(null)
  return {
    armed,
    arm: (what: T) => setArmed(what),
    disarm: () => setArmed(null),
    isArmed: (what: T) => armed !== null && armed === what,
  }
}

export function Confirm({ saying, confirmLabel, keepLabel = 'Keep it', pending = false, pendingLabel = 'Working…', danger = true, onConfirm, onKeep }: {
  saying: string
  confirmLabel: string
  keepLabel?: string
  pending?: boolean
  pendingLabel?: string
  danger?: boolean
  onConfirm: () => void
  onKeep: () => void
}) {
  return (
    <div role="group" aria-label={saying} style={{ padding: '10px 12px', borderRadius: 8, background: danger ? 'var(--gw-red-bg)' : 'var(--gw-amber-bg)', border: `1px solid ${danger ? 'var(--gw-red-b-soft)' : 'var(--gw-amber-b-soft)'}`, marginTop: 8 }}>
      <div style={{ fontSize: 14.5, color: danger ? 'var(--gw-red-t)' : 'var(--gw-amber-t)', lineHeight: 1.5, marginBottom: 8 }}>{saying}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onConfirm} disabled={pending} style={{ padding: '7px 12px', borderRadius: 6, border: 'none', background: danger ? 'var(--gw-red-t)' : 'var(--gw-navy)', color: 'white', fontSize: 14.5, fontWeight: 700, cursor: pending ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {pending ? pendingLabel : confirmLabel}
        </button>
        <button type="button" onClick={onKeep} disabled={pending} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid var(--gw-border)', background: 'white', color: 'var(--gw-sub)', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          {keepLabel}
        </button>
      </div>
    </div>
  )
}
