import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi, type AReview } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { Button, Mark } from '@/components/gw/kit'

/**
 * ONE PERFORMANCE REVIEW (E4, #/suite/reviews/:id, U.17). The wording is copied from the review in
 * docs/prototype/screens/E-suites/suite-reviews.txt: "What Groundwork noticed", "Proof first.
 * Anything only said is marked.", "What Wairimu writes", "Aisha’s own view" and "No scores. Wairimu
 * and Aisha talk it through, and Wairimu decides." The decision uses the words of the suggestions
 * part (U.13): "Your decision", "Your reasons, in a sentence or two", "Save my decision".
 *
 * WHAT EACH READER IS GIVEN IS THE SERVER'S (GET /suites/reviews/:id). The person it is about reads
 * the facts, their own view and the decision with its reasons, never the manager's words (item 28),
 * and writes their own view. The person who writes it with them writes their own words and decides.
 * An admin or a lead of the team reads it. Everybody else is refused by the server.
 *
 * NOT DRAWN HERE, ON PURPOSE: Groundwork's suggestion ("Groundwork suggests recognising Aisha’s
 * work"). A suggestion belongs to a check-in today, not to a review; the engine is asked for one
 * that belongs to a review (request 23).
 *
 * WORDING NO SCREEN SHOWS (item 28): "Your review, March"; "What you write"; "Your own view";
 * "Groundwork has not written this part yet."; "... has not written anything yet."; "... has not
 * written their view yet."; "The decision"; "The reasons"; "... sees your decision and your reasons.";
 * "Save"; "The review did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const monthOf = (day: string) => whenItWas(new Date(`${day}T00:00:00.000Z`), 'month', 'UTC')

export function ReviewPage() {
  const { id = '' } = useParams()
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-review', id],
    queryFn: () => reviewsApi.one(id),
    enabled: !!user && !!id,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <div className="gw-you gw-suites">
      {data && data.reader !== 'person' && (
        <nav className="gw-people-crumb" aria-label="Breadcrumb">
          <Link to="/settings/suites">Suites</Link> / <Link to="/suite/reviews">Performance reviews</Link> / {data.name}
        </nav>
      )}
      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <p role="alert" className="gw-t-body">{refused.data?.message ?? 'You cannot open this review.'}</p>
        ) : (
          <div role="alert" className="gw-you-quiet">
            <p className="gw-t-body">The review did not load.</p>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}
      {data && <TheReview r={data} />}
    </div>
  )
}

function TheReview({ r }: { r: AReview }) {
  const person = r.reader === 'person'
  const writer = r.reader === 'writer'
  const manager = r.writtenWithFirstName
  const title = person ? `Your review, ${monthOf(r.dueOn)}` : `${r.firstName}’s review, ${monthOf(r.dueOn)}`
  const footer = !manager
    ? 'No scores.'
    : person ? `No scores. You and ${manager} talk it through, and ${manager} decides.`
      : writer ? `No scores. You and ${r.firstName} talk it through, and you decide.`
        : `No scores. ${manager} and ${r.firstName} talk it through, and ${manager} decides.`

  return (
    <>
      <h1 className="gw-t-title gw-suites-h1">{title}</h1>

      <div className="gw-review-grid">
        <section className="gw-you-card" aria-labelledby="rv-noticed">
          <h2 id="rv-noticed" className="gw-t-h3">What Groundwork noticed</h2>
          <p className="gw-you-quiet">Proof first. Anything only said is marked.</p>
          {r.noticed.length === 0
            ? <p className="gw-you-quiet">Groundwork has not written this part yet.</p>
            : (
              <ul className="gw-review-noticed">
                {r.noticed.map((n, i) => <li key={i}><Mark mark={n.mark} /><span>{n.says}</span></li>)}
              </ul>
            )}
        </section>

        {!person && (
          <Words
            id="rv-words"
            heading={writer ? 'What you write' : `What ${manager ?? 'the manager'} writes`}
            text={r.managersWords}
            empty={`${writer ? 'You have' : `${manager ?? 'The manager'} has`} not written anything yet.`}
            editable={writer}
            save={(text) => reviewsApi.words(r.id, text)}
            reviewId={r.id}
          />
        )}

        <Words
          id="rv-view"
          heading={person ? 'Your own view' : `${r.firstName}’s own view`}
          text={r.theirView}
          empty={person ? 'You have not written your view yet.' : `${r.firstName} has not written their view yet.`}
          editable={person}
          save={(text) => reviewsApi.view(r.id, text)}
          reviewId={r.id}
        />
      </div>

      <Decision r={r} />

      <p className="gw-you-quiet">{footer}</p>
    </>
  )
}

function Words({ id, heading, text, empty, editable, save, reviewId }: {
  id: string; heading: string; text: string | null; empty: string; editable: boolean; save: (t: string) => Promise<AReview>; reviewId: string
}) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState(text ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const saving = useMutation({
    mutationFn: () => save(draft),
    onSuccess: (r) => { setProblem(null); qc.setQueryData(['suite-review', reviewId], r) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  return (
    <section className="gw-you-card" aria-labelledby={id}>
      <h2 id={id} className="gw-t-h3">{heading}</h2>
      {editable ? (
        <form className="gw-suite-q" onSubmit={e => { e.preventDefault(); if (draft.trim()) saving.mutate() }}>
          <label htmlFor={`${id}-text`} className="gw-sr-only">{heading}</label>
          <textarea id={`${id}-text`} rows={5} value={draft} onChange={e => setDraft(e.target.value)} maxLength={4000} />
          <div><Button kind="secondary" size="small" type="submit" disabled={!draft.trim() || saving.isPending}>Save</Button></div>
          {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
        </form>
      ) : text ? <p className="gw-review-said">“{text}”</p> : <p className="gw-you-quiet">{empty}</p>}
    </section>
  )
}

function Decision({ r }: { r: AReview }) {
  const qc = useQueryClient()
  const [says, setSays] = useState('')
  const [reasons, setReasons] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const saving = useMutation({
    mutationFn: () => reviewsApi.decide(r.id, says.trim(), reasons.trim()),
    onSuccess: (x) => { setProblem(null); qc.setQueryData(['suite-review', r.id], x) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  const writer = r.reader === 'writer'

  if (r.decision) {
    return (
      <section className="gw-you-card" aria-labelledby="rv-decision">
        <h2 id="rv-decision" className="gw-t-h3">{writer ? 'Your decision' : 'The decision'}</h2>
        <p>{r.decision.says}</p>
        <h3 className="gw-t-h3">{writer ? 'Your reasons' : 'The reasons'}</h3>
        <p>{r.decision.reasons}</p>
        {writer && <p className="gw-you-quiet">{r.firstName} sees your decision and your reasons.</p>}
      </section>
    )
  }
  if (!writer) return null
  return (
    <section className="gw-you-card" aria-labelledby="rv-decision">
      <h2 id="rv-decision" className="gw-t-h3">Your decision</h2>
      <form className="gw-suite-ask" onSubmit={e => { e.preventDefault(); if (says.trim() && reasons.trim()) saving.mutate() }}>
        <div className="gw-suite-q">
          <label htmlFor="rv-says">Your decision</label>
          <input id="rv-says" value={says} onChange={e => setSays(e.target.value)} maxLength={1000} />
        </div>
        <div className="gw-suite-q">
          <label htmlFor="rv-reasons">Your reasons, in a sentence or two</label>
          <textarea id="rv-reasons" rows={3} value={reasons} onChange={e => setReasons(e.target.value)} maxLength={2000} />
        </div>
        <div><Button type="submit" disabled={!says.trim() || !reasons.trim() || saving.isPending}>Save my decision</Button></div>
        {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
      </form>
    </section>
  )
}
