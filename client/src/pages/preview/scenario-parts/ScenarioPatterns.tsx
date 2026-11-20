import { Tag, type TagTone } from '@/components/gw/ui'

/**
 * PATTERN LINES (prototype: loans.jpg "One person, a place, or the model?"): each a coloured bar down its left, a bold
 * title, one sentence, and a tag at the right end that says what kind of pattern it is.
 */
export function ScenarioPatterns({ items, label }: { items: { title: string; text: string; tag: string; tone: string }[]; label: string }) {
  return (
    <ul className="gwui-scn-patterns" aria-label={label}>
      {items.map((p) => (
        <li key={p.title} className={`gwui-scn-pattern gwui-scn-pattern-${p.tone}`}>
          <div className="gw-min0">
            <h3 className="gwui-scn-pattern-h">{p.title}</h3>
            <p className="gwui-panel-text-muted">{p.text}</p>
          </div>
          <Tag tone={p.tone as TagTone}>{p.tag}</Tag>
        </li>
      ))}
    </ul>
  )
}
