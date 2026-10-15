import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJumpStore } from '@/stores/jump'
import { matching, type JumpItem, type JumpKind } from './what-you-can-jump-to'

/**
 * "JUMP TO" (A1): find a check-in, a person or a page, and go there.
 *
 * Ctrl K or Cmd K opens and closes it from anywhere; the arrow keys move; Enter opens; Esc closes and
 * puts you back where you were. It offers only what `whatYouCanJumpTo` built from what this reader
 * can already see.
 */
const GROUPS: { kind: JumpKind; heading: string }[] = [
  { kind: 'checkin', heading: 'Check-ins' },
  { kind: 'person', heading: 'People' },
  { kind: 'page', heading: 'Pages' },
]

export function JumpTo({ items }: { items: JumpItem[] }) {
  const open = useJumpStore(s => s.open)
  const hide = useJumpStore(s => s.hide)
  const toggle = useJumpStore(s => s.toggle)
  const navigate = useNavigate()
  const [typed, setTyped] = useState('')
  const [at, setAt] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameFrom = useRef<Element | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggle])

  useEffect(() => {
    if (!open) return
    cameFrom.current = document.activeElement
    inputRef.current?.focus()
    return () => { (cameFrom.current as HTMLElement | null)?.focus?.() }
  }, [open])

  const found = useMemo(() => matching(items, typed).slice(0, 30), [items, typed])
  /* Drawn in group order, so the arrow keys move in the order the list reads. */
  const ordered = GROUPS.flatMap(g => found.filter(i => i.kind === g.kind))

  if (!open) return null

  const close = () => { hide(); setTyped(''); setAt(0) }
  const go = (item: JumpItem | undefined) => {
    if (!item) return
    close()
    navigate(item.to)
  }

  return (
    <div
      className="gw-jump-bg"
      style={{ position: 'fixed', inset: 0, zIndex: 90 }}
      onMouseDown={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="gw-jump" role="dialog" aria-modal="true" aria-label="Jump to">
        <input
          ref={inputRef}
          className="gw-jump-input"
          role="combobox"
          aria-expanded="true"
          aria-controls="gw-jump-list"
          aria-activedescendant={ordered[at] ? `gw-jump-${ordered[at].id}` : undefined}
          aria-label="Jump to a check-in, a person or a page"
          placeholder="Jump to…"
          value={typed}
          onChange={e => { setTyped(e.target.value); setAt(0) }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAt(i => Math.min(i + 1, Math.max(0, ordered.length - 1))) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAt(i => Math.max(i - 1, 0)) }
            else if (e.key === 'Enter') { e.preventDefault(); go(ordered[at]) }
            else if (e.key === 'Escape') { e.preventDefault(); close() }
          }}
        />
        <div id="gw-jump-list" role="listbox" aria-label="What you can jump to" className="gw-jump-list">
          {ordered.length === 0 && <p className="gw-jump-none">Nothing matches that. Try part of a name.</p>}
          {GROUPS.map(g => {
            const rows = ordered.filter(i => i.kind === g.kind)
            if (rows.length === 0) return null
            return (
              <div key={g.kind} role="group" aria-label={g.heading}>
                <div className="gw-jump-h" aria-hidden>{g.heading}</div>
                {rows.map(item => {
                  const i = ordered.indexOf(item)
                  return (
                    <div
                      key={item.id}
                      id={`gw-jump-${item.id}`}
                      role="option"
                      aria-selected={i === at}
                      className={`gw-jump-item${i === at ? ' on' : ''}`}
                      onMouseEnter={() => setAt(i)}
                      onClick={() => go(item)}
                    >
                      <b>{item.label}</b>
                      {item.detail && <span>{item.detail}</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
