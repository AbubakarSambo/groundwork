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

/**
 * A VERDICT, TOLD LIKE A SIGNAL (C3, U.13; decisions rule 6). Three views of one suggestion, each
 * drawing only what the server served that reader. The wording is copied from
 * docs/prototype/screens/C3-suggestions-and-appeals/suggestion-daniel.txt, suggestion-kwame.txt and
 * what-daniel-sees.txt. Where no screen has words (after a decision, the forms, an appeal, an
 * admin's view), the fewest plain words are used; they are listed in docs/morning-report-ui.md
 * under U.13.
 *
 * No label is ever drawn on a person, and the verdict is never sent to this screen at all.
 */

const card: React.CSSProperties = {
  background: 'white', border: '2px solid var(--gw-text)', borderRadius: 12, padding: '16px 18px',
  margin: '0 0 18px', lineHeight: 1.6, fontSize: 13.5, color: 'var(--gw-text)',
}
const h3: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: '0 0 8px' }
const sub: React.CSSProperties = { fontSize: 13, fontWeight: 700, margin: '12px 0 2px' }
const quiet: React.CSSProperties = { fontSize: 12.5, color: 'var(--gw-sub)', margin: '4px 0' }
const quote: React.CSSProperties = { background: 'var(--gw-bg)', borderRadius: 10, padding: '10px 14px', margin: '10px 0' }
const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--gw-border)',
  fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5, marginTop: 4,
}
const row: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }

function Said({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <div style={quote}>
      <div style={quiet}>{who}</div>
      <p style={{ margin: '4px 0 0' }}>“{children}”</p>
    </div>
  )
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return <p style={{ margin: '6px 0' }}><b>{label}</b> {children}</p>
}

