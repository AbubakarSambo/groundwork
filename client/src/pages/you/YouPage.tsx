import { TheDirectMorning, useTheDirectMorning, isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { youApi, type YourBoard, type YourCheckIn } from '@/api/you'
import { myDataApi } from '@/api/my-data'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import {
  Page, PageTitle, Section, Panel, Button, Tag, Note, Empty, RowList, Row,
} from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { whatTellsItApart } from '@/lib/tell-apart-the-same-name'
import { WhereYouStandFromSuggestions } from '@/components/gw/Suggestions'
import { PatternPanel } from '@/components/gw/ui'

/**
 * THE YOU BOARD (C2, #/you, group 2 piece 2). The wording is copied from
 * docs/prototype/screens/C2-the-you-board/you-board-miriam.txt, you-board-wairimu.txt,
 * you-board-daniel.txt and you-board-kwame.txt - the same board, drawn for four different kinds of
 * person. What changes between them is only how many check-ins this reader has, and whether they
 * run at least one; the sections themselves (where you stand, your goals, what you said you'd do,
 * your own reports) are the same shape for everybody, and each is drawn only when the server serves
 * it.
 *
 * ONLY YOU READ IT, AND THE SERVER DECIDES THAT (GET /you): it serves the signed-in person their own
 * board and refuses anybody who asks for someone else's. The page adds nothing to what it is given.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame, `Section` for every heading with
 * an optional note or trailing sentence, `Panel` (now `as="section"`, `heading`) for each titled
 * card in place of the page's own `Card`, and the new `RowList`/`Row` for the four plain row-lists
 * ("Everything asked of you this week", "What you said you'd do", "Your own reports", "Your work in
 * each"). "Your turn" draws the prototype's own card (`gwui-welcome-card`, the same drawing as
 * Today's admin card) with the first "Start it" navy and the rest white, not the striped `EdgeRow`
 * list "What needs you" uses - see the comment above that block. `PatternPanel` is unchanged - it
 * already was a shared part, and patterns are protected:
 * every field the server serves for this reader's own pattern (`heading`, `whatHappened`,
 * `howOften`, `askThem`, `theirWords`, `canAnswer`, `whoSeesIt`) is still drawn, exactly as before.
 * A pattern's `coachTowards`/`oneStep` are for whoever runs the check-in, never the person it is
 * about (`api/src/modules/patterns/who-reads-a-pattern.ts`) - the client's own `ServedPattern` type
 * does not carry them yet (they belong to the still-pending task for the engine's new pattern
 * shape, docs/tasks-ui.md), so there is nothing here that could show them to the wrong reader, or
 * leave an empty space where they would go.
 *
 * NOT SAID HERE, ON PURPOSE:
 *   - "Only you, and the people who run your check-ins, see it." under "Your board". The page is
 *     yours alone, and your to-dos are never seen by anybody else, so the sentence would not be true.
 *   - "Share with your lead", after "Everything asked of you this week": your load across check-ins
 *     is yours alone, and who may read it once shared is Hafsah's to decide (D3, U.16), so nothing
 *     shares it yet. For the same reason the line under the heading stops at "Only you see this".
 *   - "Say what's behind it" and "Stop sharing automatically", on something Groundwork noticed:
 *     they wait for the engine to serve what it noticed (request 14).
 * "Where you stand" from Groundwork's suggestions about you, with "Add my side" and "Appeal this
 * decision", is drawn when the server serves one (C3, U.13).
 * The engine's own parts (where you stand, worth knowing now, what Groundwork noticed, coaching
 * followed over time, what you contributed) are drawn only when served.
 * "Something that keeps coming up" (you-board-miriam.txt) is `b.patterns`: your own patterns,
 * across every check-in you are in, and nobody else's - see
 * api/src/modules/patterns/who-reads-a-pattern.ts. `.filter(p => p.yours)` below is this page's
 * own check, on top of what the server already withheld, never instead of it.
 */

/** "What's yours..." varies with how many check-ins this reader has, and whether they run one
 *  (you-board-daniel.txt/kwame.txt vs you-board-miriam.txt/wairimu.txt). One check-in or none reads
 *  as the shorter, plainer sentence; more than one names the scope, as the prototype does. */
export function theYouSubtitle(checkIns: YourCheckIn[], direct = false): string {
  /* The direct morning (lib/the-direct-morning.tsx): what the page holds, and no privacy note. Only you may read it either way (the backend's rule). */
  const only = direct ? '' : ' Only you see this page.'
  if (checkIns.length <= 1) return `What’s yours, across your check-ins.${only}`
  const scope = checkIns.some(c => c.youRunIt) ? `all ${checkIns.length} check-ins` : 'every check-in you’re in'
  return `What’s yours across ${scope}: what you said you’d do, your own reports, and what keeps coming up about your part.${only}`
}

export function YouPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['you'],
    queryFn: youApi.get,
    enabled: !!user,
    staleTime: 30_000,
  })
  /* Same query the sidebar already makes (AppShell.tsx), read here for the one thing it carries
     that /you does not: when each check-in started, so two that share a label can be told apart
     (walkthrough pass 2, item 4), the same way the sidebar already does. */
  const grounds = useQuery({ queryKey: ['grounds'], queryFn: groundsApi.list, enabled: !!user })

  const direct = isTheDirectMorningOn(data)
  return (
    <TheDirectMorning on={direct}>
    <Page>
      <PageTitle title="You" subtitle={data ? theYouSubtitle(data.checkIns ?? [], direct) : 'What’s yours, across your check-ins. Only you see this page.'} />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        <div>
          <Note tone="error">Your board did not load. Nothing you have written is affected.</Note>
          <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
        </div>
      )}
      {data && <TheBoard b={data} grounds={grounds.data} />}
    </Page>
    </TheDirectMorning>
  )
}

