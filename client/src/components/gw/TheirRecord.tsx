import { Section, Panel, Note, Callout, Stack, FoldedLine, Text } from '@/components/gw/ui'
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
        <Stack gap={12}>
          {record.parts.map((p) => (
            <Panel key={p.heading} heading={p.heading}>
              <Stack gap={8}>
                <Text size="14-5" as="p">{p.says}</Text>
                {p.toChange && <Callout tone="info">{p.toChange}</Callout>}
                {p.evidence.length > 0 && (
                  <FoldedLine name="What this is read from">
                    <ul className="gwui-panel-list">
                      {p.evidence.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  </FoldedLine>
                )}
              </Stack>
            </Panel>
          ))}
          {(record.coaching.length > 0 || !!record.coachingEmpty) && <Panel heading="Coaching from Groundwork">
            {record.coaching.length === 0 ? <Note tone="muted">{record.coachingEmpty}</Note> : (
              <ul className="gwui-panel-list">
                {record.coaching.map((c) => (
                  <li key={c.said}>
                    <span>{c.said}</span>
                    <Note tone="muted">{c.since}</Note>
                  </li>
                ))}
              </ul>
            )}
          </Panel>}
          {record.fromYourLead && record.fromYourLead.lines.length > 0 && (
            <Panel heading={record.fromYourLead.heading}>
              <ul className="gwui-panel-list">
                {record.fromYourLead.lines.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </Panel>
          )}
          {record.acrossYourCheckIns && record.acrossYourCheckIns.lines.length > 0 && (
            <Panel heading={record.acrossYourCheckIns.heading}>
              <ul className="gwui-panel-list">
                {record.acrossYourCheckIns.lines.map((l) => <li key={l}>{l}</li>)}
              </ul>
            </Panel>
          )}
        </Stack>
      </Section>
    </div>
  )
}
