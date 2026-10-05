import { whatTellsItApart } from '@/lib/tell-apart-the-same-name'

/**
 * WHAT "JUMP TO" OFFERS, AND ONLY WHAT THE READER CAN ALREADY SEE (A1).
 *
 *   Check-ins   the list the server already returns to this person, nothing else.
 *   People      the named people in those check-ins, as the list already carries them, each going to
 *               the check-in they are in. Never somebody from outside the reader's own check-ins,
 *               never the reader, and never by their address: a person with no name on record is
 *               left out rather than named from an address the check-in may be hiding from peers.
 *               There is no page for a person yet, so a person is found by the check-in they share.
 *   Pages       the doors `navItemsFor` gives this person, the same gate as the sidebar.
 *
 * Nothing here fetches. It reads what is already on the screen, so it cannot widen what anybody sees.
 */
export type JumpKind = 'checkin' | 'person' | 'page'
export interface JumpItem {
  kind: JumpKind
  id: string
  /** What the person reads. */
  label: string
  /** A second line, where one helps: which check-in a person is in. */
  detail?: string
  to: string
}

interface GroundLike {
  id: string
  label: string
  startsAt?: string | null
  createdAt?: string | null
  participants?: {
    id: string
    userId?: string | null
    user?: { firstName?: string | null; lastName?: string | null } | null
    nameGiven?: string | null
  }[]
}

const nameOf = (p: NonNullable<GroundLike['participants']>[number]) =>
  ([p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim())

/** The page names as the sidebar says them. */
const PAGE_NAMES: Record<string, string> = { '/settings': 'Your settings', '/grounds': 'All check-ins' }

export function whatYouCanJumpTo(
  list: GroundLike[],
  me: string | null | undefined,
  pages: { label: string; to: string }[],
): JumpItem[] {
  /* Walkthrough pass 2, item 1: two check-ins can share a label, with nothing in the list to tell
     a reader which is which. When that happens here, the one thing the list itself can say -
     when each one started - goes in the detail line, the same spot a person's row already uses
     for "In <check-in>". */
  const checkIns: JumpItem[] = list.map(g => ({ kind: 'checkin', id: `c-${g.id}`, label: g.label, detail: whatTellsItApart(list, g) ?? undefined, to: `/grounds/${g.id}` }))
  const people: JumpItem[] = []
  for (const g of list) {
    for (const p of g.participants ?? []) {
      if (me && p.userId === me) continue
      const name = nameOf(p)
      if (!name) continue
      people.push({ kind: 'person', id: `p-${g.id}-${p.id}`, label: name, detail: `In ${g.label}`, to: `/grounds/${g.id}` })
    }
  }
  const doors: JumpItem[] = pages.map(p => ({ kind: 'page', id: `g-${p.to}`, label: PAGE_NAMES[p.to] ?? p.label, to: p.to }))
  return [...checkIns, ...people, ...doors]
}

/** The ones whose name, or the check-in a person is in, contains what was typed. */
export function matching(items: JumpItem[], typed: string): JumpItem[] {
  const q = typed.trim().toLowerCase()
  if (!q) return items.filter(i => i.kind !== 'person')
  return items.filter(i => i.label.toLowerCase().includes(q) || (i.detail ?? '').toLowerCase().includes(q))
}
