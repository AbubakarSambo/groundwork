import { Section, Panel, EdgeList, EdgeRow } from '@/components/gw/ui'
import { TheNudgeButton } from './TheNudgeButton'
import type { ANudgeServed } from '@/api/board'
import './pictured-board.css'

/**
 * THE LEAD'S MORNING, READ ON HER BOARD (api engagement/the-direct-morning.ts, `theMorning`). The server serves it to the lead who runs
 * the check-in alone, with her organisation's switch on. Its four parts are no longer one block above the board (Hafsah, 24 October);
 * each line is drawn once, where it belongs on the board:
 *  - what needs her, inside the board's own What needs you, only where the board has no item for the same thing (`about.ref`);
 *  - what is closing (who to chase, what is due this week), as its own short section on the first screen;
 *  - each team line on that person's row of The team today (`about.participantId`), or, on a board with no such rows, under its heading.
 * Nothing here is worded on the screen: every sentence is the server's.
 */
type Any = any

export type AMorningPartKey = 'target' | 'needsYou' | 'closing' | 'team'

export interface AMorningLineOnTheBoard {
  text: string
  row: { title: string; detail?: string } | null
  ref: string | null
  participantId: string | null
}

/** One part of the morning as served, or null where it was not served. */
export function aMorningPart(b: Any, key: AMorningPartKey): Any | null {
  return ((b?.theMorning?.parts ?? []) as Any[]).find((p: Any) => p.key === key) ?? null
}

/** Each line of a part, with its board row, the board item it says and the person it is about. */
export function theMorningLines(b: Any, key: AMorningPartKey): AMorningLineOnTheBoard[] {
  const part = aMorningPart(b, key)
  return ((part?.lines ?? []) as string[]).map((text, i) => ({
    text,
    row: part?.rows?.[i] ?? null,
    ref: part?.about?.[i]?.ref ?? null,
    participantId: part?.about?.[i]?.participantId ?? null,
  }))
}

/** What needs her in the morning, less every line whose item the board itself draws (one source for each thing). */
export function theMorningNeedsNotOnTheBoard(b: Any, drawn: ReadonlySet<string>): AMorningLineOnTheBoard[] {
  return theMorningLines(b, 'needsYou').filter((l) => !l.ref || !drawn.has(l.ref))
}

/** "Nothing needs you today.", where the server says it, for a board that has nothing else that needs her. */
export function nothingNeedsYou(b: Any): string | null {
  return aMorningPart(b, 'needsYou')?.none ?? null
}

/** What is closing: the deals about to close, who to chase, or what is due this week, under the server's own heading or the board's. */
export function WhatIsClosing({ b, heading }: { b: Any; heading?: string }) {
  const part = aMorningPart(b, 'closing')
  const lines = theMorningLines(b, 'closing')
  if (!part || !lines.length) return null
  return (
    <Section heading={heading ?? part.heading}>
      <Panel>{lines.map((l) => <p className="gwui-panel-text" key={l.text}>{l.text}</p>)}</Panel>
    </Section>
  )
}

/** The morning's team lines and "Nudge Peter" buttons, for a board with no row per person (the collections and matter boards). */
export function YourTeamToday({ b }: { b: Any }) {
  const part = aMorningPart(b, 'team')
  const lines = theMorningLines(b, 'team')
  const nudges: ANudgeServed[] = b?.theMorning?.nudges ?? []
  if (!lines.length && !nudges.length) return null
  return (
    <Section heading={part?.heading ?? 'Your team today'}>
      <Panel>
        {lines.map((l) => <p className="gwui-panel-text" key={l.text}>{l.text}</p>)}
        {nudges.length > 0 && (
          <div className="pb-nudges">
            {nudges.map((n) => <TheNudgeButton key={n.participantId} groundId={b.theMorning.groundId} nudge={n} />)}
          </div>
        )}
      </Panel>
    </Section>
  )
}

/** The morning's needs lines as rows of a board's What needs you, the server's short row where it gives one. */
export function TheMorningNeedsAsRows({ lines }: { lines: AMorningLineOnTheBoard[] }) {
  if (!lines.length) return null
  return (
    <EdgeList label="What needs you today">
      {lines.map((l) => <EdgeRow key={l.text} kind="look" title={l.row?.title ?? l.text} detail={l.row?.detail} />)}
    </EdgeList>
  )
}
