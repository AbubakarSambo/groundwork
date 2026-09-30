import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import './ui/gw-ui.css'

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
 *
 * BOARD REVIEW, 30 SEPTEMBER: rebuilt from the shared parts to join `REBUILT_PAGES` - the trigger
 * and each option read at 12.5px, a finding's own line at 11.5px, both below the prototype's own
 * 13px floor. Everything here is one fixed, light-ground look (no dark/light toggle like the
 * board's own header), so it needs no `--gwui-*` custom property, only plain classes.
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
    <div className="gwui-boards-switcher">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="gwui-boards-trigger"
      >
        <span className="gwui-boards-trigger-label">
          {here?.label ?? 'This board'}
        </span>
        <span aria-hidden className="gwui-boards-trigger-caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div role="listbox" className="gwui-boards-menu">
          {others.map((g) => (
            <button
              key={g.id}
              role="option"
              aria-selected={false}
              onClick={() => { setOpen(false); navigate(`/grounds/${g.id}/board`) }}
              className="gwui-boards-option"
            >
              <div className="gwui-boards-option-title">{g.label}</div>
              {/* What the last round found, the same line the check-in list leads with. */}
              {g.latestFinding && (
                <div className="gwui-boards-option-finding">
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
