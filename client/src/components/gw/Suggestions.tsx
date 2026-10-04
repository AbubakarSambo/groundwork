import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  suggestionsApi,
  isForTheLead,
  type AppealForAnAdmin,
  type SuggestionForTheLead,
  type SuggestionForThePerson,
  type TheAppealDecision,
} from '@/api/suggestions'
import { Button } from '@/components/gw/kit'
/* WhereYouStand (the You board's own reader, group 2 piece 2) uses the shared Button and Panel's
   own CSS classes, in place of the old kit and YouPage's page-local gw-you-* classes, since YouPage
   no longer defines them for its own use. ASuggestionForTheLead and AnAppealToDecide, on the lead's
   board and Today, are unchanged. */
import { Button as UIButton, Stack } from '@/components/gw/ui'

/**
 * A VERDICT, TOLD LIKE A SIGNAL (C3, U.13; decisions rule 6). Three views of one suggestion, each
 * drawing only what the server served that reader. The wording is copied from
 * docs/prototype/screens/C3-suggestions-and-appeals/suggestion-daniel.txt, suggestion-kwame.txt and
 * what-daniel-sees.txt. Where no screen has words (after a decision, the forms, an appeal, an
 * admin's view), the fewest plain words are used; they are listed in docs/morning-report-ui.md
 * under U.13.
 *
 * No label is ever drawn on a person, and the verdict is never sent to this screen at all.
 *
 * PRIMARY-BUTTONS-NEVER-TOGETHER: this file writes four primary buttons - "Agree"
 * (`ASuggestionForTheLead`, deciding, mode 'none'), "Save my decision" (the same component, mode
 * not 'none' - the two are alternate states of one `mode` value, never rendered together), "Save"
 * or "Send my appeal" (`WhereYouStand`, the person's own board), and "Save" (`AnAppealToDecide`,
 * an admin's Today page). The last three each belong to a different reader on a different page -
 * a lead's board, a participant's You board, an admin's Today - so no two of this file's primary
 * buttons ever appear on the same screen at once.
 */

const cardClass = 'gwui-fs-13-5 gwui-ink-text gwui-pt-16 gwui-pr-18 gwui-pb-16 gwui-pl-18 gwui-mb-18'
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: 12, lineHeight: 1.6, borderStyle: 'solid', borderWidth: 2, borderColor: 'var(--gw-text)' }
const h3Class = 'gwui-fs-16 gwui-mb-8'
const h3Style: React.CSSProperties = { fontWeight: 800 }
const subClass = 'gwui-fs-13 gwui-mt-12 gwui-mb-2'
const subStyle: React.CSSProperties = { fontWeight: 700 }
const quietClass = 'gwui-fs-13 gwui-ink-sub gwui-mt-4 gwui-mb-4'
const quoteClass = 'gwui-pt-10 gwui-pr-14 gwui-pb-10 gwui-pl-14 gwui-mt-10 gwui-mb-10'
const quoteStyle: React.CSSProperties = { background: 'var(--gw-bg)', borderRadius: 10 }
const fieldClass = 'gwui-rule gwui-fs-13 gwui-pt-9 gwui-pr-11 gwui-pb-9 gwui-pl-11 gwui-mt-4'
const fieldStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', borderRadius: 8, fontFamily: 'inherit', lineHeight: 1.5 }
const rowClass = 'gwui-gap-8 gwui-mt-10'
const rowStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap' }

