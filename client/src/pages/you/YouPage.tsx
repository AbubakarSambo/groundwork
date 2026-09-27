import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { youApi, type YourBoard } from '@/api/you'
import { myDataApi } from '@/api/my-data'
import { useAuthStore } from '@/stores/auth'
import { Button, NeedsYouList, NeedsYouRow, Tag } from '@/components/gw/kit'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { WhereYouStandFromSuggestions } from '@/components/gw/Suggestions'

/**
 * THE YOU BOARD (C2, #/you). The wording is copied from docs/prototype/screens/C2-the-you-board/
 * you-board-miriam.txt, you-board-wairimu.txt, you-board-daniel.txt and you-board-kwame.txt.
 *
 * ONLY YOU READ IT, AND THE SERVER DECIDES THAT (GET /you): it serves the signed-in person their own
 * board and refuses anybody who asks for someone else's. The page adds nothing to what it is given.
 *
 * NOT SAID HERE, ON PURPOSE:
 *   - "Only you, and the people who run your check-ins, see it." under "Your board". The page is
 *     yours alone, and your to-dos are never seen by anybody else, so the sentence would not be true.
 *   - "Everything asked of you this week" and "Share with your lead": that is your load across
 *     check-ins, which is private unless you share it, and nothing yet holds the requests or the
 *     sharing (D3, U.16).
 *   - "Say what’s behind it" and "Stop sharing automatically", on something Groundwork noticed:
 *     they wait for the engine to serve what it noticed (request 14).
 * "Where you stand" from Groundwork's suggestions about you, with "Add my side" and "Appeal this
 * decision", is drawn when the server serves one (C3, U.13).
 * The engine's own parts (where you stand, worth knowing now, what Groundwork noticed, coaching
 * followed over time, what you contributed, what keeps coming up) are drawn only when served.
 */
export function YouPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['you'],
    queryFn: youApi.get,
    enabled: !!user,
    staleTime: 30_000,
  })

  return (
    <div className="gw-you">
      <h1 className="gw-t-title gw-you-h1">You</h1>
      <p className="gw-you-sub">What’s yours, across your check-ins. Only you see this page.</p>

      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        <div role="alert" className="gw-you-quiet">
          <p className="gw-t-body">Your board did not load. Nothing you have written is affected.</p>
          <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
        </div>
      )}
      {data && <TheBoard b={data} />}
    </div>
  )
}

