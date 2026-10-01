import { useQuery } from '@tanstack/react-query'
import { todosApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Button, Note, Empty, RowList, Row } from '@/components/gw/ui'

/**
 * TO-DOS (E8, #/suite/todos, group 2 piece 4). What each reader is given is the server's (GET
 * /suites/todos/board): only lines they may already read in the check-in each came from, for an admin
 * everybody, for a lead their own team and themselves, and nobody else. The wording follows
 * docs/prototype/screens/E-suites/suite-todos.txt: each person's name and each line. Group 2's review
 * (fault B) changed the source line from "From her check-in, 24 September" to "From {first name}'s
 * check-in in {check-in}, on {date}.": the prototype's "her" assumes a pronoun nothing in the product
 * records, so the person's own first name is used instead, and the check-in itself is now named,
 * since a person is often in more than one. Where the check-in's own name already ends with that
 * date ("Help a new hire get started, from 27 September"), ", on 27 September" is left off rather
 * than said twice (sourceLine, below).
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (crumbs, subtitle), `Section` for each person,
 * `RowList`/`Row` for their lines, and `Note`/`Empty` for loading, error and empty states. No new
 * parts were needed.
 *
 * ONE PROTOTYPE LINE IS CHANGED, because it would not be true (item 28): "Everything people said they
 * will do, from every check-in and chat, in one list for each person." says "in their check-ins", since
 * a person's own to-dos from chat stay theirs alone.
 *
 * LEFT OUT (item 28): "Done" on each line, because whether it was done is asked in the person's next
 * check-in and counts in its record, so a board must not change it; and "How people use it", because
 * "Remind me" in chat adds to the person's own list, which nobody else reads (request 27).
 *
 * WORDING NO SCREEN SHOWS (item 28): "Nobody has anything on their list yet." and "The board did not
 * load."
 */
const onDay = (day: string) => whenItWas(new Date(`${day}T00:00:00.000Z`), 'dayAndMonthLong', 'UTC')

/** "From Juma's check-in in Sales team, Q3, on 27 September.", unless the check-in's own name
 *  already ends with that date ("Help a new hire get started, from 27 September"), in which case
 *  the date is not said twice. */
const sourceLine = (firstName: string, checkIn: string, on: string) => {
  const day = onDay(on)
  return checkIn.trim().endsWith(day)
    ? `From ${firstName}’s check-in in ${checkIn}.`
    : `From ${firstName}’s check-in in ${checkIn}, on ${day}.`
}

export function TodosPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-todos'],
    queryFn: todosApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'To-dos' }]}
        title="To-dos"
        subtitle="Everything people said they will do in their check-ins, in one list for each person. Nobody has to write it down twice."
      />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error">{refused.data?.message ?? 'Only an admin or a lead can open this board.'}</Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && data.people.length === 0 && <Empty>Nobody has anything on their list yet.</Empty>}
      {data && data.people.map(p => (
        <Section key={p.name} heading={p.name}>
          <RowList label={p.name}>
            {p.todos.map(t => (
              <Row key={t.id} columns="minmax(0, 1fr)">
                <div>
                  <b>{t.text}</b>
                  <p className="gwui-panel-text-muted">{sourceLine(p.firstName, t.checkIn, t.on)}</p>
                </div>
              </Row>
            ))}
          </RowList>
        </Section>
      ))}
    </Page>
  )
}
