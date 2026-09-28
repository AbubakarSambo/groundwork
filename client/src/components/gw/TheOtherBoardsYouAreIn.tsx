import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'

/**
 * THE OTHER BOARDS YOU ARE IN, WITHOUT GOING BACK TO THE LIST TO FIND THEM.
 *
 * A board is per check-in and there was no way to move between them: read one, go back to the
 * check-in list, find the next, open it, open its board. For somebody running several teams that
 * is the difference between the board being a page you land on and a place you work.
 *
 * IT ONLY OFFERS BOARDS THAT EXIST. Eight of the twenty-two situations have none - the sensing
 * family and the one-off - and the server says which, because working it out here would mean a
 * second copy of the map that decides it. A switcher that let somebody pick a board and then told
 * them there was not one is a door into a wall.
 *
 * And it is not drawn at all for somebody with one board, because a chooser with one thing in it is
 * a label pretending to be a control.
 *
 * U.10 PICTURE-CHECK ROUND 6, ITEM A: MOVED, AND RESTYLED FOR THE CREAM PAGE.
 *
 * This used to sit above the board's own dark header, styled for it (near-white text on a faint
 * white fill) - once the board became cream (U.10 fifth round), the same pill sat above the
 * breadcrumb with its text nearly invisible, and the prototype has nothing there at all
 * (board-as-lead.jpg/board-as-participant.jpg). It is real, valuable navigation - not the
 * check-in's own switcher, a genuinely different control - so rather than delete it, it is drawn
 * where the prototype's own tab row has an empty slot: beside "Views ▾" (which nothing in the
 * product answers yet), restyled for a light ground. `TheCheckInHeader` renders it there via its
 * `trailing` prop.
 */
export function TheOtherBoardsYouAreIn({ groundId }: { groundId: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  /* The same query the check-in list uses, so arriving here from it costs nothing. */
  const { data: grounds = [] } = useQuery({
    queryKey: ['grounds'],
    queryFn: groundsApi.list,
    staleTime: 30_000,
  })

  const withBoards = (grounds as any[]).filter((g) => g.hasBoard !== false)
  const here = withBoards.find((g) => g.id === groundId)
  const others = withBoards.filter((g) => g.id !== groundId)
  if (others.length === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, maxWidth: 220,
          background: 'white', border: '1px solid var(--gw-border)', color: 'var(--gw-text)',
          borderRadius: 8, padding: '6px 10px', fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {here?.label ?? 'This board'}
        </span>
        <span aria-hidden style={{ color: 'var(--gw-sub)' }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', zIndex: 20, top: 'calc(100% + 6px)', right: 0, minWidth: 260, maxWidth: 360,
            background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10, padding: 6,
            boxShadow: '0 10px 30px rgba(20,24,40,.18)', maxHeight: 320, overflowY: 'auto',
          }}
        >
          {others.map((g) => (
            <button
              key={g.id}
              role="option"
              aria-selected={false}
              onClick={() => { setOpen(false); navigate(`/grounds/${g.id}/board`) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none',
                color: 'var(--gw-text)', fontSize: 12.5, padding: '8px 10px', borderRadius: 7,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ fontWeight: 600 }}>{g.label}</div>
              {/* What the last round found, the same line the check-in list leads with. */}
              {g.latestFinding && (
                <div style={{ color: 'var(--gw-sub)', fontSize: 11.5, lineHeight: 1.4, marginTop: 2 }}>
                  {String(g.latestFinding).slice(0, 90)}{String(g.latestFinding).length > 90 ? '…' : ''}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
