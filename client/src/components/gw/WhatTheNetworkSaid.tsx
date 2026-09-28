/**
 * WHAT A HUNDRED SEPARATE ACCOUNTS ADD UP TO.
 *
 * The report this product draws is an alignment report - a shared picture, agreements, the gap, one
 * question - and that is the right shape for two people and the wrong one for a hundred
 * organisations who have never met. This renders the second read the API writes beside it when
 * enough separate accounts came in: where they want to grow, what matters, who they need to reach,
 * what they cannot see, what they already have, how they choose who to trust, what went wrong, how
 * the kinds of organisation differ, where they want different things, and where this could help.
 *
 * See a-hundred-accounts-are-not-two.ts on the API for the shape and for what it is forbidden to
 * invent. Every claim here carries how many accounts said it, because on a hundred accounts a
 * finding without a count is an assertion nobody can check.
 *
 * EVERY SECTION IS OPTIONAL AND AN EMPTY ONE IS NOT DRAWN. The model is told to leave a section
 * empty rather than fill it, so an empty array is a true answer and drawing a heading over nothing
 * would turn that honesty back into a gap in the page.
 */
import { ShowAFew } from './a-long-list-is-not-a-page'

type Said = { who?: string[]; howMany?: number }

const H: React.CSSProperties = {
  fontSize: 13, letterSpacing: '.1px',
  color: 'var(--gw-muted)', margin: '18px 0 8px', fontWeight: 700,
}
const CARD: React.CSSProperties = {
  background: 'white', border: '1px solid var(--gw-border)', borderRadius: 10,
  padding: '11px 13px', marginBottom: 8,
}
const LEAD: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--gw-navy)' }
const BODY: React.CSSProperties = { fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.6, marginTop: 3 }
const QUIET: React.CSSProperties = { fontSize: 12, color: 'var(--gw-sub)', lineHeight: 1.55, marginTop: 3 }

/** How many accounts stand behind a line. The count is the claim's evidence, so it is never hidden. */
function HowMany({ said }: { said?: Said }) {
  const n = said?.howMany ?? said?.who?.length ?? 0
  if (!n) return null
  return <span style={{ fontSize: 11.5, color: 'var(--gw-muted)', marginLeft: 6, whiteSpace: 'nowrap' }}>{n} {n === 1 ? 'account' : 'accounts'}</span>
}

function Band({ title, rows, few = 6, what, render }: {
  title: string; rows: any[] | undefined; few?: number; what: string; render: (r: any) => React.ReactNode
}) {
  if (!rows?.length) return null
  return (
    <>
      <div style={H}>{title}</div>
      <ShowAFew rows={rows} few={few} what={what}>
        {(r: any, i: number) => <div key={i} style={CARD}>{render(r)}</div>}
      </ShowAFew>
    </>
  )
}

export function WhatTheNetworkSaid({ picture }: { picture: any }) {
  if (!picture || typeof picture !== 'object') return null
  const p = picture

  return (
    <section aria-label="What the accounts add up to" style={{ marginTop: 6 }}>
      {p.thePicture && (
        <div style={{ ...CARD, borderLeft: '3px solid var(--gw-blue-b)' }}>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--gw-text)', whiteSpace: 'pre-wrap' }}>{p.thePicture}</div>
        </div>
      )}

      <Band title="Where they want to grow" rows={p.whereTheyWantToGrow} what="places" render={(r) => (
        <>
          <div style={LEAD}>{r.place}<HowMany said={r.said} /></div>
          <div style={BODY}>{r.whatTheyWantThere}</div>
          {r.whatIsStoppingThem && <div style={QUIET}>In the way: {r.whatIsStoppingThem}</div>}
        </>
      )} />

      <Band title="What matters, and at what volume" rows={p.whatMatters} what="products" render={(r) => (
        <>
          <div style={LEAD}>{r.thing}<HowMany said={r.said} /></div>
          {r.volumesAndSeasons && <div style={BODY}>{r.volumesAndSeasons}</div>}
          {r.qualityThatDecidesIt && <div style={QUIET}>What decides a delivery: {r.qualityThatDecidesIt}</div>}
        </>
      )} />

      <Band title="Who they need to reach" rows={p.whoTheyNeedToReach} what="kinds of people" render={(r) => (
        <>
          <div style={LEAD}>{r.actor}<HowMany said={r.said} /></div>
          <div style={BODY}>{r.whatFor}</div>
          {r.howManyOrWhere && <div style={QUIET}>{r.howManyOrWhere}</div>}
        </>
      )} />

      <Band title="What they cannot see" rows={p.dataTheyNeed} what="things" render={(r) => (
        <>
          <div style={LEAD}>{r.whatTheyCannotSee}<HowMany said={r.said} /></div>
          {r.whatTheyWouldDoWithIt && <div style={BODY}>{r.whatTheyWouldDoWithIt}</div>}
        </>
      )} />

      <Band title="What they already have" rows={p.whatTheyAlreadyHave} what="things" render={(r) => (
        <div style={LEAD}>{r.what}<HowMany said={r.said} /></div>
      )} />

      <Band title="How they choose who to work with" rows={p.howTheyChooseWhoToWorkWith} what="ways" render={(r) => (
        <div style={LEAD}>{r.how}<HowMany said={r.said} /></div>
      )} />

      <Band title="What went wrong, and what they will not repeat" rows={p.whatWentWrong} what="things" render={(r) => (
        <>
          <div style={LEAD}>{r.whatHappened}<HowMany said={r.said} /></div>
          {r.whatTheyWillNotRepeat && <div style={QUIET}>Will not repeat: {r.whatTheyWillNotRepeat}</div>}
        </>
      )} />

      <Band title="How the kinds of organisation differ" rows={p.byKindOfOrganisation} few={8} what="kinds" render={(r) => (
        <>
          <div style={LEAD}>{r.kind}<HowMany said={r.said} /></div>
          <div style={BODY}>{r.whatTheyWant}</div>
          <div style={QUIET}>Different from the rest: {r.howTheyDifferFromTheRest}</div>
        </>
      )} />

      <Band title="Where they want different things" rows={p.whereTheyWantDifferentThings} what="disagreements" render={(r) => (
        <>
          <div style={LEAD}>{r.topic}</div>
          <div style={BODY}>{r.onePosition}</div>
          <div style={BODY}>{r.theOther}</div>
          {r.whyItMatters && <div style={QUIET}>Why it matters: {r.whyItMatters}</div>}
        </>
      )} />

      <Band title="Where this could be useful" rows={p.whereThisCouldBeUseful} what="openings" render={(r) => (
        <>
          <div style={LEAD}>{r.opportunity}<HowMany said={r.said} /></div>
          <div style={BODY}>For: {r.whoItServes}</div>
          <div style={QUIET}>What it would take: {r.whatItWouldTake}</div>
        </>
      )} />

      {/* THE GAPS, DRAWN AS PLAINLY AS THE FINDINGS. A reader who cannot see what these accounts
          could not answer will read the silence as an answer. */}
      {!!p.whatNobodySaid?.length && (
        <>
          <div style={H}>What nobody said</div>
          <div style={{ ...CARD, background: 'var(--gw-bg)' }}>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--gw-sub)', lineHeight: 1.7 }}>
              {p.whatNobodySaid.map((g: string, i: number) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        </>
      )}

      {!!p.whatToAskNextTime?.length && (
        <>
          <div style={H}>What to ask next time</div>
          <div style={CARD}>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--gw-text)', lineHeight: 1.7 }}>
              {p.whatToAskNextTime.map((q: string, i: number) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