function Said({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <div className={quoteClass} style={quoteStyle}>
      <div className={quietClass}>{who}</div>
      <div className="gwui-mt-4">“{children}”</div>
    </div>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="gwui-mt-6 gwui-mb-6"><b>{label}</b> {children}</div>
}

function TheAppealOutcome({ d, yours }: { d: TheAppealDecision; yours?: boolean }) {
  return (
    <>
      <div className="gwui-mt-12 gwui-mb-2"><b>{d.by} decided {yours ? 'your' : 'the'} appeal.</b> {d.says}</div>
      <div className={subClass} style={subStyle}>{d.by}’s reasons</div>
      <div>{d.reasons}</div>
    </>
  )
}

const DIDNT_SAVE = 'That did not save. What you wrote is still here, so you can try again.'

/* ============================================================================ the lead */

/**
 * For the lead who runs the check-in: "Groundwork suggests …", why, what would change it, the
 * person's own answer, and "Your decision". On the board, the suggestions that are not about how
 * the check-in ends; on the ending page, the ones that are. Anybody else reads nothing here: the
 * person reads theirs on their own You board, and an admin reads appeals on Today.
 */
export function SuggestionsForTheLead({ groundId, where }: { groundId: string; where: 'board' | 'ending' }) {
  const { data } = useQuery({
    queryKey: ['suggestions', groundId],
    queryFn: () => suggestionsApi.onCheckIn(groundId),
    retry: false,
  })
  const mine = (data?.suggestions ?? [])
    .filter(isForTheLead)
    .filter(s => (where === 'ending') === s.aboutTheEnding)
  if (!mine.length) return null
  return <>{mine.map(s => <ASuggestionForTheLead key={s.id} s={s} groundId={groundId} />)}</>
}

function ASuggestionForTheLead({ s, groundId }: { s: SuggestionForTheLead; groundId: string }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'none' | 'agree' | 'else'>('none')
  const [changing, setChanging] = useState(false)
  const [decision, setDecision] = useState('')
  const [choice, setChoice] = useState<string>('')
  const [reasons, setReasons] = useState('')
  const [failed, setFailed] = useState(false)
  const save = useMutation({
    mutationFn: (body: { decision: string; reasons: string }) => suggestionsApi.decide(s.id, body),
    /* What was written stays in the form, and the person is told it did not save. */
    onError: () => setFailed(true),
    onSuccess: () => {
      setFailed(false)
      setMode('none')
      setChanging(false)
      setReasons('')
      qc.invalidateQueries({ queryKey: ['suggestions', groundId] })
    },
  })
  const who = s.aboutName
  const SOMETHING_ELSE = 'Something else'
  const chosen = mode === 'agree' ? decision.trim() : choice === SOMETHING_ELSE || !s.otherChoices.length ? decision.trim() : choice
  const deciding = !s.decision || changing

  function open(m: 'agree' | 'else') {
    setMode(m)
    setDecision(m === 'agree' ? (s.ifYouAgree ?? '') : '')
    setChoice(m === 'else' && s.otherChoices.length ? s.otherChoices[0] : '')
  }

  return (
    <section className={cardClass} style={cardStyle} aria-label={s.headline}>
      <h3 className={h3Class} style={h3Style}>{s.headline}</h3>
      <Labelled label="Why:">{s.why}</Labelled>
      {s.whatWouldChangeIt && <Labelled label="What would change this:">{s.whatWouldChangeIt}</Labelled>}
      {s.theirOwnAnswer && <Said who={`${who}’s own answer.`}>{s.theirOwnAnswer}</Said>}

      {s.decision && !changing && (
        <>
          <div className={subClass} style={subStyle}>Your decision</div>
          <div>{s.decision.says}</div>
          <div className={subClass} style={subStyle}>Your reasons</div>
          <div>{s.decision.reasons}</div>
          <div className={quietClass}>{who} sees your decision and your reasons, and can appeal.</div>
        </>
      )}

      {s.theirSide && <Said who={`${who}’s side`}>{s.theirSide}</Said>}

      {s.appeal && !s.appealDecision && (
        <>
          <Said who={`${who} has appealed`}>{s.appeal.says}</Said>
          <div className={quietClass}>An admin decides the appeal.</div>
        </>
      )}
      {s.appealDecision && <TheAppealOutcome d={s.appealDecision} />}

      {deciding && mode === 'none' && (
        <>
          <div className={subClass} style={subStyle}>Your decision</div>
          <div>This is only a suggestion. You decide, and {who} sees your reasons.</div>
          <div className={rowClass} style={rowStyle}>
            <Button onClick={() => open('agree')}>Agree</Button>
            <Button kind="secondary" onClick={() => open('else')}>Choose something else</Button>
            {changing && <Button kind="quiet" onClick={() => setChanging(false)}>Not yet</Button>}
          </div>
        </>
      )}

      {deciding && mode !== 'none' && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (chosen && reasons.trim()) save.mutate({ decision: chosen, reasons: reasons.trim() }) }}
          className="gwui-mt-12"
        >
          {mode === 'else' && s.otherChoices.length > 0 && (
            <fieldset className="gwui-rule-none gwui-p-0 gwui-mb-8">
              <legend className={subClass} style={subStyle}>Your decision</legend>
              {[...s.otherChoices, SOMETHING_ELSE].map(c => (
                <label key={c} className="gwui-gap-8 gwui-mt-4" style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="radio" name={`choice-${s.id}`} value={c} checked={choice === c} onChange={() => setChoice(c)} /> {c}
                </label>
              ))}
            </fieldset>
          )}
          {(mode === 'agree' || choice === SOMETHING_ELSE || !s.otherChoices.length) && (
            <label className="gwui-mb-8" style={{ display: 'block' }}>
              <span className={subClass} style={subStyle}>{mode === 'else' && s.otherChoices.length ? 'What you decided' : 'Your decision'}</span>
              <input value={decision} onChange={(e) => setDecision(e.target.value)} maxLength={1000} className={fieldClass} style={fieldStyle} />
            </label>
          )}
          <label style={{ display: 'block' }}>
            <span className={subClass} style={subStyle}>Your reasons, in a sentence or two</span>
            <textarea value={reasons} onChange={(e) => setReasons(e.target.value)} rows={3} maxLength={2000} className={fieldClass} style={fieldStyle} />
          </label>
          <div className={rowClass} style={rowStyle}>
            <Button type="submit" disabled={!chosen || !reasons.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save my decision'}
            </Button>
            <Button kind="quiet" onClick={() => { setMode('none'); setChanging(false) }}>Not yet</Button>
          </div>
          {failed && <div role="alert" className={quietClass}>{DIDNT_SAVE}</div>}
        </form>
      )}

      {s.decision && !changing && s.mayChangeTheDecision && (
        <div className={rowClass} style={rowStyle}><Button kind="quiet" size="small" onClick={() => setChanging(true)}>Change my decision</Button></div>
      )}
    </section>
  )
}