function TheBoard({ b, grounds }: { b: YourBoard; grounds?: { id: string; startsAt?: string | null; createdAt?: string | null }[] }) {
  /* The direct morning (lib/the-direct-morning.tsx), as said for the page. */
  const direct = useTheDirectMorning()
  const startOf = new Map((grounds ?? []).map(g => [g.id, { startsAt: g.startsAt, createdAt: g.createdAt }]))
  /* "Your work in each" (below) is the one list here that carries each check-in's own id, so it is
     the one list that can reliably be told apart when two share a label - the same check this
     page's sidebar already makes for its own list (tell-apart-the-same-name.ts). */
  const checkIns = b.checkIns ?? []
  const goals = b.goals ?? []
  const todos = b.todos ?? []
  const saidYoudDo = b.saidYoudDo ?? []
  const ownReports = b.ownReports ?? []
  const turns = b.turns ?? []
  const askedOfYouItems = b.askedOfYou?.items ?? []
  const checkInsWithDates = checkIns.map(c => ({ id: c.id, label: c.label, ...startOf.get(c.id) }))
  const nothingYet = checkIns.length === 0 && todos.length === 0
  const myPatterns = (b.patterns ?? []).filter((p) => p.yours !== false)
  /* B-043: an admin who runs check-ins but has never been one's own subject has no goals, no
     to-dos, no reports of their own and nothing Groundwork has noticed about them - so every
     panel this section can hold stays empty, and only "nothingYet" (no check-ins at all) earns
     its own plain sentence. Without this check the "Your board" heading printed with nothing
     under it, then jumped straight to "Your work in each" below. Shown only when there is
     something to put under it. */
  const boardHasContent = nothingYet
    || !!b.suggestionsAboutYou?.length
    || !!b.whereYouStand?.says
    || !!b.worthKnowing?.length
    || !!b.noticed?.says
    || !!b.coachingOverTime
    || goals.length > 0
    || todos.length > 0
    || !!b.contributed?.length
    || !!b.coaching
    || turns.length > 0
  return (
    <>
      {boardHasContent && (
      <Section heading="Your board">
        {nothingYet && <Empty>You are not in any check-in yet.</Empty>}

        <WhereYouStandFromSuggestions items={b.suggestionsAboutYou ?? []} />

        {b.whereYouStand?.says && (
          <Panel as="section" heading="Where you stand">
            <p className="gwui-panel-text">{b.whereYouStand.says}</p>
            {b.whereYouStand.whatWouldChangeIt && <p className="gwui-panel-text">What would change this: {b.whereYouStand.whatWouldChangeIt}</p>}
            {b.whereYouStand.decision && <p className="gwui-panel-text">{b.whereYouStand.decision}</p>}
          </Panel>
        )}

        {(b.worthKnowing?.length || b.noticed?.says || b.coachingOverTime) ? (
          <div className="gwui-cards-2">
            {!!b.worthKnowing?.length && (
              <Panel as="section" heading="Worth knowing now">
                {b.worthKnowing.map(s => <p key={s} className="gwui-panel-text">{s}</p>)}
              </Panel>
            )}
            {b.noticed?.says && (
              <Panel as="section" heading="Something Groundwork noticed about your work">
                <p className="gwui-panel-text">{b.noticed.says}</p>
                {b.noticed.whoSees && <p className="gwui-panel-text-muted">{b.noticed.whoSees}</p>}
              </Panel>
            )}
            {b.coachingOverTime && (
              <Panel as="section" heading="Coaching, followed over time">
                <p className="gwui-panel-text">{b.coachingOverTime}</p>
              </Panel>
            )}
          </div>
        ) : null}

        {(goals.length > 0 || todos.length > 0 || !!b.contributed?.length) && (
          <div className="gwui-cards-3">
            {goals.length > 0 && (
              <Panel as="section" heading="Your goals">
                <ul className="gwui-panel-list">
                  {goals.map(g => (
                    <li key={g.id}>
                      {g.says}
                      {g.checkIn && <p className="gwui-panel-text-muted">{g.checkIn}</p>}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            {todos.length > 0 && (
              <Panel as="section" heading="Your to-dos">
                <ul className="gwui-panel-list">
                  {todos.map(t => <li key={t.id}>{t.text}{t.when ? <span className="gwui-ink-sub"> {t.when}</span> : null}</li>)}
                </ul>
              </Panel>
            )}
            {!!b.contributed?.length && (
              <Panel as="section" heading="What you contributed">
                <ul className="gwui-panel-list">{b.contributed.map(c => <li key={c}>{c}</li>)}</ul>
              </Panel>
            )}
          </div>
        )}

        {b.coaching && (
          <Panel as="section" heading="Coaching">
            <p className="gwui-panel-text">{b.coaching.says}</p>
          </Panel>
        )}

        {turns.length > 0 && (
          <section className="gwui-first-run" aria-label="Your turn">
            {/* THE PROTOTYPE'S OWN CARD (you-board-miriam.jpg: "Your sales check-in closes at 6pm /
                About two minutes." in its own box, a dark 2px inset edge, navy "Start it") - the
                same drawing as Today's admin card (an-admin-lands-on-a-check-in-list.tsx,
                `gwui-welcome-card`), not the striped `EdgeRow` list "What needs you" uses.
                ONE NAVY BUTTON (Hafsah, 30 September; TodayPage.tsx, "only the first 'Start it' is
                navy"): with more than one turn open, only the first "Start it" stays navy - the
                rest are white, the same rule Today applies to its own repeated "Start it". */}
            {turns.map((t, i) => (
              <div key={t.key} className="gwui-welcome-card">
                <div className="gwui-welcome-card-head">
                  <span className="gwui-edge-h">{t.title}</span>
                  <Button
                    kind={t.action.label === 'Start it' && i === turns.findIndex(m => m.action.label === 'Start it') ? 'primary' : 'secondary'}
                    size="small"
                    to={t.action.to}
                  >
                    {t.action.label}
                  </Button>
                </div>
                {t.detail && <p className="gwui-welcome-card-line">{t.detail}</p>}
              </div>
            ))}
          </section>
        )}
      </Section>
      )}

      {!!askedOfYouItems.length && (
        <Section
          heading="Everything asked of you this week"
          note={direct ? 'From every check-in you’re in.' : 'From every check-in you’re in. Only you see this.'}
          foot={b.askedOfYou?.says}
        >
          <RowList label="Everything asked of you this week">
            {askedOfYouItems.map(a => (
              <Row key={a.id} columns="minmax(0, 1fr) minmax(0, 2fr) auto">
                <div>
                  {a.who ? <><b>{a.who}</b><div className="gwui-ink-sub">{a.checkIn}</div></> : <b>{a.checkIn}</b>}
                </div>
                <span>{a.what}</span>
                <span>{a.standing}</span>
              </Row>
            ))}
          </RowList>
        </Section>
      )}

      {saidYoudDo.length > 0 && (
        <Section heading="What you said you’d do" note="From every check-in">
          {/*
            WIDTH CHECK, ITEM 11: AT 1024 THE DUE-DATE WRAPPED ("Tuesday 29\nSeptember"). The
            date's own column shared an even `minmax(0, 1fr)` with "which check-in", so once four
            columns and a gap had to fit the page's narrower 1024px width, a plain date (the
            longest ordinary value this column ever holds) was the one column forced to wrap.
            A 150px floor is room enough for that longest date on one line, taken from the row's
            own shrinking - not from the check-in column beside it, which already holds shorter
            names.
          */}
          <RowList label="What you said you’d do">
            {saidYoudDo.map(s => (
              <Row key={s.id} columns="minmax(0, 2fr) minmax(0, 1fr) minmax(150px, 1fr) auto">
                <b>{s.text}</b>
                <span>{s.checkIn}</span>
                <span>{s.when ?? ''}</span>
                <span><Tag tone={s.state === 'kept' ? 'proven' : 'plain'}>{s.stateSays}</Tag></span>
              </Row>
            ))}
          </RowList>
        </Section>
      )}

      {!!myPatterns.length && (
        <Section heading="Something that keeps coming up" note="About your part in the work">
          {myPatterns.map(p => <PatternPanel key={p.id} pattern={p} invalidateKey={['you']} />)}
        </Section>
      )}

      {(ownReports.length > 0 || checkIns.length > 0) && (
        <div className="gwui-cards-2">
          {ownReports.length > 0 && (
            <Section heading="Your own reports">
              <RowList label="Your own reports">
                {ownReports.map(r => (
                  <Row key={r.to} columns="minmax(0, 1fr) auto auto">
                    <b>{r.checkIn}</b>
                    <span>{whenItWas(r.at, 'dayAndMonthLong')}</span>
                    {/* SCREEN FAULT 10: 30px tall on a phone, below the 40px tap floor -
                        `.gwui-tap-44` (gw-ui.css), the same class YourWork.tsx's own "Read"
                        links already use. */}
                    <Link to={r.to} className="gwui-tap-44">Read</Link>
                  </Row>
                ))}
              </RowList>
            </Section>
          )}
          {checkIns.length > 0 && (
            <Section heading="Your work in each">
              <RowList label="Your work in each">
                {checkIns.map(c => {
                  const apart = whatTellsItApart(checkInsWithDates, checkInsWithDates.find(x => x.id === c.id)!)
                  return (
                    <Row key={c.id} columns="minmax(0, 1fr) auto">
                      <div><b>{apart ? `${c.label}, ${apart}` : c.label}</b>{c.line && <div className="gwui-ink-sub">{c.line}</div>}</div>
                      <Link to={c.to}>Open</Link>
                    </Row>
                  )
                })}
              </RowList>
            </Section>
          )}
        </div>
      )}

      <YourData />
    </>
  )
}

/**
 * "Everything you’ve written, in every check-in, as one file." The same file as "Download all of
 * it" in your settings: what the product holds about you, read from the server as you, saved to
 * your computer. Nothing else is sent anywhere.
 */
function YourData() {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  async function download() {
    setBusy(true)
    setFailed(false)
    try {
      const data = await myDataApi.get()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'groundwork-my-data.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Panel as="section" aria-label="Your data">
      {/* THE PROTOTYPE'S OWN LINE (you-board-miriam.jpg): the sentence and "Download it" sit on one
          line, the button on the right, at 1440 - `gwui-sentence-row` (already shared, SettingsPage's
          "Sign out"), which wraps to its own line on a phone rather than a fixed side-by-side. */}
      <div className="gwui-sentence-row">
        <p className="gwui-panel-text">Everything you’ve written, in every check-in, as one file.</p>
        <Button kind="secondary" onClick={download} disabled={busy}>Download it</Button>
      </div>
      {failed && <p role="alert" className="gwui-panel-text-muted">Your file did not download. Try again.</p>}
    </Panel>
  )
}
