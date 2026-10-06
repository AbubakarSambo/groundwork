import React from 'react'
import { Link } from 'react-router-dom'
import './gw-ui.css'

/**
 * BUTTON (prototype: .btn / .btn.pri / .btn.sec / .btn.quiet / .btn.danger, app.css lines 64-68).
 *
 * Brought over from kit.tsx's `Button`, which already copied the prototype's values (A1, 26
 * September). The prototype has exactly four kinds - primary (navy), secondary (white, thin
 * outline), quiet (plain text) and danger (solid red, `background:var(--con);color:#fff`) - and
 * two sizes, `big` and `sm`. 30 September (Hafsah): the product had grown a fifth and sixth
 * "kind" the prototype does not have - an outlined red danger and a "quiet danger" red-text
 * variant - so every danger button read a different weight depending on which call site wrote it.
 * Removed. `kind="danger"` is now always the prototype's one solid red, whatever it is used for;
 * a call site that wanted a quieter red before a confirmation now uses plain `kind="quiet"`
 * (navy, same as everywhere else quiet is used) and relies on the confirmation step itself, not a
 * tinted trigger button, to signal the action is destructive.
 *
 * Three sizes: the normal 44px minimum, `big` (54px), `small` (36px, 40px on a phone).
 *
 * `redText`, with the secondary kind only: the prototype's own "End this check-in" (s41.js,
 * `class="btn sec" style="color:var(--con)"`), a white secondary button whose words are red. Not a
 * fifth kind; used for a step that ends or deletes something, before its own confirmation.
 */
export type ButtonKind = 'primary' | 'secondary' | 'quiet' | 'danger'

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, {
  kind?: ButtonKind
  /** Red words on a secondary button, as the prototype's "End this check-in". */
  redText?: boolean
  size?: 'big' | 'small'
  wide?: boolean
  to?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  children: React.ReactNode
  'aria-label'?: string
}>(function Button({ kind = 'primary', size, wide, redText, to, onClick, type = 'button', disabled, children, ...rest }, ref) {
  const className = [
    'gwui-btn',
    `gwui-btn-${kind}`,
    size && `gwui-btn-${size}`,
    wide && 'gwui-btn-wide',
    redText && kind === 'secondary' && 'gwui-btn-red-text',
  ].filter(Boolean).join(' ')

  if (to && !disabled) {
    return <Link ref={ref as React.Ref<HTMLAnchorElement>} to={to} className={className} onClick={onClick} aria-label={rest['aria-label']}>{children}</Link>
  }
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} className={className} onClick={onClick} disabled={disabled} aria-label={rest['aria-label']}>
      {children}
    </button>
  )
})
