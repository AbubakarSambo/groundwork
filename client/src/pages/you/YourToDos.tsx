import { Section, Button, Empty, RowList, Row } from '@/components/gw/ui'
import { useAskStore } from '@/stores/ask'
import type { YourBoard } from '@/api/you'
import { TenAPage } from './TenAPage'

/**
 * YOUR TO-DOS (Hafsah, 21 November 2026: "You does not have your to-do list"). Your own notes to yourself, the list GET /you already
 * serves you alone (`todos`, kept against your directory record). Nobody else reads it. You add one by telling Groundwork in Ask,
 * which is where a to-do is added (assistant.service.ts, addAToDo), so the one button opens Ask.
 */
export function YourToDos({ b }: { b: YourBoard }) {
  const showAsk = useAskStore(s => s.show)
  const todos = b.todos ?? []
  return (
    <Section heading="Your to-dos" action={<Button kind="secondary" size="small" onClick={showAsk}>Add a to-do</Button>}>
      {todos.length === 0 ? (
        <Empty>You have no to-dos open. To add one, tell Groundwork in Ask what you want to remember.</Empty>
      ) : (
        <TenAPage items={todos} label="your to-dos">
          {shown => (
            <RowList label="Your to-dos">
              {shown.map(t => (
                <Row key={t.id} columns="minmax(0, 1fr)">
                  <div>
                    <b>{t.text}</b>
                    {t.when && <p className="gwui-panel-text">{`You want it done ${t.when}.`}</p>}
                  </div>
                </Row>
              ))}
            </RowList>
          )}
        </TenAPage>
      )}
    </Section>
  )
}
