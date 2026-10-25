import { theLeadsNoteParts } from '@/lib/the-leads-note'

/** The lead's own note about a person: a heading, and the words they wrote beneath it. Nothing is drawn for no note. */
export function TheLeadsNote({ role, className, style }: { role: string | null | undefined; className?: string; style?: React.CSSProperties }) {
  const parts = theLeadsNoteParts(role)
  if (!parts) return null
  return (
    <span data-leads-note className={className} style={{ display: 'block', ...style }}>
      <strong style={{ display: 'block', fontWeight: 700 }}>{parts.heading}</strong>
      {parts.note && <span style={{ display: 'block' }}>{parts.note}</span>}
    </span>
  )
}