/* ============================================================================ the person */

/**
 * For the person it is about, on their own You board: "Where you stand", the facts about their
 * work, what would change this, and the decision with its reasons once there is one. They can add
 * their side, and appeal a decision.
 */
export function WhereYouStandFromSuggestions({ items }: { items: SuggestionForThePerson[] }) {
  if (!items.length) return null
  return <>{items.map(s => <WhereYouStand key={s.id} s={s} />)}</>
}

function WhereYouStand({ s }: { s: SuggestionForThePerson }) {
  const qc = useQueryClient()
  const [writing, setWriting] = useState<'none' | 'side' | 'appeal'>('none')
  const [text, setText] = useState('')
  const [failed, setFailed] = useState(false)
  const done = () => { setFailed(false); setWriting('none'); setText(''); qc.invalidateQueries({ queryKey: ['you'] }) }
  /* On failure, what was written stays in the box, and the person is told it did not save. */
  const side = useMutation({ mutationFn: (t: string) => suggestionsApi.addSide(s.id, t), onSuccess: done, onError: () => setFailed(true) })
  const appeal = useMutation({ mutationFn: (t: string) => suggestionsApi.appeal(s.id, t), onSuccess: done, onError: () => setFailed(true) })
  const lead = s.leadName
  const busy = side.isPending || appeal.isPending

  return (
    <section className="gwui-panel gwui-panel-pad" aria-label="Where you stand" style={{ borderStyle: 'solid', borderWidth: 2, borderColor: 'var(--gw-text)' }}>
      <h3 className={h3Class} style={h3Style}>Where you stand</h3>
      <div className={quietClass}>About your work in {s.checkIn.label}.</div>
      <div>{s.facts}</div>
      {s.whatWouldChangeIt && <div><b>What would change this:</b> {s.whatWouldChangeIt}</div>}

      {s.decision ? (
        <div className={quoteClass} style={quoteStyle}>
          <div style={{ fontWeight: 700 }}>{lead}’s decision</div>
          <div className="gwui-mt-2 gwui-mb-8">{s.decision.says}</div>
          <div style={{ fontWeight: 700 }}>{lead}’s reasons</div>
          <div className="gwui-mt-2">{s.decision.reasons}</div>
        </div>
      ) : (
        <div className={quietClass}>{lead} has not decided anything yet. You will see the decision and the reasons here.</div>
      )}

      {s.yourSide && <Said who="Your side">{s.yourSide}</Said>}
      {s.yourAppeal && !s.appealDecision && <div><b>You appealed.</b> An admin decides. You will see the answer here.</div>}
      {s.appealDecision && <TheAppealOutcome d={s.appealDecision} yours />}

      {writing === 'none' && (
        <div className={rowClass} style={rowStyle}>
          <UIButton kind="secondary" size="small" onClick={() => { setWriting('side'); setText(s.yourSide ?? '') }}>
            {s.yourSide ? 'Change my side' : 'Add my side'}
          </UIButton>
          {s.mayAppeal && <UIButton kind="quiet" size="small" onClick={() => { setWriting('appeal'); setText('') }}>Appeal this decision</UIButton>}
        </div>
      )}

      {writing !== 'none' && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) (writing === 'side' ? side : appeal).mutate(text.trim()) }}
          className="gwui-mt-10"
        >
          <Stack gap={6}>
            {writing === 'appeal' && (
              <div>An admin looks at the decision, the facts and your reasons, and decides. {lead} sees that you appealed.</div>
            )}
            {writing === 'side' && <div>{lead} sees this next to the facts.</div>}
            <label style={{ display: 'block' }}>
              <span className={subClass} style={subStyle}>{writing === 'side' ? 'Your side' : 'Why do you disagree?'}</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} className={fieldClass} style={fieldStyle} />
            </label>
          </Stack>
          <div className={rowClass} style={rowStyle}>
            <UIButton type="submit" size="small" disabled={!text.trim() || busy}>
              {busy ? 'Saving…' : writing === 'side' ? 'Save' : 'Send my appeal'}
            </UIButton>
            <UIButton kind="quiet" size="small" onClick={() => { setWriting('none'); setText('') }}>Not yet</UIButton>
          </div>
          {failed && <div role="alert" className={quietClass}>{DIDNT_SAVE}</div>}
        </form>
      )}
    </section>
  )
}

