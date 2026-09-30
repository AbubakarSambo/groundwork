import React from 'react'
import { Link } from 'react-router-dom'
import './gw-ui.css'

/**
 * BUTTON (prototype: .btn / .btn.pri / .btn.sec / .btn.quiet / .btn.danger, app.css).
 *
 * Brought over from kit.tsx's `Button`, which already copied the prototype's values (A1, 26
 * September). The one addition design-audit.md item 15 asks for is the `danger` kind: a secondary
 * button with red text and a red line, for "End this check-in" and "Remove" - plus `dangerSolid`,
 * the filled red for a pop-up's final confirmation.
 *
 * Four sizes: the normal 44px minimum, `big` (54px), `small` (36px, 40px on a phone).
 */
export type ButtonKind = 'primary' | 'secondary' | 'quiet' | 'danger'

export function Button({
  kind = 'primary', size, wide, dangerSolid, danger, to, onClick, type = 'button', disabled, children, ...rest
}: {
  kind?: ButtonKind
  size?: 'big' | 'small'
  wide?: boolean
  /** Only meaningful with kind="danger": the filled red, for a pop-up's final "Remove". */
  dangerSolid?: boolean
  /**
   * Only meaningful with kind="quiet": red text instead of navy, for a row where a bordered
   * danger button would read heavier than the thing it sits beside - a target's own Remove
   * (board-as-lead.jpg), asked to be "much heavier than the prototype" and confirmed first the
   * same way a bordered one is. Still asks first (`Confirm`, the caller's own job); this only
   * changes the colour of the ask.
   */
  danger?: boolean
  to?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  children: React.ReactNode
  'aria-label'?: string
}) {
  const className = [
    'gwui-btn',
    kind === 'danger' && dangerSolid ? 'gwui-btn-danger-solid'
      : kind === 'quiet' && danger ? 'gwui-btn-quiet-danger'
      : `gwui-btn-${kind}`,
    size && `gwui-btn-${size}`,
    wide && 'gwui-btn-wide',
  ].filter(Boolean).join(' ')

  if (to && !disabled) {
    return <Link to={to} className={className} onClick={onClick} aria-label={rest['aria-label']}>{children}</Link>
  }
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled} aria-label={rest['aria-label']}>
      {children}
    </button>
  )
}