function TheBoard({ b }: { b: YourBoard }) {
  const nothingYet = b.checkIns.length === 0 && b.todos.length === 0
  return (
    <>
      <h2 className="gw-t-h2 gw-you-h2">Your board</h2>
      {nothingYet && <p className="gw-t-body gw-you-quiet">You are not in any check-in yet.</p>}

      <WhereYouStandFromSuggestions items={b.suggestionsAboutYou ?? []} />

      {b.whereYouStand?.says && (
        <section className="gw-you-card" aria-labelledby="you-stand-h">
          <h3 id="you-stand-h" className="gw-t-h3">Where you stand</h3>
          <p>{b.whereYouStand.says}</p>
          {b.whereYouStand.whatWouldChangeIt && <p>What would change this: {b.whereYouStand.whatWouldChangeIt}</p>}
          {b.whereYouStand.decision && <p>{b.whereYouStand.decision}</p>}
        </section>
      )}

      {(b.worthKnowing?.length || b.noticed?.says || b.coachingOverTime) ? (
        <div className="gw-you-grid gw-you-grid-2">
          {!!b.worthKnowing?.length && (
            <Card title="Worth knowing now">{b.worthKnowing.map(s => <p key={s}>{s}</p>)}</Card>
          )}
          {b.noticed?.says && (
            <Card title="Something Groundwork noticed about your work">
              <p>{b.noticed.says}</p>
              {b.noticed.whoSees && <p className="gw-you-quiet">{b.noticed.whoSees}</p>}
            </Card>
          )}
          {b.coachingOverTime && <Card title="Coaching, followed over time"><p>{b.coachingOverTime}</p></Card>}
        </div>
      ) : null}

      {(b.goals.length > 0 || b.todos.length > 0 || !!b.contributed?.length) && (
        <div className="gw-you-grid">
          {b.goals.length > 0 && (
            <Card title="Your goals">
              <ul className="gw-you-list">{b.goals.map(g => <li key={g.id}>{g.says}</li>)}</ul>
            </Card>
          )}
          {b.todos.length > 0 && (
            <Card title="Your to-dos">
              <ul className="gw-you-list">
                {b.todos.map(t => <li key={t.id}>{t.text}{t.when ? <span className="gw-you-quiet"> {t.when}</span> : null}</li>)}
              </ul>
            </Card>
          )}
          {!!b.contributed?.length && (
            <Card title="What you contributed">
              <ul className="gw-you-list">{b.contributed.map(c => <li key={c}>{c}</li>)}</ul>
            </Card>
          )}
        </div>
      )}

      {b.coaching && (
        <section className="gw-you-card" aria-labelledby="you-coaching-h">
          <h3 id="you-coaching-h" className="gw-t-h3">Coaching</h3>
          <p>{b.coaching.says}</p>
        </section>
      )}

      {b.turns.length > 0 && (
        <section className="gw-you-section" aria-label="Your turn">
          <NeedsYouList label="Your turn">
            {b.turns.map(t => (
              <NeedsYouRow
                key={t.key}
                kind="decide"
                title={t.title}
                detail={t.detail ?? undefined}
                actions={<Button size="small" to={t.action.to}>{t.action.label}</Button>}
              />
            ))}
          </NeedsYouList>
        </section>
      )}

      {b.saidYoudDo.length > 0 && (
        <section className="gw-you-section" aria-labelledby="you-said-h">
          <div className="gw-you-section-head">
            <h2 id="you-said-h" className="gw-t-h2">What you said you’d do</h2>
            <span className="gw-t-small">From every check-in</span>
          </div>
          <ul className="gw-you-rows">
            {b.saidYoudDo.map(s => (
              <li key={s.id} className="gw-you-row gw-you-row-said">
                <b>{s.text}</b>
                <span>{s.checkIn}</span>
                <span>{s.when ?? ''}</span>
                <span><Tag tone={s.state === 'kept' ? 'proven' : 'plain'}>{s.stateSays}</Tag></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!!b.keepsComingUp?.length && (
        <section className="gw-you-section" aria-labelledby="you-coming-h">
          <div className="gw-you-section-head">
            <h2 id="you-coming-h" className="gw-t-h2">Something that keeps coming up</h2>
            <span className="gw-t-small">About your part in the work</span>
          </div>
          {b.keepsComingUp.map(k => (
            <div key={k.title} className="gw-you-card gw-you-card-warm">
              <h3 className="gw-t-h3">{k.title}</h3>
              <p>{k.says}</p>
            </div>
          ))}
        </section>
      )}

      {(b.ownReports.length > 0 || b.checkIns.length > 0) && (
        <div className="gw-you-grid gw-you-grid-2">
          {b.ownReports.length > 0 && (
            <section aria-labelledby="you-reports-h">
              <h2 id="you-reports-h" className="gw-t-h2 gw-you-h2-small">Your own reports</h2>
              <ul className="gw-you-rows">
                {b.ownReports.map(r => (
                  <li key={r.to} className="gw-you-row gw-you-row-report">
                    <b>{r.checkIn}</b>
                    <span>{whenItWas(r.at, 'dayAndMonth')}</span>
                    <Link to={r.to}>Read</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {b.checkIns.length > 0 && (
            <section aria-labelledby="you-each-h">
              <h2 id="you-each-h" className="gw-t-h2 gw-you-h2-small">Your work in each</h2>
              <ul className="gw-you-rows">
                {b.checkIns.map(c => (
                  <li key={c.id} className="gw-you-row gw-you-row-each">
                    <div><b>{c.label}</b>{c.line && <div className="gw-you-quiet">{c.line}</div>}</div>
                    <Link to={c.to}>Open</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <YourData />
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="gw-you-card">
      <h3 className="gw-t-h3">{title}</h3>
      {children}
    </section>
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
    <section className="gw-you-card gw-you-data" aria-label="Your data">
      <p>Everything you’ve written, in every check-in, as one file.</p>
      <Button kind="secondary" onClick={download} disabled={busy}>Download it</Button>
      {failed && <p role="alert" className="gw-you-quiet">Your file did not download. Try again.</p>}
    </section>
  )
}
