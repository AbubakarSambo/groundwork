import { useQuery } from '@tanstack/react-query'
import { todosApi } from '@/api/suites'
import type { TodoList } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Page, PageTitle, Section, Button, Note, Empty, RowList, Row } from '@/components/gw/ui'

/**
 * TO-DOS (E8, #/suite/todos, group 2 piece 4). What each reader is given is the server's (GET
 * /suites/todos/board): only lines they may already read in the check-in each came from, for an admin
 * everybody, for a lead their own team and themselves, and nobody else.
 *
 * DECISION 110, P8 (docs/decisions-merged.md, docs/known-issues.md): an admin sees to-dos by
 * check-in, never one person's to-dos gathered across check-ins into a list for that person -
 * decision 4 keeps a person's load across check-ins private, even from an admin. Request 176 asks
 * the engine to serve `checkIns` directly; until it does, `people` (still the server's shape today)
 * is regrouped by check-in here, on the screen, so nobody reads a section headed by a person's name
 * or a count that gathers their to-dos together.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (crumbs, subtitle), `Section` for each
 * check-in, `RowList`/`Row` for its to-dos, and `Note`/`Empty` for loading, error and empty states.
 * No new parts were needed.
 *
 * WORDING (docs/prototype/screens/E-suites/suite-todos.txt): the prototype's "Everything people
 * said they will do, from every check-in and chat, in one list for each person." is changed in two
 * ways, both ruled out by what the product actually does. "In their check-ins" replaces "from every
 * check-in and chat" (item 28: a person's own to-dos from chat stay theirs alone, nobody else's
 * board). "In each check-in" replaces "in one list for each person" (decision 110, P8: this board
 * groups by check-in, never by person).
 *
 * Each to-do reads as "<first name> said they would <the to-do, lower-cased>, on <date>.", unless
 * the check-in's own name already ends with that date ("Help a new hire get started, from 27
 * September"), in which case the date is not said twice.
 *
 * LEFT OUT (item 28): "Done" on each line, because whether it was done is asked in the person's next
 * check-in and counts in its record, so a board must not change it; and "How people use it", because
 * "Remind me" in chat adds to the person's own list, which nobody else reads (request 27).
 *
 * WORDING NO SCREEN SHOWS (item 28): "Nobody has anything on their list yet." and "The board did not
 * load."
 */
const onDay = (day: string) => whenItWas(new Date(`${day}T00:00:00.000Z`), 'dayAndMonthLong', 'UTC')

const decapitalise = (text: string) => (text.length ? text[0].toLowerCase() + text.slice(1) : text)

/** "Miriam said they would visit Westgate Deli on Friday, on 24 September.", unless the check-in's
 *  own name already ends with that date ("Help a new hire get started, from 27 September"), in
 *  which case the date is not said twice. */
const todoSentence = (firstName: string, text: string, checkIn: string, on: string) => {
  const day = onDay(on)
  const said = `${firstName} said they would ${decapitalise(text)}`
  return checkIn.trim().endsWith(day) ? `${said}.` : `${said}, on ${day}.`
}

interface ACheckIn { id: string; name: string; todos: { id: string; text: string; on: string; person: { name: string; firstName: string } }[] }

/** Regroups the server's per-person shape into one list per check-in, in the order each check-in
 *  is first met. Dropped once the engine serves `checkIns` itself (request 176). */
function byCheckIn(people: TodoList['people']): ACheckIn[] {
  const order: string[] = []
  const byName = new Map<string, ACheckIn>()
  for (const p of people) {
    for (const t of p.todos) {
      let ci = byName.get(t.checkIn)
      if (!ci) {
        ci = { id: t.checkIn, name: t.checkIn, todos: [] }
        byName.set(t.checkIn, ci)
        order.push(t.checkIn)
      }
      ci.todos.push({ id: t.id, text: t.text, on: t.on, person: { name: p.name, firstName: p.firstName } })
    }
  }
  return order.map(name => byName.get(name)!)
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
  const checkIns = data ? (data.checkIns ?? byCheckIn(data.people)) : []

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'To-dos' }]}
        title="To-dos"
        subtitle="Everything people said they will do, in each check-in. Nobody has to write it down twice."
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

      {data && checkIns.length === 0 && <Empty>Nobody has anything on their list yet.</Empty>}
      {data && checkIns.map(ci => (
        <Section key={ci.id} heading={ci.name}>
          <RowList label={ci.name}>
            {ci.todos.map(t => (
              <Row key={t.id} columns="minmax(0, 1fr)">
                <p>{todoSentence(t.person.firstName, t.text, ci.name, t.on)}</p>
              </Row>
            ))}
          </RowList>
        </Section>
      ))}
    </Page>
  )
}
