import { Tag, type TagTone } from '@/components/gw/ui'

/**
 * SMALL CARDS OF A SCENARIO BOARD (prototype: loans.jpg "Where the cohort stands", mvnext.jpg "By who they are").
 * CountCards: a title with a count in a tag beside it, and one sentence. GroupCards: a title with a small line beside it
 * ("10, 9 answered"), and a few sentences under.
 */
export function CountCards({ cards, label }: { cards: { title: string; count: string; tone: string; text: string }[]; label: string }) {
  return (
    <ul className="gwui-scn-cards gwui-scn-cards-4" aria-label={label}>
      {cards.map((c) => (
        <li key={c.title} className="panel gwui-scn-card">
          <div className="gwui-scn-card-top">
            <h3 className="gwui-table-lead">{c.title}</h3>
            <Tag tone={c.tone as TagTone}>{c.count}</Tag>
          </div>
          <p className="gwui-panel-text-muted">{c.text}</p>
        </li>
      ))}
    </ul>
  )
}

export function GroupCards({ cards, label }: { cards: { title: string; count: string; lines: string[] }[]; label: string }) {
  return (
    <ul className="gwui-scn-cards gwui-scn-cards-3" aria-label={label}>
      {cards.map((c) => (
        <li key={c.title} className="panel gwui-scn-card">
          <div className="gwui-scn-card-top">
            <h3 className="gwui-table-lead">{c.title}</h3>
            <span className="t-small mut">{c.count}</span>
          </div>
          <ul className="gwui-scn-card-lines">
            {c.lines.map((l) => <li key={l} className="gwui-panel-text">{l}</li>)}
          </ul>
        </li>
      ))}
    </ul>
  )
}
