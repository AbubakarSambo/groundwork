import { Section, Note, Callout, Stack, FoldedLine } from '@/components/gw/ui'
import type { ThePersonsRecordServed } from '@/api/grounds'

/**
 * A PERSON'S RECORD AND THE COACHING GROUNDWORK GAVE THEM (Groundwork does the managing, part 1), as the server serves it: on My work
 * (the person's own, or the lead's view of one person) and in the person's own report. Every sentence is the server's
 * (api board/the-persons-record-in-words.ts); who may read it is decided there, so nothing here hides anything. Drawn only where the
 * payload carries it, which is only where the organisation's direct morning is on.
 */
export function TheirRecord({ record }: { record: ThePersonsRecordServed }) {
  return (
    <div data-gw-their-record>
      <Section heading={record.heading} note={record.note}>
        {/* One folded row per part, divided by thin rules as the prototype's lists are, not a card each. Every sentence is the server's. */}
        <div className="gwui-ruled">
          {record.parts.map((p) => (
            <FoldedLine key={p.heading} name={p.heading} fact={p.says}>
              <Stack gap={8}>
                {p.toChange && <Callout tone="info">{p.toChange}</Callout>}
                {p.evidence.length > 0 && (
                  <ul className="gwui-panel-list">
                    {p.evidence.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                )}
              </Stack>
            </FoldedLine>
          ))}
          {(record.coaching.length > 0 || !!record.coachingEmpty) && (
            <FoldedLine name="Coaching from Groundwork" fact={record.coaching.length === 0 ? record.coachingEmpty : undefined}>
              {record.coaching.length === 0 ? null : (
                <ul className="gwui-panel-list">
                  {record.coaching.map((c) => (
                    <li key={c.said}>
                      <span>{c.said}</span>
                      <Note tone="muted">{c.since}</Note>
                    </li>
                  ))}
                </ul>
              )}
            </FoldedLine>
          )}
          {record.fromYourLead && record.fromYourLead.lines.length > 0 && (
            <FoldedLine name={record.fromYourLead.heading}>
              <ul className="gwui-panel-list">
                {record.fromYourLead.lines.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </FoldedLine>
          )}
          {record.acrossYourCheckIns && record.acrossYourCheckIns.lines.length > 0 && (
            <FoldedLine name={record.acrossYourCheckIns.heading}>
              <ul className="gwui-panel-list">
                {record.acrossYourCheckIns.lines.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </FoldedLine>
          )}
        </div>
      </Section>
    </div>
  )
}
