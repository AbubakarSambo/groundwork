import { useState } from 'react'
import './ui/gw-ui.css'

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
 *
 * BOARD REVIEW, 30 SEPTEMBER: rebuilt from the shared parts to join `REBUILT_PAGES` - the question
 * itself read at 12.5px, below the prototype's own 13px floor. `danger`/caution each get their own
 * pair of classes in gw-ui.css rather than a colour picked at render time, since only two variants
 * exist and neither is data-driven.
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
    <div role="group" aria-label={saying} className={`gwui-confirm ${danger ? 'gwui-confirm-danger' : 'gwui-confirm-caution'}`}>
      <div className={`gwui-confirm-saying ${danger ? 'gwui-confirm-saying-danger' : 'gwui-confirm-saying-caution'}`}>{saying}</div>
      <div className="gwui-confirm-actions">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`gwui-confirm-btn ${danger ? 'gwui-confirm-btn-danger' : 'gwui-confirm-btn-caution'}`}
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
        <button type="button" onClick={onKeep} disabled={pending} className="gwui-confirm-btn gwui-confirm-btn-keep">
          {keepLabel}
        </button>
      </div>
    </div>
  )
}
