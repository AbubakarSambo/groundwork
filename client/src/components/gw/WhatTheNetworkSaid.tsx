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

/*
 * U.10 (e/f): FROM THE SHARED CLASSES, AT THE PROTOTYPE'S OWN SIZES, NOT `React.CSSProperties`
 * CONSTANTS. `H` is a small muted kicker over one band (the prototype's own `.note`, 13.5px);
 * `CARD` a plain white panel; `LEAD` a row's own bold title (16px, navy); `BODY` its line (15px);
 * `QUIET` a note under it (13.5px).
 */
const H = 'gwui-note gwui-mt-18 gwui-mb-8'
const CARD = 'gwui-rule gwui-pt-11 gwui-pr-13 gwui-pb-11 gwui-pl-13 gwui-mb-8'
const LEAD = 'gwui-fs-16 gwui-ink-navy'
const BODY = 'gwui-fs-15 gwui-ink-text gwui-mt-3'
const QUIET = 'gwui-note gwui-mt-3'

/** How many accounts stand behind a line. The count is the claim's evidence, so it is never hidden. */
function HowMany({ said }: { said?: Said }) {
  const n = said?.howMany ?? said?.who?.length ?? 0
  if (!n) return null
  return <span className="gwui-fs-13 gwui-ink-muted gwui-ml-6" style={{ whiteSpace: 'nowrap' }}>{n} {n === 1 ? 'account' : 'accounts'}</span>
}

function Band({ title, rows, few = 6, what, render }: {
  title: string; rows: any[] | undefined; few?: number; what: string; render: (r: any) => React.ReactNode
}) {
  if (!rows?.length) return null
  return (
    <>
      <div className={H}>{title}</div>
      <ShowAFew rows={rows} few={few} what={what}>
        {(r: any, i: number) => <div key={i} className="gwui-rule gwui-pt-11 gwui-pr-13 gwui-pb-11 gwui-pl-13 gwui-mb-8" style={{ background: 'white', borderRadius: 10 }}>{render(r)}</div>}
      </ShowAFew>
    </>
  )
}

export function WhatTheNetworkSaid({ picture }: { picture: any }) {
  if (!picture || typeof picture !== 'object') return null
  const p = picture

  return (
    <section aria-label="What the accounts add up to" className="gwui-mt-6">
      {p.thePicture && (
        <div className={`${CARD} gwui-accent-left-blue`} style={{ background: 'white', borderRadius: 10 }}>
          <div className="gwui-fs-16 gwui-ink-text" style={{ lineHeight: '26px', whiteSpace: 'pre-wrap' }}>{p.thePicture}</div>
        </div>
      )}

      <Band title="Where they want to grow" rows={p.whereTheyWantToGrow} what="places" render={(r) => (
        <>
          <div className={LEAD}>{r.place}<HowMany said={r.said} /></div>
          <div className={BODY}>{r.whatTheyWantThere}</div>
          {r.whatIsStoppingThem && <div className={QUIET}>In the way: {r.whatIsStoppingThem}</div>}
        </>
      )} />

      <Band title="What matters, and at what volume" rows={p.whatMatters} what="products" render={(r) => (
        <>
          <div className={LEAD}>{r.thing}<HowMany said={r.said} /></div>
          {r.volumesAndSeasons && <div className={BODY}>{r.volumesAndSeasons}</div>}
          {r.qualityThatDecidesIt && <div className={QUIET}>What decides a delivery: {r.qualityThatDecidesIt}</div>}
        </>
      )} />

      <Band title="Who they need to reach" rows={p.whoTheyNeedToReach} what="kinds of people" render={(r) => (
        <>
          <div className={LEAD}>{r.actor}<HowMany said={r.said} /></div>
          <div className={BODY}>{r.whatFor}</div>
          {r.howManyOrWhere && <div className={QUIET}>{r.howManyOrWhere}</div>}
        </>
      )} />

      <Band title="What they cannot see" rows={p.dataTheyNeed} what="things" render={(r) => (
        <>
          <div className={LEAD}>{r.whatTheyCannotSee}<HowMany said={r.said} /></div>
          {r.whatTheyWouldDoWithIt && <div className={BODY}>{r.whatTheyWouldDoWithIt}</div>}
        </>
      )} />

      <Band title="What they already have" rows={p.whatTheyAlreadyHave} what="things" render={(r) => (
        <div className={LEAD}>{r.what}<HowMany said={r.said} /></div>
      )} />

      <Band title="How they choose who to work with" rows={p.howTheyChooseWhoToWorkWith} what="ways" render={(r) => (
        <div className={LEAD}>{r.how}<HowMany said={r.said} /></div>
      )} />

      <Band title="What went wrong, and what they will not repeat" rows={p.whatWentWrong} what="things" render={(r) => (
        <>
          <div className={LEAD}>{r.whatHappened}<HowMany said={r.said} /></div>
          {r.whatTheyWillNotRepeat && <div className={QUIET}>Will not repeat: {r.whatTheyWillNotRepeat}</div>}
        </>
      )} />

      <Band title="How the kinds of organisation differ" rows={p.byKindOfOrganisation} few={8} what="kinds" render={(r) => (
        <>
          <div className={LEAD}>{r.kind}<HowMany said={r.said} /></div>
          <div className={BODY}>{r.whatTheyWant}</div>
          <div className={QUIET}>Different from the rest: {r.howTheyDifferFromTheRest}</div>
        </>
      )} />

      <Band title="Where they want different things" rows={p.whereTheyWantDifferentThings} what="disagreements" render={(r) => (
        <>
          <div className={LEAD}>{r.topic}</div>
          <div className={BODY}>{r.onePosition}</div>
          <div className={BODY}>{r.theOther}</div>
          {r.whyItMatters && <div className={QUIET}>Why it matters: {r.whyItMatters}</div>}
        </>
      )} />

      <Band title="Where this could be useful" rows={p.whereThisCouldBeUseful} what="openings" render={(r) => (
        <>
          <div className={LEAD}>{r.opportunity}<HowMany said={r.said} /></div>
          <div className={BODY}>For: {r.whoItServes}</div>
          <div className={QUIET}>What it would take: {r.whatItWouldTake}</div>
        </>
      )} />

      {/* THE GAPS, DRAWN AS PLAINLY AS THE FINDINGS. A reader who cannot see what these accounts
          could not answer will read the silence as an answer. */}
      {!!p.whatNobodySaid?.length && (
        <>
          <div className={H}>What nobody said</div>
          <div className={CARD} style={{ background: 'var(--gw-bg)', borderRadius: 10 }}>
            <ul className="gwui-fs-15 gwui-ink-sub gwui-pl-18 gwui-m-0" style={{ lineHeight: '26px' }}>
              {p.whatNobodySaid.map((g: string, i: number) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        </>
      )}

      {!!p.whatToAskNextTime?.length && (
        <>
          <div className={H}>What to ask next time</div>
          <div className={CARD} style={{ background: 'white', borderRadius: 10 }}>
            <ul className="gwui-fs-15 gwui-ink-text gwui-pl-18 gwui-m-0" style={{ lineHeight: '26px' }}>
              {p.whatToAskNextTime.map((q: string, i: number) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        </>
      )}
    </section>
  )
}
