import './gw-ui.css'

/**
 * EVIDENCE DOT (prototype: the small marks at the start of a line on the example boards in
 * docs/prototype/screens/G1-example-check-ins/, matter.jpg and loans.jpg). It says how far a line can be trusted:
 *   shown   a filled green round: a document, a system or a photo shows it
 *   said    a dark ring: someone says it, or believes it
 *   client  an outlined navy square: the client says it
 *   decided a filled navy square: it has been decided
 *   unknown a faint ring: not known yet
 * Decorative: the line beside it says the same thing in words, and `EvidenceKey` writes the meanings out.
 */
export type EvidenceKind = 'shown' | 'said' | 'client' | 'decided' | 'unknown'

const CLASS: Record<EvidenceKind, string> = {
  shown: 'gwui-table-dot gwui-table-dot-on',
  said: 'gwui-table-dot',
  client: 'gwui-table-dot gwui-evd-sq gwui-evd-client',
  decided: 'gwui-table-dot gwui-evd-sq gwui-evd-decided',
  unknown: 'gwui-table-dot gwui-evd-faint',
}

export function EvidenceDot({ kind }: { kind: EvidenceKind | string }) {
  return <span aria-hidden className={CLASS[kind as EvidenceKind] ?? CLASS.said} />
}

/** The legend: each mark, then what it means, in the order the board gives them. */
export function EvidenceKey({ items }: { items: { kind: string; label: string }[] }) {
  return (
    <ul className="gwui-evd-key" aria-label="What each mark means">
      {items.map((i) => <li key={i.label}><EvidenceDot kind={i.kind} />{i.label}</li>)}
    </ul>
  )
}
