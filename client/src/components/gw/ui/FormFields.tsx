import React from 'react'
import './gw-ui.css'

/**
 * TEXT FIELD, TEXT AREA, SELECT, FIELD LABEL (prototype: label.f, .input, app.css - the sign-in
 * kit's field, made general).
 *
 * 48px tall, 16px at the sides, 16px text, 10px corners, a 1.5px line, white; a text box is at
 * least 96px tall with 12/16px inside; a label is 14.5px bold, 6px above; focus is a 3px navy
 * outline 2px outside.
 */
export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label className="gwui-field-label" htmlFor={htmlFor}>{children}</label>
}

export const TextField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className, ...rest }, ref) {
    return <input ref={ref} className={['gwui-input', className].filter(Boolean).join(' ')} {...rest} />
  },
)

export const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={['gwui-input', className].filter(Boolean).join(' ')} {...rest} />
  },
)

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={['gwui-input', className].filter(Boolean).join(' ')} {...rest}>
        {children}
      </select>
    )
  },
)