/* ============================================================================ an admin */

/** For an admin, on Today: every appeal still to decide in their organisation. */
export function AppealsToDecide() {
  const { data } = useQuery({ queryKey: ['appeals'], queryFn: suggestionsApi.appealsToDecide, retry: false })
  const appeals = data?.appeals ?? []
  if (!appeals.length) return null
  return (
    <section aria-labelledby="appeals-h" className="gw-today-section">
      <h2 id="appeals-h" className="gw-t-h2">Appeals to decide</h2>
      {appeals.map(a => <AnAppealToDecide key={a.id} a={a} />)}
    </section>
  )
}

function AnAppealToDecide({ a }: { a: AppealForAnAdmin }) {
  const qc = useQueryClient()
  const [outcome, setOutcome] = useState<'stands' | 'changed' | null>(null)
  const [reasons, setReasons] = useState('')
  const [failed, setFailed] = useState(false)
  const save = useMutation({
    mutationFn: () => suggestionsApi.decideAppeal(a.id, { outcome: outcome!, reasons: reasons.trim() }),
    onError: () => setFailed(true),
    onSuccess: () => { setFailed(false); qc.invalidateQueries({ queryKey: ['appeals'] }) },
  })
  return (
    <div className={`${cardClass} gwui-rule gwui-mt-10`} style={{ background: cardStyle.background, borderRadius: cardStyle.borderRadius, lineHeight: cardStyle.lineHeight }}>
      <h3 className={h3Class} style={h3Style}>{a.aboutName} appealed {a.leadName}’s decision</h3>
      <div className={quietClass}>In {a.checkIn.label}.</div>
      <Stack gap={6}>
        <div className="gwui-mt-6">{a.headline}</div>
        <Labelled label="Why:">{a.why}</Labelled>
        {a.whatWouldChangeIt && <Labelled label="What would change this:">{a.whatWouldChangeIt}</Labelled>}
      </Stack>
      {a.theirOwnAnswer && <Said who={`${a.aboutName}’s own answer.`}>{a.theirOwnAnswer}</Said>}
      {a.decision && (
        <>
          <div className={subClass} style={subStyle}>{a.leadName}’s decision</div>
          <div>{a.decision.says}</div>
          <div className={subClass} style={subStyle}>{a.leadName}’s reasons</div>
          <div>{a.decision.reasons}</div>
        </>
      )}
      {a.theirSide && <Said who={`${a.aboutName}’s side`}>{a.theirSide}</Said>}
      <Said who={`${a.aboutName}’s appeal`}>{a.appeal.says}</Said>

      {!a.mayDecide && <div className={quietClass}>You made this decision, so another admin decides the appeal.</div>}
      {a.mayDecide && !outcome && (
        <div className={rowClass} style={rowStyle}>
          <Button kind="secondary" size="small" onClick={() => setOutcome('stands')}>Keep the decision</Button>
          <Button kind="quiet" size="small" onClick={() => setOutcome('changed')}>Change the decision</Button>
        </div>
      )}
      {a.mayDecide && outcome && (
        <form onSubmit={(e) => { e.preventDefault(); if (reasons.trim()) save.mutate() }} className="gwui-mt-10">
          <div className={subClass} style={subStyle}>{outcome === 'stands' ? 'Keep the decision' : 'Change the decision'}</div>
          <Stack gap={6}>
            <div>{a.aboutName} and {a.leadName} both read your reasons.</div>
            <label style={{ display: 'block' }}>
              <span className={subClass} style={subStyle}>Your reasons</span>
              <textarea value={reasons} onChange={(e) => setReasons(e.target.value)} rows={3} maxLength={2000} className={fieldClass} style={fieldStyle} />
            </label>
          </Stack>
          <div className={rowClass} style={rowStyle}>
            <Button type="submit" size="small" disabled={!reasons.trim() || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
            <Button kind="quiet" size="small" onClick={() => { setOutcome(null); setReasons('') }}>Not yet</Button>
          </div>
          {failed && <div role="alert" className={quietClass}>{DIDNT_SAVE}</div>}
        </form>
      )}
    </div>
  )
}