function TheAppealOutcome({ d, yours }: { d: TheAppealDecision; yours?: boolean }) {
  return (
    <>
      <p style={{ margin: '12px 0 2px' }}><b>{d.by} decided {yours ? 'your' : 'the'} appeal.</b> {d.says}</p>
      <div style={sub}>{d.by}’s reasons</div>
      <p style={{ margin: 0 }}>{d.reasons}</p>
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
    <section style={card} aria-label={s.headline}>
      <h3 style={h3}>{s.headline}</h3>
      <Labelled label="Why:">{s.why}</Labelled>
      {s.whatWouldChangeIt && <Labelled label="What would change this:">{s.whatWouldChangeIt}</Labelled>}
      {s.theirOwnAnswer && <Said who={`${who}’s own answer.`}>{s.theirOwnAnswer}</Said>}

      {s.decision && !changing && (
        <>
          <div style={sub}>Your decision</div>
          <p style={{ margin: 0 }}>{s.decision.says}</p>
          <div style={sub}>Your reasons</div>
          <p style={{ margin: 0 }}>{s.decision.reasons}</p>
          <p style={quiet}>{who} sees your decision and your reasons, and can appeal.</p>
        </>
      )}

      {s.theirSide && <Said who={`${who}’s side`}>{s.theirSide}</Said>}

      {s.appeal && !s.appealDecision && (
        <>
          <Said who={`${who} has appealed`}>{s.appeal.says}</Said>
          <p style={quiet}>An admin decides the appeal.</p>
        </>
      )}
      {s.appealDecision && <TheAppealOutcome d={s.appealDecision} />}

      {deciding && mode === 'none' && (
        <>
          <div style={sub}>Your decision</div>
          <p style={{ margin: 0 }}>This is only a suggestion. You decide, and {who} sees your reasons.</p>
          <div style={row}>
            <Button onClick={() => open('agree')}>Agree</Button>
            <Button kind="secondary" onClick={() => open('else')}>Choose something else</Button>
            {changing && <Button kind="quiet" onClick={() => setChanging(false)}>Not yet</Button>}
          </div>
        </>
      )}

      {deciding && mode !== 'none' && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (chosen && reasons.trim()) save.mutate({ decision: chosen, reasons: reasons.trim() }) }}
          style={{ marginTop: 12 }}
        >
          {mode === 'else' && s.otherChoices.length > 0 && (
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 8px' }}>
              <legend style={sub}>Your decision</legend>
              {[...s.otherChoices, SOMETHING_ELSE].map(c => (
                <label key={c} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0' }}>
                  <input type="radio" name={`choice-${s.id}`} value={c} checked={choice === c} onChange={() => setChoice(c)} /> {c}
                </label>
              ))}
            </fieldset>
          )}
          {(mode === 'agree' || choice === SOMETHING_ELSE || !s.otherChoices.length) && (
            <label style={{ display: 'block', margin: '0 0 8px' }}>
              <span style={sub}>{mode === 'else' && s.otherChoices.length ? 'What you decided' : 'Your decision'}</span>
              <input value={decision} onChange={(e) => setDecision(e.target.value)} maxLength={1000} style={field} />
            </label>
          )}
          <label style={{ display: 'block' }}>
            <span style={sub}>Your reasons, in a sentence or two</span>
            <textarea value={reasons} onChange={(e) => setReasons(e.target.value)} rows={3} maxLength={2000} style={field} />
          </label>
          <div style={row}>
            <Button type="submit" disabled={!chosen || !reasons.trim() || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save my decision'}
            </Button>
            <Button kind="quiet" onClick={() => { setMode('none'); setChanging(false) }}>Not yet</Button>
          </div>
          {failed && <p role="alert" style={quiet}>{DIDNT_SAVE}</p>}
        </form>
      )}

      {s.decision && !changing && s.mayChangeTheDecision && (
        <div style={row}><Button kind="quiet" size="small" onClick={() => setChanging(true)}>Change my decision</Button></div>
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
    <section className="gw-you-card" aria-label="Where you stand" style={{ border: '2px solid var(--gw-text)' }}>
      <h3 className="gw-t-h3">Where you stand</h3>
      <p className="gw-you-quiet">About your work in {s.checkIn.label}.</p>
      <p>{s.facts}</p>
      {s.whatWouldChangeIt && <p><b>What would change this:</b> {s.whatWouldChangeIt}</p>}

      {s.decision ? (
        <div style={quote}>
          <div style={{ fontWeight: 700 }}>{lead}’s decision</div>
          <p style={{ margin: '2px 0 8px' }}>{s.decision.says}</p>
          <div style={{ fontWeight: 700 }}>{lead}’s reasons</div>
          <p style={{ margin: '2px 0 0' }}>{s.decision.reasons}</p>
        </div>
      ) : (
        <p className="gw-you-quiet">{lead} has not decided anything yet. You will see the decision and the reasons here.</p>
      )}

      {s.yourSide && <Said who="Your side">{s.yourSide}</Said>}
      {s.yourAppeal && !s.appealDecision && <p><b>You appealed.</b> An admin decides. You will see the answer here.</p>}
      {s.appealDecision && <TheAppealOutcome d={s.appealDecision} yours />}

      {writing === 'none' && (
        <div style={row}>
          <Button kind="secondary" size="small" onClick={() => { setWriting('side'); setText(s.yourSide ?? '') }}>
            {s.yourSide ? 'Change my side' : 'Add my side'}
          </Button>
          {s.mayAppeal && <Button kind="quiet" size="small" onClick={() => { setWriting('appeal'); setText('') }}>Appeal this decision</Button>}
        </div>
      )}

      {writing !== 'none' && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) (writing === 'side' ? side : appeal).mutate(text.trim()) }}
          style={{ marginTop: 10 }}
        >
          {writing === 'appeal' && (
            <p style={{ margin: '0 0 6px' }}>An admin looks at the decision, the facts and your reasons, and decides. {lead} sees that you appealed.</p>
          )}
          {writing === 'side' && <p style={{ margin: '0 0 6px' }}>{lead} sees this next to the facts.</p>}
          <label style={{ display: 'block' }}>
            <span style={sub}>{writing === 'side' ? 'Your side' : 'Why do you disagree?'}</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={4000} style={field} />
          </label>
          <div style={row}>
            <Button type="submit" size="small" disabled={!text.trim() || busy}>
              {busy ? 'Saving…' : writing === 'side' ? 'Save' : 'Send my appeal'}
            </Button>
            <Button kind="quiet" size="small" onClick={() => { setWriting('none'); setText('') }}>Not yet</Button>
          </div>
          {failed && <p role="alert" className="gw-you-quiet">{DIDNT_SAVE}</p>}
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
    <div style={{ ...card, border: '1px solid var(--gw-border)', marginTop: 10 }}>
      <h3 style={h3}>{a.aboutName} appealed {a.leadName}’s decision</h3>
      <p style={quiet}>In {a.checkIn.label}.</p>
      <p style={{ margin: '6px 0' }}>{a.headline}</p>
      <Labelled label="Why:">{a.why}</Labelled>
      {a.whatWouldChangeIt && <Labelled label="What would change this:">{a.whatWouldChangeIt}</Labelled>}
      {a.theirOwnAnswer && <Said who={`${a.aboutName}’s own answer.`}>{a.theirOwnAnswer}</Said>}
      {a.decision && (
        <>
          <div style={sub}>{a.leadName}’s decision</div>
          <p style={{ margin: 0 }}>{a.decision.says}</p>
          <div style={sub}>{a.leadName}’s reasons</div>
          <p style={{ margin: 0 }}>{a.decision.reasons}</p>
        </>
      )}
      {a.theirSide && <Said who={`${a.aboutName}’s side`}>{a.theirSide}</Said>}
      <Said who={`${a.aboutName}’s appeal`}>{a.appeal.says}</Said>

      {!a.mayDecide && <p style={quiet}>You made this decision, so another admin decides the appeal.</p>}
      {a.mayDecide && !outcome && (
        <div style={row}>
          <Button kind="secondary" size="small" onClick={() => setOutcome('stands')}>Keep the decision</Button>
          <Button kind="quiet" size="small" onClick={() => setOutcome('changed')}>Change the decision</Button>
        </div>
      )}
      {a.mayDecide && outcome && (
        <form onSubmit={(e) => { e.preventDefault(); if (reasons.trim()) save.mutate() }} style={{ marginTop: 10 }}>
          <div style={sub}>{outcome === 'stands' ? 'Keep the decision' : 'Change the decision'}</div>
          <p style={{ margin: '0 0 6px' }}>{a.aboutName} and {a.leadName} both read your reasons.</p>
          <label style={{ display: 'block' }}>
            <span style={sub}>Your reasons</span>
            <textarea value={reasons} onChange={(e) => setReasons(e.target.value)} rows={3} maxLength={2000} style={field} />
          </label>
          <div style={row}>
            <Button type="submit" size="small" disabled={!reasons.trim() || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</Button>
            <Button kind="quiet" size="small" onClick={() => { setOutcome(null); setReasons('') }}>Not yet</Button>
          </div>
          {failed && <p role="alert" style={quiet}>{DIDNT_SAVE}</p>}
        </form>
      )}
    </div>
  )
}
