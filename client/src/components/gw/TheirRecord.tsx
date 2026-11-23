import { Section, EdgeList, EdgeRow, Text } from '@/components/gw/ui'
import type { ThePersonsRecordServed } from '@/api/grounds'

/**
 * A PERSON'S RECORD AND THE COACHING GROUNDWORK GAVE THEM (Groundwork does the managing, part 1), as the server serves it: on My work
 * (the person's own, or the lead's view of one person). Every sentence is the server's (api board/the-persons-record-in-words.ts);
 * who may read it is decided there, so nothing here hides anything. Drawn only where the payload carries it, which is only where the
 * organisation's direct morning is on.
 *
 * One section, one row a part (the design system, journey 4, 23 November 2026). It used to be a fold of folds, which on a rebuilt
 * page opened every line at once under its own small heading; now each part is a row with its sentence, what would change it, and
 * the moments it rests on, the same as every other list on My work.
 */
export function TheirRecord({ record }: { record: ThePersonsRecordServed }) {
  const lines = (l: string[]) => l.map((x) => <Text key={x} size="secondary" as="p">{x}</Text>)
  return (
    <div data-gw-their-record>
      <Section heading={record.heading} note={record.note || undefined}>
        <EdgeList label={record.heading}>
          {record.parts.map((p) => (
            <EdgeRow
              key={p.heading}
              reason={null}
              title={p.heading}
              detail={<>
                <Text size="body" as="p">{p.says}</Text>
                {p.toChange && <Text size="body" as="p"><b>{p.toChange}</b></Text>}
                {lines(p.evidence)}
              </>}
            />
          ))}
          {(record.coaching.length > 0 || !!record.coachingEmpty) && (
            <EdgeRow
              reason={null}
              title="Coaching from Groundwork"
              detail={record.coaching.length === 0
                ? <Text size="body" as="p">{record.coachingEmpty}</Text>
                : record.coaching.map((c) => (
                  <div key={c.said}>
                    <Text size="body" as="p">{c.said}</Text>
                    <Text size="secondary" as="p">{c.since}</Text>
                  </div>
                ))}
            />
          )}
          {record.fromYourLead && record.fromYourLead.lines.length > 0 && (
            <EdgeRow reason={null} title={record.fromYourLead.heading} detail={lines(record.fromYourLead.lines)} />
          )}
          {record.acrossYourCheckIns && record.acrossYourCheckIns.lines.length > 0 && (
            <EdgeRow reason={null} title={record.acrossYourCheckIns.heading} detail={lines(record.acrossYourCheckIns.lines)} />
          )}
        </EdgeList>
      </Section>
    </div>
  )
}
