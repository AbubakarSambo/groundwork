import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CARD, LABEL } from './OpsLayout'

/**
 * The two ways anything gets written in the back office.
 *
 * `Adder` for making a record, `Choose` for moving one along. Both are here so
 * that adding a write to a page is a few lines rather than a form — and so
 * every write behaves the same when the server refuses, which it does often and
 * on purpose. Half this system's value is in its refusals ("that company is
 * already here", "still has a product gap recorded", "this needs sales:write"),
 * and a form that swallows them turns a careful server into a broken page.
 */

export interface Field {
  name: string
  label: string
  type?: 'text' | 'number' | 'date' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}

/** What the server said, shown as it said it. */
function Refusal({ error }: { error: unknown }) {
  const message =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (error as Error)?.message ??
    'That did not work'
  return (
    <p role="alert" style={{ fontSize: 13, color: 'var(--gw-red-t)', margin: '8px 0 0' }}>
      {message}
    </p>
  )
}

export function Adder<T>({
  title,
  fields,
  submit,
  invalidate,
  submitLabel = 'Add',
}: {
  title: string
  fields: Field[]
  submit: (values: Record<string, string>) => Promise<T>
  /** Query keys to refetch. Nothing here does an optimistic update: a write
   *  that the server may refuse must not appear on screen before it is accepted. */
  invalidate: string[][]
  submitLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: () => submit(values),
    onSuccess: () => {
      for (const key of invalidate) queryClient.invalidateQueries({ queryKey: key })
      setValues({})
      setOpen(false)
    },
  })

  if (!open) {
    return (
      <button className="gwui-btn gwui-btn-secondary gwui-btn-small"
        type="button"
        onClick={() => setOpen(true)}
        style={{ marginBottom: 14 }}
      >
        {title}
      </button>
    )
  }

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }))
  const missing = fields.filter((f) => f.required && !values[f.name]?.trim())

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (missing.length === 0) save.mutate()
      }}
      style={{ ...CARD, marginBottom: 14, maxWidth: 560 }}
    >
      <p style={LABEL}>{title}</p>

      <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
        {fields.map((f) => (
          <label key={f.name} style={{ display: 'block', fontSize: 12.5, color: 'var(--gw-sub)' }}>
            {f.label}
            {f.required && <span aria-hidden> *</span>}
            {f.options ? (
              <select
                value={values[f.name] ?? ''}
                onChange={(e) => set(f.name, e.target.value)}
                style={INPUT}
              >
                <option value=""> - </option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                value={values[f.name] ?? ''}
                onChange={(e) => set(f.name, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
                style={{ ...INPUT, resize: 'vertical' }}
              />
            ) : (
              <input
                type={f.type ?? 'text'}
                value={values[f.name] ?? ''}
                onChange={(e) => set(f.name, e.target.value)}
                placeholder={f.placeholder}
                style={INPUT}
              />
            )}
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="gwui-btn gwui-btn-primary gwui-btn-small"
          type="submit"
          disabled={save.isPending || missing.length > 0}
        >
          {save.isPending ? 'Saving…' : submitLabel}
        </button>
        <button className="gwui-btn gwui-btn-secondary gwui-btn-small"
          type="button"
          onClick={() => {
            setOpen(false)
            save.reset()
          }}
        >
          Cancel
        </button>
      </div>

      {save.isError && <Refusal error={save.error} />}
    </form>
  )
}

/**
 * Moving a record along, in place.
 *
 * A select rather than a row of buttons: the stages are a sequence, and five
 * buttons per row on a table of ten is a wall. The refusal appears under the
 * row it belongs to, because a message at the top of the page about a row in
 * the middle is a message nobody connects to what they did.
 */
export function Choose<T>({
  value,
  options,
  onPick,
  invalidate,
  label,
}: {
  value: string
  options: readonly string[]
  onPick: (next: string) => Promise<T>
  invalidate: string[][]
  label: string
}) {
  const queryClient = useQueryClient()
  const move = useMutation({
    mutationFn: (next: string) => onPick(next),
    onSuccess: () => {
      for (const key of invalidate) queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return (
    <>
      <select
        aria-label={label}
        value={value}
        disabled={move.isPending}
        onChange={(e) => move.mutate(e.target.value)}
        style={{
          fontSize: 12.5,
          padding: '3px 6px',
          borderRadius: 6,
          border: '1px solid var(--gw-border)',
          background: 'white',
          maxWidth: 170,
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, ' ').toLowerCase()}
          </option>
        ))}
      </select>
      {move.isError && <Refusal error={move.error} />}
    </>
  )
}

const INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  padding: '6px 8px',
  fontSize: 13,
  fontFamily: 'inherit',
  color: 'var(--gw-navy)',
  border: '1px solid var(--gw-border)',
  borderRadius: 6,
  background: 'white',
}
